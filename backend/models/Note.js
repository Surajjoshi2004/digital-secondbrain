const mongoose = require("mongoose");

const relatedNoteSchema = new mongoose.Schema(
  {
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    sharedKeywords: {
      type: [String],
      default: [],
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator(tags) {
          return tags.length <= 20 && tags.every((tag) => tag.length <= 50);
        },
        message: "A note can have at most 20 tags, each 50 characters or fewer.",
      },
    },
    keywords: {
      type: [String],
      default: [],
      select: false,
    },
    manualLinks: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Note",
        },
      ],
      default: [],
      select: false,
    },
    relatedNotes: {
      type: [relatedNoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.model("Note", noteSchema);
