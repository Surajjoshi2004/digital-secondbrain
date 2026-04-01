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
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
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
