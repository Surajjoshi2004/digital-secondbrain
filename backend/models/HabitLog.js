const mongoose = require("mongoose");

const habitLogSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    gymCompleted: {
      type: Boolean,
      default: false,
    },
    studyHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
    },
    sleepHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    mood: {
      type: String,
      enum: ["energized", "focused", "calm", "mixed", "stressed", "low"],
      default: "mixed",
    },
    moodScore: {
      type: Number,
      min: -2,
      max: 2,
      default: 0,
    },
    moodSource: {
      type: String,
      enum: ["manual", "gemini", "heuristic"],
      default: "heuristic",
    },
    moodConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.2,
    },
    moodSummary: {
      type: String,
      trim: true,
      default: "",
      maxlength: 280,
    },
    moodIndicators: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

habitLogSchema.index({ owner: 1, date: 1 }, { unique: true });
habitLogSchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model("HabitLog", habitLogSchema);
