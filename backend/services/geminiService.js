const { GoogleGenAI } = require("@google/genai");

const ApiError = require("../utils/ApiError");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_FEATURES_ENABLED = process.env.ENABLE_GEMINI_FEATURES === "true";

const isGeminiEnabled = () => GEMINI_FEATURES_ENABLED;

const ensureGeminiConfigured = () => {
  if (!GEMINI_FEATURES_ENABLED) {
    throw new ApiError(
      503,
      "AI features are disabled in this build.",
      [
        "This app is currently running in manual mode.",
        "Set ENABLE_GEMINI_FEATURES=true only if you want to re-enable Gemini.",
      ]
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(503, "Gemini AI is not configured. Add GEMINI_API_KEY.");
  }
};

const createClient = () => {
  ensureGeminiConfigured();
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

const parseRetryDelaySeconds = (message = "") => {
  const retryMatch = message.match(/retry in\s+([\d.]+)s/i);

  if (!retryMatch) {
    return null;
  }

  return Math.ceil(Number(retryMatch[1]));
};

const normalizeGeminiError = (error) => {
  const statusCode = Number(error?.status) || Number(error?.error?.code) || 502;
  const rawMessage =
    error?.error?.message ||
    error?.message ||
    "Gemini AI is temporarily unavailable.";
  const retryAfterSeconds = parseRetryDelaySeconds(rawMessage);

  if (statusCode === 429) {
    const retryMessage = retryAfterSeconds
      ? `Please wait about ${retryAfterSeconds} seconds and try again.`
      : "Please wait a moment and try again.";

    return new ApiError(
      429,
      "Gemini AI request limit reached for now.",
      [
        "Your current Gemini quota has been exhausted.",
        retryMessage,
        "You can also check Gemini API usage and billing in your Google AI dashboard.",
      ]
    );
  }

  if (statusCode === 401 || statusCode === 403) {
    return new ApiError(
      503,
      "Gemini AI could not be authorized.",
      [
        "Please verify the Gemini API key and project setup.",
      ]
    );
  }

  return new ApiError(
    502,
    "Gemini AI could not complete the request.",
    [rawMessage]
  );
};

const generateStructuredContent = async ({
  prompt,
  contents,
  schema,
  model = DEFAULT_MODEL,
}) => {
  const ai = createClient();
  let response;

  try {
    response = await ai.models.generateContent({
      model,
      contents: contents || prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error);
  }

  try {
    return JSON.parse(response.text);
  } catch (_error) {
    throw new ApiError(502, "Gemini returned an invalid JSON response.");
  }
};

const buildNoteContext = (notes) =>
  notes
    .slice(0, 30)
    .map((note) => ({
      id: note._id.toString(),
      title: note.title,
      tags: note.tags || [],
      contentPreview: note.content.slice(0, 280),
      updatedAt: note.updatedAt,
    }));

const suggestContentForDraft = async ({ title, content, tags = [] }) => {
  const schema = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "A short one sentence understanding of the draft note.",
      },
      suggestions: {
        type: "array",
        description: "Concrete writing suggestions that help the user continue the note.",
        items: {
          type: "string",
        },
        minItems: 3,
        maxItems: 6,
      },
    },
    required: ["summary", "suggestions"],
  };

  const prompt = `
You are helping a user continue writing a note inside a personal knowledge engine.
Read the draft and return practical suggestions for what the user could add next.
The suggestions should deepen the note, not just repeat it.
Focus on useful next content such as:
- missing explanations
- examples
- comparisons
- clarifying questions
- related concepts worth mentioning

Return short, actionable suggestions. Each suggestion should be a full sentence fragment or short sentence.

Draft title: ${title || "Untitled"}
Draft content:
${content}

Existing tags from user:
${tags.join(", ") || "none"}
`;

  const result = await generateStructuredContent({ prompt, schema });

  return {
    summary: result.summary,
    suggestions: (result.suggestions || []).map((item) => item.trim()).filter(Boolean),
  };
};

const recommendRelatedNotes = async ({ draft, existingNotes }) => {
  const schema = {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            noteId: { type: "string" },
            reason: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["noteId", "reason", "confidence"],
        },
        minItems: 0,
        maxItems: 5,
      },
    },
    required: ["recommendations"],
  };

  const contextNotes = buildNoteContext(existingNotes);
  const prompt = `
You are matching a draft note to a user's private knowledge base.
Return the best related existing notes by semantic meaning, conceptual overlap, or useful cognitive connection.
Only recommend noteIds from the provided note inventory.

Draft title: ${draft.title || "Untitled"}
Draft tags: ${(draft.tags || []).join(", ") || "none"}
Draft content:
${draft.content}

Available notes:
${JSON.stringify(contextNotes, null, 2)}
`;

  const result = await generateStructuredContent({ prompt, schema });
  const validNoteIds = new Set(existingNotes.map((note) => note._id.toString()));

  return (result.recommendations || []).filter((item) => validNoteIds.has(item.noteId));
};

const surfaceForgottenIdeas = async ({ existingNotes }) => {
  const schema = {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            noteId: { type: "string" },
            reason: { type: "string" },
            revisitPrompt: { type: "string" },
          },
          required: ["noteId", "reason", "revisitPrompt"],
        },
        minItems: 0,
        maxItems: 5,
      },
    },
    required: ["ideas"],
  };

  const candidateNotes = [...existingNotes]
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
    .slice(0, 20);

  const prompt = `
You are helping a user rediscover valuable but neglected ideas in their note graph.
Pick notes that seem worth revisiting because they may connect to broader themes, were not updated recently, or could unlock new thinking.
Only use noteIds from the provided note inventory.

Candidate notes:
${JSON.stringify(buildNoteContext(candidateNotes), null, 2)}
`;

  const result = await generateStructuredContent({ prompt, schema });
  const validNoteIds = new Set(candidateNotes.map((note) => note._id.toString()));

  return (result.ideas || []).filter((item) => validNoteIds.has(item.noteId));
};

module.exports = {
  generateStructuredContent,
  isGeminiEnabled,
  recommendRelatedNotes,
  suggestContentForDraft,
  surfaceForgottenIdeas,
};
