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

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureValidNoteId = (id) => {
  if (!validateObjectId(id)) {
    throw new ApiError(400, "Invalid note id.");
  }
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
};

const normalizeNoteInput = (note, index = 0) => {
  if (!note || typeof note !== "object" || Array.isArray(note)) {
    throw new ApiError(400, `Invalid note payload at position ${index + 1}.`);
  }

  const title = typeof note.title === "string" ? note.title.trim() : "";
  const content = typeof note.content === "string" ? note.content.trim() : "";
  const tags = normalizeTags(note.tags);

  if (!title) {
    throw new ApiError(400, `Title is required for note ${index + 1}.`);
  }

  if (!content) {
    throw new ApiError(400, `Content is required for note ${index + 1}.`);
  }

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

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
      { tags: { $elemMatch: { $regex: search, $options: "i" } } },
    ];
  }

  if (tag) {
    query.tags = { $elemMatch: { $regex: `^${tag}$`, $options: "i" } };
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

  const { title, content, tags } = req.body;
  const note = await Note.findOne({ _id: id, owner: req.user._id }).select(
    "+keywords"
  );

  if (!note) {
    throw new ApiError(404, "Note not found.");
  }

  note.title = title ?? note.title;
  note.content = content ?? note.content;
  note.tags = tags ? normalizeTags(tags) : note.tags;
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
