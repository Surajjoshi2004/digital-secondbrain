const Note = require("../models/Note");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  isGeminiEnabled,
  recommendRelatedNotes,
  suggestContentForDraft,
  surfaceForgottenIdeas,
} = require("../services/geminiService");

const MAX_AI_CONTENT_LENGTH = 12000;
const MAX_AI_TAGS = 20;
const MAX_AI_TITLE_LENGTH = 200;
const MAX_AI_TAG_LENGTH = 50;

const normalizeDraftPayload = (body = {}) => {
  const title = body.title === undefined ? "" : body.title;
  const content = body.content === undefined ? "" : body.content;
  const tags = body.tags === undefined ? [] : body.tags;

  if (typeof title !== "string" || typeof content !== "string") {
    throw new ApiError(400, "title and content must be strings.");
  }

  if (title.length > MAX_AI_TITLE_LENGTH || content.length > MAX_AI_CONTENT_LENGTH) {
    throw new ApiError(400, "Draft content is too long.");
  }

  if (!Array.isArray(tags)) {
    throw new ApiError(400, "tags must be an array.");
  }

  if (tags.length > MAX_AI_TAGS) {
    throw new ApiError(400, `A draft can have at most ${MAX_AI_TAGS} tags.`);
  }

  return {
    title: title.trim(),
    content: content.trim(),
    tags: tags.map((tag) => {
      if (typeof tag !== "string") {
        throw new ApiError(400, "Each tag must be a string.");
      }

      const normalized = tag.trim();
      if (normalized.length > MAX_AI_TAG_LENGTH) {
        throw new ApiError(400, `Tags must be ${MAX_AI_TAG_LENGTH} characters or fewer.`);
      }

      return normalized;
    }).filter(Boolean),
  };
};

const suggestContent = asyncHandler(async (req, res) => {
  if (!isGeminiEnabled()) {
    return res.status(200).json({
      summary: "AI writing help is turned off.",
      suggestions: [],
      message: "AI features are disabled in this build.",
      details: [
        {
          message: "This project is currently using manual note-writing mode.",
        },
      ],
    });
  }

  const { title, content, tags } = normalizeDraftPayload(req.body);

  if (!content && !title) {
    throw new ApiError(
      400,
      "Provide at least a title or content for AI writing suggestions."
    );
  }

  const result = await suggestContentForDraft({
    title,
    content,
    tags,
  });

  res.status(200).json(result);
});

const suggestRelatedNotes = asyncHandler(async (req, res) => {
  if (!isGeminiEnabled()) {
    return res.status(200).json({
      recommendations: [],
      message: "AI features are disabled in this build.",
      details: [
        {
          message: "Related-note suggestions are currently manual only.",
        },
      ],
    });
  }

  const { title, content, tags } = normalizeDraftPayload(req.body);

  if (!content && !title) {
    throw new ApiError(400, "Provide at least a title or content for recommendations.");
  }

  const existingNotes = await Note.find({ owner: req.user._id })
    .populate("relatedNotes.note", "title tags updatedAt")
    .sort({ updatedAt: -1 });

  const recommendations = await recommendRelatedNotes({
    draft: { title, content, tags },
    existingNotes,
  });

  const notesById = new Map(existingNotes.map((note) => [note._id.toString(), note]));
  const enriched = recommendations.map((item) => ({
    ...item,
    note: notesById.get(item.noteId),
  }));

  res.status(200).json({
    recommendations: enriched,
  });
});

const getForgottenIdeas = asyncHandler(async (req, res) => {
  if (!isGeminiEnabled()) {
    return res.status(200).json({
      ideas: [],
      message: "AI features are disabled in this build.",
      details: [
        {
          message: "Forgotten-idea suggestions are turned off in manual mode.",
        },
      ],
    });
  }

  const existingNotes = await Note.find({ owner: req.user._id })
    .populate("relatedNotes.note", "title tags updatedAt")
    .sort({ updatedAt: -1 });

  if (!existingNotes.length) {
    return res.status(200).json({
      ideas: [],
    });
  }

  let ideas = [];

  try {
    ideas = await surfaceForgottenIdeas({
      existingNotes,
    });
  } catch (error) {
    if (error.statusCode === 429 || error.statusCode === 503 || error.statusCode === 502) {
      return res.status(200).json({
        ideas: [],
        message: error.message,
        details: error.details || [],
      });
    }

    throw error;
  }

  const notesById = new Map(existingNotes.map((note) => [note._id.toString(), note]));
  const enriched = ideas.map((item) => ({
    ...item,
    note: notesById.get(item.noteId),
  }));

  res.status(200).json({
    ideas: enriched,
  });
});

module.exports = {
  getForgottenIdeas,
  suggestContent,
  suggestRelatedNotes,
};
