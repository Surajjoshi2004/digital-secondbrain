const mongoose = require("mongoose");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Note = require("../models/Note");
const {
  buildGraph,
  extractKeywords,
  rebuildAllRelationships,
  removeRelationshipsForNote,
  syncRelationshipsForNote,
} = require("../services/linkService");

const MAX_BATCH_NOTES = 25;
const MAX_CONTENT_LENGTH = 20000;
const MAX_SEARCH_LENGTH = 100;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;
const MAX_TITLE_LENGTH = 200;

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTextField = (
  value,
  fieldName,
  maxLength,
  { required = false, allowEmpty = false } = {}
) => {
  if (value === undefined || value === null) {
    if (required) {
      throw new ApiError(400, `${fieldName} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if ((required || !allowEmpty) && !normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new ApiError(400, `${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
};

const ensureValidNoteId = (id) => {
  if (!validateObjectId(id)) {
    throw new ApiError(400, "Invalid note id.");
  }
};

const normalizeTags = (tags) => {
  if (tags === undefined) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new ApiError(400, "tags must be an array.");
  }

  if (tags.length > MAX_TAGS) {
    throw new ApiError(400, `A note can have at most ${MAX_TAGS} tags.`);
  }

  return [...new Set(
    tags
      .map((tag) => {
        if (typeof tag !== "string") {
          throw new ApiError(400, "Each tag must be a string.");
        }

        const normalized = tag.trim();
        if (normalized.length > MAX_TAG_LENGTH) {
          throw new ApiError(400, `Tags must be ${MAX_TAG_LENGTH} characters or fewer.`);
        }

        return normalized;
      })
      .filter(Boolean)
  )];
};

const normalizeNoteInput = (note, index = 0) => {
  if (!note || typeof note !== "object" || Array.isArray(note)) {
    throw new ApiError(400, `Invalid note payload at position ${index + 1}.`);
  }

  const title = normalizeTextField(note.title, "Title", MAX_TITLE_LENGTH, { required: true });
  const content = normalizeTextField(note.content, "Content", MAX_CONTENT_LENGTH, {
    required: true,
  });
  const tags = normalizeTags(note.tags);

  return {
    title,
    content,
    tags,
    keywords: extractKeywords({ title, content, tags }),
  };
};

const createNote = asyncHandler(async (req, res) => {
  const inputNotes = Array.isArray(req.body.notes) && req.body.notes.length
    ? req.body.notes
    : [req.body];

  if (inputNotes.length > MAX_BATCH_NOTES) {
    throw new ApiError(400, `You can create at most ${MAX_BATCH_NOTES} notes at once.`);
  }

  const notePayloads = inputNotes.map((note, index) => normalizeNoteInput(note, index));

  const createdNotes = await Note.insertMany(
    notePayloads.map((note) => ({
      owner: req.user._id,
      ...note,
    }))
  );

  if (createdNotes.length === 1) {
    await syncRelationshipsForNote(createdNotes[0]._id, req.user._id);

    const populatedNote = await Note.findOne({
      _id: createdNotes[0]._id,
      owner: req.user._id,
    }).populate("relatedNotes.note", "title tags");

    res.status(201).json(populatedNote);
    return;
  }

  await rebuildAllRelationships(req.user._id);

  const populatedNotes = await Note.find({
    _id: { $in: createdNotes.map((note) => note._id) },
    owner: req.user._id,
  })
    .populate("relatedNotes.note", "title tags")
    .sort({ createdAt: -1 });

  res.status(201).json({
    notes: populatedNotes,
    message: `${populatedNotes.length} notes created successfully.`,
  });
});

const getAllNotes = asyncHandler(async (req, res) => {
  const query = { owner: req.user._id };
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : "";

  if (search.length > MAX_SEARCH_LENGTH || tag.length > MAX_TAG_LENGTH) {
    throw new ApiError(400, "Search filters are too long.");
  }

  if (search) {
    const escapedSearch = escapeRegex(search);
    query.$or = [
      { title: { $regex: escapedSearch, $options: "i" } },
      { content: { $regex: escapedSearch, $options: "i" } },
      { tags: { $elemMatch: { $regex: escapedSearch, $options: "i" } } },
    ];
  }

  if (tag) {
    query.tags = { $elemMatch: { $regex: `^${escapeRegex(tag)}$`, $options: "i" } };
  }

  const notes = await Note.find(query)
    .populate("relatedNotes.note", "title tags")
    .sort({ updatedAt: -1 });

  res.status(200).json(notes);
});

const getNoteById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureValidNoteId(id);

  const note = await Note.findOne({ _id: id, owner: req.user._id }).populate(
    "relatedNotes.note",
    "title content tags createdAt updatedAt"
  );

  if (!note) {
    throw new ApiError(404, "Note not found.");
  }

  res.status(200).json(note);
});

const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureValidNoteId(id);

  const note = await Note.findOne({ _id: id, owner: req.user._id }).select(
    "+keywords"
  );

  if (!note) {
    throw new ApiError(404, "Note not found.");
  }

  const title = normalizeTextField(req.body.title, "Title", MAX_TITLE_LENGTH);
  const content = normalizeTextField(req.body.content, "Content", MAX_CONTENT_LENGTH);
  const tags = req.body.tags === undefined ? undefined : normalizeTags(req.body.tags);

  if (title !== undefined) {
    note.title = title;
  }
  if (content !== undefined) {
    note.content = content;
  }
  if (tags !== undefined) {
    note.tags = tags;
  }
  note.keywords = extractKeywords(note);

  await note.save();
  await syncRelationshipsForNote(note._id, req.user._id);

  const updatedNote = await Note.findOne({
    _id: id,
    owner: req.user._id,
  }).populate(
    "relatedNotes.note",
    "title tags"
  );

  res.status(200).json(updatedNote);
});

const createManualLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetNoteId } = req.body;

  ensureValidNoteId(id);
  ensureValidNoteId(targetNoteId);

  if (id === targetNoteId) {
    throw new ApiError(400, "A note cannot be linked to itself.");
  }

  const [sourceNote, targetNote] = await Promise.all([
    Note.findOne({ _id: id, owner: req.user._id }).select("+manualLinks"),
    Note.findOne({ _id: targetNoteId, owner: req.user._id }).select("+manualLinks"),
  ]);

  if (!sourceNote || !targetNote) {
    throw new ApiError(404, "One or more notes could not be found.");
  }

  if (!sourceNote.manualLinks.some((entry) => entry.toString() === targetNoteId)) {
    sourceNote.manualLinks.push(targetNote._id);
  }

  if (!targetNote.manualLinks.some((entry) => entry.toString() === id)) {
    targetNote.manualLinks.push(sourceNote._id);
  }

  await Promise.all([sourceNote.save(), targetNote.save()]);
  await Promise.all([
    syncRelationshipsForNote(sourceNote._id, req.user._id),
    syncRelationshipsForNote(targetNote._id, req.user._id),
  ]);

  const refreshedNote = await Note.findOne({
    _id: sourceNote._id,
    owner: req.user._id,
  }).populate("relatedNotes.note", "title tags");

  res.status(200).json(refreshedNote);
});

const deleteManualLink = asyncHandler(async (req, res) => {
  const { id, targetId } = req.params;

  ensureValidNoteId(id);
  ensureValidNoteId(targetId);

  const [sourceNote, targetNote] = await Promise.all([
    Note.findOne({ _id: id, owner: req.user._id }).select("+manualLinks"),
    Note.findOne({ _id: targetId, owner: req.user._id }).select("+manualLinks"),
  ]);

  if (!sourceNote || !targetNote) {
    throw new ApiError(404, "One or more notes could not be found.");
  }

  sourceNote.manualLinks = sourceNote.manualLinks.filter(
    (entry) => entry.toString() !== targetId
  );
  targetNote.manualLinks = targetNote.manualLinks.filter(
    (entry) => entry.toString() !== id
  );

  await Promise.all([sourceNote.save(), targetNote.save()]);
  await Promise.all([
    syncRelationshipsForNote(sourceNote._id, req.user._id),
    syncRelationshipsForNote(targetNote._id, req.user._id),
  ]);

  const refreshedNote = await Note.findOne({
    _id: sourceNote._id,
    owner: req.user._id,
  }).populate("relatedNotes.note", "title tags");

  res.status(200).json(refreshedNote);
});

const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureValidNoteId(id);

  const note = await Note.findOneAndDelete({ _id: id, owner: req.user._id });

  if (!note) {
    throw new ApiError(404, "Note not found.");
  }

  await removeRelationshipsForNote(id, req.user._id);

  res.status(200).json({ message: "Note deleted successfully." });
});

const getRelatedNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  ensureValidNoteId(id);

  const note = await Note.findOne({ _id: id, owner: req.user._id }).populate(
    "relatedNotes.note",
    "title content tags createdAt updatedAt"
  );

  if (!note) {
    throw new ApiError(404, "Note not found.");
  }

  res.status(200).json(note.relatedNotes);
});

const getKnowledgeGraph = asyncHandler(async (_req, res) => {
  const graph = await buildGraph(_req.user._id);
  res.status(200).json(graph);
});

const rebuildLinks = asyncHandler(async (req, res) => {
  await rebuildAllRelationships(req.user._id);

  res.status(200).json({
    message: "Knowledge links rebuilt successfully.",
  });
});

module.exports = {
  createNote,
  createManualLink,
  deleteManualLink,
  deleteNote,
  getAllNotes,
  getKnowledgeGraph,
  getNoteById,
  getRelatedNotes,
  rebuildLinks,
  updateNote,
};
