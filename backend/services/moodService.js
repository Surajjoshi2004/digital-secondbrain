const { createPartFromBase64 } = require("@google/genai");

const ApiError = require("../utils/ApiError");
const { generateStructuredContent, isGeminiEnabled } = require("./geminiService");

const MOOD_DEFINITIONS = {
  energized: {
    score: 2,
    manualLabel: "Energized",
    summaryLabel: "energized",
    keywords: [
      "energized",
      "excited",
      "motivated",
      "confident",
      "great",
      "amazing",
      "strong",
      "productive",
      "crushed",
      "win",
      "winning",
      "proud",
      "happy",
    ],
  },
  focused: {
    score: 1,
    manualLabel: "Focused",
    summaryLabel: "focused",
    keywords: [
      "focused",
      "clear",
      "locked in",
      "disciplined",
      "steady",
      "progress",
      "flow",
      "consistent",
      "sharp",
      "dialed in",
    ],
  },
  calm: {
    score: 1,
    manualLabel: "Calm",
    summaryLabel: "calm",
    keywords: [
      "calm",
      "peaceful",
      "grateful",
      "balanced",
      "relaxed",
      "rested",
      "content",
      "okay",
      "fine",
      "settled",
    ],
  },
  mixed: {
    score: 0,
    manualLabel: "Mixed",
    summaryLabel: "mixed",
    keywords: [
      "mixed",
      "up and down",
      "unsure",
      "conflicted",
      "uncertain",
      "weird",
      "bittersweet",
      "complicated",
    ],
  },
  stressed: {
    score: -1,
    manualLabel: "Stressed",
    summaryLabel: "stressed",
    keywords: [
      "stressed",
      "overwhelmed",
      "anxious",
      "pressure",
      "worried",
      "burned out",
      "tense",
      "panic",
      "frustrated",
      "chaotic",
    ],
  },
  low: {
    score: -2,
    manualLabel: "Low",
    summaryLabel: "low",
    keywords: [
      "sad",
      "down",
      "low",
      "tired",
      "drained",
      "lonely",
      "empty",
      "numb",
      "hopeless",
      "exhausted",
      "bad",
      "terrible",
    ],
  },
};

const VALID_MOODS = Object.keys(MOOD_DEFINITIONS);

const buildEmptyMoodResult = () => ({
  mood: "mixed",
  score: 0,
  confidence: 0.2,
  summary: "Not enough emotional context was provided, so the mood is marked as mixed.",
  indicators: [],
  source: "heuristic",
});

const getMoodMeta = (mood) => MOOD_DEFINITIONS[mood] || MOOD_DEFINITIONS.mixed;

const normalizeMoodChoice = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "mood must be a string.");
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "auto") {
    return "auto";
  }

  if (!VALID_MOODS.includes(normalized)) {
    throw new ApiError(
      400,
      `mood must be one of: ${[...VALID_MOODS, "auto"].join(", ")}.`
    );
  }

  return normalized;
};

const createMoodRecord = ({ mood, confidence, summary, indicators, source }) => {
  const meta = getMoodMeta(mood);

  return {
    mood,
    score: meta.score,
    confidence: Number((confidence ?? 0.65).toFixed(2)),
    summary: summary?.trim() || `Mood appears ${meta.summaryLabel}.`,
    indicators: Array.isArray(indicators)
      ? indicators.map((item) => item.trim()).filter(Boolean).slice(0, 5)
      : [],
    source,
  };
};

const detectMoodWithHeuristics = (text) => {
  const normalized = text.toLowerCase();
  const scores = VALID_MOODS.reduce((acc, mood) => {
    const keywordHits = MOOD_DEFINITIONS[mood].keywords.reduce(
      (count, keyword) => count + (normalized.includes(keyword) ? 1 : 0),
      0
    );

    return {
      ...acc,
      [mood]: keywordHits,
    };
  }, {});

  const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  const [topMood, topHits] = ranked[0] || ["mixed", 0];
  const secondHits = ranked[1]?.[1] || 0;

  if (!text.trim()) {
    return buildEmptyMoodResult();
  }

  if (topHits === 0) {
    return createMoodRecord({
      mood: "mixed",
      confidence: 0.35,
      summary: "The text did not contain strong mood cues, so the mood is marked as mixed.",
      indicators: [],
      source: "heuristic",
    });
  }

  const indicators = MOOD_DEFINITIONS[topMood].keywords.filter((keyword) =>
    normalized.includes(keyword)
  );

  const confidence = Math.min(0.92, 0.45 + topHits * 0.16 + Math.max(0, topHits - secondHits) * 0.08);

  return createMoodRecord({
    mood: topMood,
    confidence,
    summary: `Detected a ${getMoodMeta(topMood).summaryLabel} tone from the language used in the note.`,
    indicators,
    source: "heuristic",
  });
};

const detectMoodWithGemini = async (text, contextLabel) => {
  const schema = {
    type: "object",
    properties: {
      mood: {
        type: "string",
        enum: VALID_MOODS,
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      summary: {
        type: "string",
      },
      indicators: {
        type: "array",
        items: {
          type: "string",
        },
        minItems: 0,
        maxItems: 5,
      },
    },
    required: ["mood", "confidence", "summary", "indicators"],
  };

  const prompt = `
You are analyzing the emotional tone of a user's private ${contextLabel}.
Classify the mood into exactly one of these labels:
- energized
- focused
- calm
- mixed
- stressed
- low

Choose the closest overall tone, not every fleeting emotion.
Return short JSON only.

Text to analyze:
${text}
`;

  const result = await generateStructuredContent({ prompt, schema });

  return createMoodRecord({
    mood: VALID_MOODS.includes(result.mood) ? result.mood : "mixed",
    confidence: result.confidence,
    summary: result.summary,
    indicators: result.indicators,
    source: "gemini",
  });
};

const detectMood = async ({ title = "", content = "", contextLabel = "journal entry" }) => {
  const text = [title, content].filter(Boolean).join("\n\n").trim();

  if (!text) {
    return buildEmptyMoodResult();
  }

  if (!isGeminiEnabled()) {
    return detectMoodWithHeuristics(text);
  }

  try {
    return await detectMoodWithGemini(text, contextLabel);
  } catch (_error) {
    return detectMoodWithHeuristics(text);
  }
};

const createManualMoodRecord = (mood) =>
  createMoodRecord({
    mood,
    confidence: 1,
    summary: `Mood was set manually to ${getMoodMeta(mood).summaryLabel}.`,
    indicators: [],
    source: "manual",
  });

const getMoodOptions = () =>
  VALID_MOODS.map((mood) => ({
    value: mood,
    label: getMoodMeta(mood).manualLabel,
    score: getMoodMeta(mood).score,
  }));

const analyzeFaceMoodFromImage = async ({ imageBase64, mimeType = "image/jpeg" }) => {
  if (!isGeminiEnabled()) {
    throw new ApiError(503, "Face analysis needs Gemini AI to be enabled.");
  }

  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new ApiError(400, "image data is required.");
  }

  const schema = {
    type: "object",
    properties: {
      faceDetected: { type: "boolean" },
      mood: {
        type: "string",
        enum: VALID_MOODS,
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      summary: { type: "string" },
      indicators: {
        type: "array",
        items: { type: "string" },
        minItems: 0,
        maxItems: 5,
      },
      guidance: { type: "string" },
    },
    required: [
      "faceDetected",
      "mood",
      "confidence",
      "summary",
      "indicators",
      "guidance",
    ],
  };

  const contents = [
    {
      text: `Analyze the visible facial expression in this webcam image.
Estimate the user's current mood from facial cues only.
Do not identify the person, guess age, guess gender, or make medical claims.
If no clear human face is visible, set faceDetected to false and explain briefly.
Return compact JSON only.`,
    },
    createPartFromBase64(imageBase64, mimeType),
  ];

  const result = await generateStructuredContent({ contents, schema });

  return {
    faceDetected: Boolean(result.faceDetected),
    ...createMoodRecord({
      mood: VALID_MOODS.includes(result.mood) ? result.mood : "mixed",
      confidence: result.confidence,
      summary: result.summary,
      indicators: result.indicators,
      source: "gemini",
    }),
    guidance: typeof result.guidance === "string" ? result.guidance.trim() : "",
  };
};

module.exports = {
  analyzeFaceMoodFromImage,
  createManualMoodRecord,
  detectMood,
  getMoodMeta,
  getMoodOptions,
  normalizeMoodChoice,
  VALID_MOODS,
};
