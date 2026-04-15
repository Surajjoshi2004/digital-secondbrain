import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import AuthPanel from "./components/AuthPanel";
import BrainCoreDisplay from "./components/BrainCoreDisplay";
import BrainGraph from "./components/BrainGraph";
import ByteMascot from "./components/ByteMascot";
import FaceMoodPanel from "./components/FaceMoodPanel";
import HabitPanel from "./components/HabitPanel";
import NoteForm from "./components/NoteForm";
import NotePanel from "./components/NotePanel";

const getDefaultApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "http://localhost:5000/api";
  }

  if (typeof window !== "undefined") {
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

    if (localHosts.has(window.location.hostname)) {
      return "http://localhost:5000/api";
    }
  }

  return "";
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl();
const API_CONFIGURATION_MESSAGE =
  "Set VITE_API_BASE_URL to your backend URL ending in /api.";
const AI_FEATURES_ENABLED = import.meta.env.VITE_ENABLE_GEMINI_FEATURES === "true";
const getTodayDate = () => new Date().toISOString().slice(0, 10);

const parseTags = (rawTags = "") =>
  rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const createEmptyDraft = () => ({
  title: "",
  content: "",
  tags: "",
});

const buildVoiceNoteTitle = (transcript) => {
  const cleaned = transcript.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 6);

  return words.length ? words.join(" ").replace(/[.!?,;:]+$/g, "") : "Voice Note";
};

const isDraftEmpty = (draft) =>
  !draft.title.trim() && !draft.content.trim() && !draft.tags.trim();

const splitImportedNotes = (rawText) =>
  rawText
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        return null;
      }

      const titleLine = lines.find((line) => /^title:/i.test(line));
      const tagsLine = lines.find((line) => /^tags:/i.test(line));
      const bodyLines = lines.filter(
        (line) => !/^title:/i.test(line) && !/^tags:/i.test(line)
      );
      const title = titleLine
        ? titleLine.replace(/^title:/i, "").trim()
        : lines[0].slice(0, 80);
      const content = bodyLines.join("\n").trim() || chunk;
      const tags = tagsLine ? tagsLine.replace(/^tags:/i, "").trim() : "";

      if (!title || !content) {
        return null;
      }

      return { title, content, tags };
    })
    .filter(Boolean);

const extractErrorPayload = (error, fallbackMessage) => {
  if (error?.code === "API_BASE_URL_MISSING") {
    return {
      message: "Backend API is not configured for this frontend build.",
      messages: [API_CONFIGURATION_MESSAGE],
    };
  }

  const responseData = error.response?.data;
  const statusCode = error.response?.status;
  const detailMessages = Array.isArray(responseData?.details)
    ? responseData.details
        .map((detail) => detail?.message)
        .filter(Boolean)
    : [];
  let message = responseData?.message || fallbackMessage;
  let messages = [...new Set(detailMessages.filter((detail) => detail !== message))];

  if (!responseData && error.message) {
    message = "Could not reach the backend API.";
    messages = [
      error.message,
      API_BASE_URL
        ? `API target: ${API_BASE_URL}`
        : API_CONFIGURATION_MESSAGE,
    ];
  }

  if (
    statusCode === 404 &&
    typeof message === "string" &&
    message.startsWith("Route ") &&
    message.includes("/api/notes/") &&
    message.includes("/links")
  ) {
    message = "Manual linking is not available on the running backend yet.";
    messages = [
      message,
      "Please restart the backend server so it loads the latest note routes.",
    ];
  }

  if (
    statusCode === 404 &&
    typeof message === "string" &&
    message.startsWith("Route ") &&
    message.includes("/api/notes/rebuild-links")
  ) {
    message = "Link rebuilding is not available on the running backend yet.";
    messages = [
      message,
      "Please restart the backend server so it loads the latest note routes.",
    ];
  }

  return {
    message,
    messages,
  };
};

const formatCommandClock = (value) =>
  value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const clampPercent = (value) => Math.max(0, Math.min(100, value));

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authChecking, setAuthChecking] = useState(true);
  const [authStatus, setAuthStatus] = useState("Secure channel booting...");
  const [authMessages, setAuthMessages] = useState([]);
  const [authError, setAuthError] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [notes, setNotes] = useState([]);
  const [habitDashboard, setHabitDashboard] = useState(null);
  const [habitLoading, setHabitLoading] = useState(false);
  const [habitError, setHabitError] = useState(false);
  const [habitStatus, setHabitStatus] = useState("");
  const [habitForm, setHabitForm] = useState({
    gymCompleted: false,
    studyHours: "0",
    sleepHours: "0",
    mood: "auto",
    note: "",
  });
  const [contentSuggestions, setContentSuggestions] = useState([]);
  const [draftRecommendations, setDraftRecommendations] = useState([]);
  const [forgottenIdeas, setForgottenIdeas] = useState([]);
  const [faceAnalysis, setFaceAnalysis] = useState(null);
  const [faceAnalysisLoading, setFaceAnalysisLoading] = useState(false);
  const [faceAnalysisStatus, setFaceAnalysisStatus] = useState("");
  const [faceAnalysisError, setFaceAnalysisError] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [pulseOriginId, setPulseOriginId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Booting neural map...");
  const [statusMessages, setStatusMessages] = useState([]);
  const [statusError, setStatusError] = useState(false);
  const [form, setForm] = useState([createEmptyDraft()]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [currentView, setCurrentView] = useState("dashboard");
  const [dashboardClock, setDashboardClock] = useState(() => new Date());

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
      }),
    []
  );

  const ensureApiConfigured = () => {
    if (API_BASE_URL) {
      return;
    }

    const configurationError = new Error(API_CONFIGURATION_MESSAGE);
    configurationError.code = "API_BASE_URL_MISSING";
    throw configurationError;
  };

  const loadCurrentUser = async () => {
    if (!API_BASE_URL) {
      setUser(null);
      setNotes([]);
      setHabitDashboard(null);
      setSelectedNoteId(null);
      setAuthError(true);
      setAuthStatus("Backend API is not configured for this frontend build.");
      setAuthMessages([API_CONFIGURATION_MESSAGE]);
      setAuthChecking(false);
      return null;
    }

    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
      setAuthError(false);
      setAuthStatus("Authenticated. Your private neural space is ready.");
      setAuthMessages([]);
      return response.data.user;
    } catch (_error) {
      setUser(null);
      setNotes([]);
      setHabitDashboard(null);
      setSelectedNoteId(null);
      setAuthError(false);
      setAuthStatus("Sign in to access your private knowledge graph.");
      setAuthMessages([]);
      return null;
    } finally {
      setAuthChecking(false);
    }
  };

  const loadNotes = async () => {
    if (!user) {
      return [];
    }

    ensureApiConfigured();
    setStatusMessage("Scanning stored thoughts...");
    setStatusError(false);
    setStatusMessages([]);

    try {
      const response = await api.get("/notes");
      const nextNotes = response.data;
      setNotes(nextNotes);
      setSelectedNoteId((currentSelected) =>
        nextNotes.some((note) => note._id === currentSelected)
          ? currentSelected
          : nextNotes[0]?._id || null
      );
      setStatusMessage(`Mapped ${nextNotes.length} neurons into the graph.`);
      return nextNotes;
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Unable to connect to the knowledge engine."
      );
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
      return [];
    }
  };

  const loadForgottenIdeas = async () => {
    if (!user) {
      return;
    }

    ensureApiConfigured();

    if (!AI_FEATURES_ENABLED) {
      setForgottenIdeas([]);
      return;
    }

    try {
      const response = await api.get("/ai/forgotten-ideas");
      setForgottenIdeas(response.data.ideas || []);
    } catch (_error) {
      setForgottenIdeas([]);
    }
  };

  const loadHabitDashboard = async () => {
    if (!user) {
      return null;
    }

    ensureApiConfigured();
    setHabitLoading(true);
    setHabitError(false);
    setHabitStatus("");

    try {
      const response = await api.get("/habits/dashboard");
      const dashboard = response.data;
      const today = dashboard?.today;

      setHabitDashboard(dashboard);
      if (today) {
        setHabitForm({
          gymCompleted: Boolean(today.gymCompleted),
          studyHours: String(today.studyHours ?? 0),
          sleepHours: String(today.sleepHours ?? 0),
          mood: today.moodSource === "manual" ? today.mood || "mixed" : "auto",
          note: today.note || "",
        });
      }

      return dashboard;
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Could not load habit dashboard yet."
      );
      setHabitError(true);
      setHabitStatus(errorPayload.message);
      return null;
    } finally {
      setHabitLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotes();
      loadForgottenIdeas();
      loadHabitDashboard();
    }
  }, [user]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setDashboardClock(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const selectedNote = notes.find((note) => note._id === selectedNoteId) || null;
  const recentNotes = useMemo(() => notes.slice(0, 6), [notes]);

  const availableTags = useMemo(
    () =>
      [...new Set(notes.flatMap((note) => note.tags || []))]
        .sort((left, right) => left.localeCompare(right)),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedTag = activeTag.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesTag = normalizedTag
        ? (note.tags || []).some((tag) => tag.toLowerCase() === normalizedTag)
        : true;
      const matchesQuery = normalizedQuery
        ? [note.title, note.content, ...(note.tags || [])]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      return matchesTag && matchesQuery;
    });
  }, [activeTag, notes, searchQuery]);

  const totalConnections = useMemo(
    () =>
      notes.reduce(
        (count, note) =>
          count + (note.relatedNotes || []).filter((entry) => entry.note?._id).length,
        0
      ),
    [notes]
  );

  const manualConnections = useMemo(
    () =>
      notes.reduce(
        (count, note) => count + (note.relatedNotes || []).filter((entry) => entry.isManual).length,
        0
      ),
    [notes]
  );

  const noteDensity = notes.length ? totalConnections / notes.length : 0;
  const activeTagCount = availableTags.length;
  const taggedNotesCount = notes.filter((note) => (note.tags || []).length).length;
  const connectedNotesCount = notes.filter(
    (note) => (note.relatedNotes || []).filter((entry) => entry.note?._id).length
  ).length;
  const connectionCoverage = notes.length
    ? Math.round((connectedNotesCount / notes.length) * 100)
    : 0;
  const habitToday = habitDashboard?.today;
  const studyHoursToday = Number(habitToday?.studyHours || 0);
  const sleepHoursToday = Number(habitToday?.sleepHours || 0);
  const cognitiveLoad = clampPercent(
    62 +
      filteredNotes.length * 4 +
      activeTagCount * 2 +
      (habitToday?.gymCompleted ? 4 : 0) +
      studyHoursToday * 1.5
  );
  const recallReserve = clampPercent(45 + taggedNotesCount * 5 + sleepHoursToday * 4);
  const syncLatency = Math.max(8, 42 - Math.min(notes.length, 20) - manualConnections * 2);
  const focusScore = clampPercent(
    48 + studyHoursToday * 7 + (habitToday?.mood === "focused" ? 14 : 0)
  );
  const creativeScore = clampPercent(
    54 + activeTagCount * 5 + (habitToday?.mood === "energized" ? 12 : 0)
  );
  const consistencyScore = clampPercent(
    36 +
      Number(habitDashboard?.streaks?.gym || 0) * 6 +
      Number(habitDashboard?.streaks?.study || 0) * 4 +
      Number(habitDashboard?.streaks?.sleep || 0) * 5
  );
  const recentNodeRows = notes.slice(0, 4).map((note, index) => ({
    id: note._id,
    name: note.title,
    address: `node://${(note.tags?.[0] || "untagged").toLowerCase()}.${String(index + 1).padStart(2, "0")}`,
    load: clampPercent(
      38 + (note.relatedNotes || []).filter((entry) => entry.note?._id).length * 12
    ),
    tone:
      index % 4 === 0
        ? "cyan"
        : index % 4 === 1
        ? "violet"
        : index % 4 === 2
        ? "green"
        : "amber",
  }));
  const commandLogEntries = [
    {
      time: "LIVE",
      tag: statusError ? "[ERR]" : "[SYS]",
      tone: statusError ? "critical" : "ok",
      message: statusMessage,
    },
    {
      time: "MAP",
      tag: "[NOT]",
      tone: "default",
      message: `${notes.length} notes indexed across ${activeTagCount || 1} active clusters.`,
    },
    {
      time: "LNK",
      tag: "[SYN]",
      tone: "default",
      message: `${Math.round(totalConnections / 2)} bidirectional synapses detected.`,
    },
    {
      time: "HBT",
      tag: "[DAY]",
      tone: habitError ? "warn" : "ok",
      message: habitError
        ? habitStatus || "Habit telemetry unavailable."
        : `Mood ${habitToday?.mood || "mixed"} · Study ${studyHoursToday}h · Sleep ${sleepHoursToday}h.`,
    },
  ];

  const handleChange = (event) => {
    const { name, value, dataset } = event.target;
    const index = Number(dataset.index || 0);

    setForm((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index
          ? {
              ...draft,
              [name]: value,
            }
          : draft
      )
    );
  };

  const handleAddDraft = () => {
    setForm((current) => [...current, createEmptyDraft()]);
  };

  const handleRemoveDraft = (indexToRemove) => {
    setForm((current) =>
      current.length === 1
        ? current
        : current.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleImportDrafts = (rawText) => {
    const importedDrafts = splitImportedNotes(rawText);

    if (!importedDrafts.length) {
      setStatusError(true);
      setStatusMessage("Could not split that paste into valid notes yet.");
      setStatusMessages([
        "Separate notes with blank lines.",
        "Optionally start sections with `Title:` and `Tags:`.",
      ]);
      return;
    }

    setForm((current) => {
      const usableCurrent = current.every(isDraftEmpty) ? [] : current;
      return [...usableCurrent, ...importedDrafts];
    });
    setContentSuggestions([]);
    setDraftRecommendations([]);
    setStatusError(false);
    setStatusMessage(`${importedDrafts.length} draft notes prepared from your paste.`);
    setStatusMessages([]);
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError(false);
    setAuthMessages([]);
    setAuthStatus(
      authMode === "register"
        ? "Creating secure identity..."
        : "Authenticating secure session..."
    );

    try {
      ensureApiConfigured();
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        authMode === "register"
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const response = await api.post(endpoint, payload);
      setUser(response.data.user);
      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
      setAuthStatus(
        authMode === "register"
          ? "Account created. Neural space unlocked."
          : "Welcome back. Neural session restored."
      );
      setAuthMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Authentication failed. Please try again."
      );
      setAuthError(true);
      setAuthStatus(errorPayload.message);
      setAuthMessages(errorPayload.messages);
    }
  };

  const handleLogout = async () => {
    try {
      ensureApiConfigured();
      await api.post("/auth/logout");
    } catch (_error) {
      // Clear local session state even if the cookie is already gone.
    }

    setUser(null);
    setNotes([]);
    setHabitDashboard(null);
    setSelectedNoteId(null);
    setHoveredNodeId(null);
    setPulseOriginId(null);
    setAuthMode("login");
    setAuthError(false);
    setAuthStatus("Session closed. Sign in to continue.");
    setAuthMessages([]);
  };

  const handleHabitFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setHabitForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleHabitSubmit = async (event) => {
    event.preventDefault();

    setHabitError(false);
    setHabitStatus("Saving today habit log...");

    try {
      ensureApiConfigured();
      await api.post("/habits/log", {
        date: getTodayDate(),
        gymCompleted: Boolean(habitForm.gymCompleted),
        studyHours: Number(habitForm.studyHours || 0),
        sleepHours: Number(habitForm.sleepHours || 0),
        mood: habitForm.mood,
        note: habitForm.note.trim(),
      });
      await loadHabitDashboard();
      setHabitStatus("Habit log updated for today.");
    } catch (error) {
      const errorPayload = extractErrorPayload(error, "Failed to save habit log.");
      setHabitError(true);
      setHabitStatus(errorPayload.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const notePayloads = form.map((draft) => ({
      title: draft.title.trim(),
      content: draft.content.trim(),
      tags: parseTags(draft.tags),
    }));
    const isBatchCreate = notePayloads.length > 1;

    setStatusMessage(
      isBatchCreate
        ? "Injecting multiple thoughts into the brain..."
        : "Injecting a new thought into the brain..."
    );
    setStatusError(false);
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      const response = await api.post(
        "/notes",
        isBatchCreate ? { notes: notePayloads } : notePayloads[0]
      );

      const createdNotes = Array.isArray(response.data?.notes)
        ? response.data.notes
        : [response.data];

      setForm([createEmptyDraft()]);
      setSearchQuery("");
      setActiveTag("");

      await loadNotes();
      await loadForgottenIdeas();
      setContentSuggestions([]);
      setDraftRecommendations([]);
      setSelectedNoteId(createdNotes[0]?._id || null);
      setPulseOriginId(createdNotes[0]?._id || null);
      setStatusMessage(
        isBatchCreate
          ? `${createdNotes.length} new signals propagated through your knowledge graph.`
          : "New signal propagated through your knowledge graph."
      );
      setStatusMessages([]);

      window.setTimeout(() => {
        setPulseOriginId(null);
      }, 2800);
    } catch (error) {
      const errorPayload = extractErrorPayload(error, "Failed to create the new note.");
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleVoiceCapture = async (transcript) => {
    const cleanedTranscript = transcript.replace(/\s+/g, " ").trim();

    if (!cleanedTranscript) {
      setStatusError(true);
      setStatusMessage("No speech was captured.");
      setStatusMessages(["Try again and speak a little closer to the microphone."]);
      return;
    }

    setStatusError(false);
    setStatusMessage("Turning your voice note into a saved thought...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      const response = await api.post("/notes", {
        title: buildVoiceNoteTitle(cleanedTranscript),
        content: cleanedTranscript,
        tags: ["voice-note"],
      });

      const createdNote = response.data;

      await loadNotes();
      setSelectedNoteId(createdNote?._id || null);
      setPulseOriginId(createdNote?._id || null);
      setStatusMessage("Voice note captured and added to your graph.");
      setStatusMessages([]);

      window.setTimeout(() => {
        setPulseOriginId(null);
      }, 2800);
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Failed to save the captured voice note."
      );
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleSuggestContent = async () => {
    if (!AI_FEATURES_ENABLED) {
      setStatusError(false);
      setStatusMessage("AI writing help is disabled in this build.");
      setStatusMessages(["This project is currently using manual note-writing mode."]);
      return;
    }

    const activeDraft = form[0];

    setStatusError(false);
    setStatusMessage("Asking Gemini how to deepen this note...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      const response = await api.post("/ai/suggest-content", {
        title: activeDraft.title.trim(),
        content: activeDraft.content.trim(),
        tags: parseTags(activeDraft.tags),
      });

      setContentSuggestions(response.data.suggestions || []);
      setStatusMessage(
        response.data.summary
          ? `AI summary: ${response.data.summary}`
          : "Gemini generated writing suggestions for this draft."
      );
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Failed to suggest content for the draft."
      );
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleRecommendDraft = async () => {
    if (!AI_FEATURES_ENABLED) {
      setStatusError(false);
      setStatusMessage("AI note recommendations are disabled in this build.");
      setStatusMessages(["Related-note suggestions are currently manual only."]);
      return;
    }

    const activeDraft = form[0];

    setStatusError(false);
    setStatusMessage("Asking Gemini to suggest related notes...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      const response = await api.post("/ai/recommend-related", {
        title: activeDraft.title.trim(),
        content: activeDraft.content.trim(),
        tags: parseTags(activeDraft.tags),
      });

      setDraftRecommendations(response.data.recommendations || []);
      setStatusMessage("AI matched the draft with nearby thoughts in your graph.");
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Failed to generate draft recommendations."
      );
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleUpdateNote = async (noteId, draft) => {
    setStatusError(false);
    setStatusMessage("Rewriting a stored thought...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      await api.put(`/notes/${noteId}`, {
        title: draft.title.trim(),
        content: draft.content.trim(),
        tags: parseTags(draft.tags),
      });
      await loadNotes();
      await loadForgottenIdeas();
      setSelectedNoteId(noteId);
      setStatusMessage("That note has been updated and re-linked.");
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(error, "Failed to update that note.");
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
      throw error;
    }
  };

  const handleDeleteNote = async (noteId) => {
    setStatusError(false);
    setStatusMessage("Pruning a thought from the graph...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      await api.delete(`/notes/${noteId}`);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
      await loadNotes();
      await loadForgottenIdeas();
      setStatusMessage("The note was deleted and the graph closed the gap.");
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(error, "Failed to delete that note.");
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleCreateManualLink = async (noteId, targetNoteId) => {
    setStatusError(false);
    setStatusMessage("Locking in a deliberate connection...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      await api.post(`/notes/${noteId}/links`, { targetNoteId });
      await loadNotes();
      setSelectedNoteId(noteId);
      setStatusMessage("Manual link added. That connection will now stay anchored.");
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(error, "Failed to add that link.");
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleDeleteManualLink = async (noteId, targetNoteId) => {
    setStatusError(false);
    setStatusMessage("Releasing a pinned connection...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      await api.delete(`/notes/${noteId}/links/${targetNoteId}`);
      await loadNotes();
      setSelectedNoteId(noteId);
      setStatusMessage("Manual link removed. Automatic links can now decide again.");
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(error, "Failed to remove that link.");
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleRebuildLinks = async () => {
    setStatusError(false);
    setStatusMessage("Rebuilding note connections...");
    setStatusMessages([]);

    try {
      ensureApiConfigured();
      await api.post("/notes/rebuild-links");
      await loadNotes();
      setStatusMessage("Connections rebuilt from your current notes.");
      setStatusMessages([]);
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Failed to rebuild note connections."
      );
      setStatusError(true);
      setStatusMessage(errorPayload.message);
      setStatusMessages(errorPayload.messages);
    }
  };

  const handleAnalyzeFaceSnapshot = async (imageData) => {
    if (!AI_FEATURES_ENABLED) {
      setFaceAnalysisError(false);
      setFaceAnalysisStatus("Face analysis is disabled in this build.");
      return;
    }

    if (!imageData) {
      setFaceAnalysisError(true);
      setFaceAnalysisStatus("Capture a webcam frame before running analysis.");
      return;
    }

    setFaceAnalysisLoading(true);
    setFaceAnalysisError(false);
    setFaceAnalysisStatus("Reading facial expression from the captured frame...");

    try {
      ensureApiConfigured();
      const response = await api.post("/ai/analyze-face", { imageData });
      setFaceAnalysis(response.data);
      setFaceAnalysisStatus(
        response.data.faceDetected
          ? "Face analysis complete."
          : "No clear face was detected in the captured frame."
      );
    } catch (error) {
      const errorPayload = extractErrorPayload(
        error,
        "Failed to analyze the captured face."
      );
      setFaceAnalysisError(true);
      setFaceAnalysisStatus(errorPayload.message);
      setFaceAnalysis(null);
    } finally {
      setFaceAnalysisLoading(false);
    }
  };

  const openGraphView = (noteId = null) => {
    if (noteId) {
      setSelectedNoteId(noteId);
    }

    if (!document.fullscreenElement) {
      const fullscreenRequest = document.documentElement?.requestFullscreen?.();
      fullscreenRequest?.catch?.(() => {
        // Some browsers may block fullscreen if the gesture context is lost.
      });
    }

    setCurrentView("graph");
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "notes", label: "Notes" },
    { id: "graph", label: "Graph" },
    { id: "habits", label: "Habits" },
    { id: "face", label: "Face Mood" },
  ];

  if (authChecking) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] px-8 py-6 text-sm uppercase tracking-[0.35em] text-cyan-300/80">
          Initializing neural shield
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.16),transparent_24%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.16),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_45%,#030712_100%)]" />
          <div className="absolute left-[-10%] top-[10%] h-80 w-80 rounded-full bg-cyan-400/12 blur-[120px] floating-aurora" />
          <div className="absolute bottom-[2%] right-[-5%] h-96 w-96 rounded-full bg-fuchsia-500/12 blur-[150px] floating-aurora-delayed" />
        </div>

        <div className="relative">
          <AuthPanel
            mode={authMode}
            authForm={authForm}
            authStatus={authStatus}
            authMessages={authMessages}
            authError={authError}
            onModeChange={setAuthMode}
            onChange={handleAuthChange}
            onSubmit={handleAuthSubmit}
          />
        </div>
      </div>
    );
  }

  const renderDashboardView = () => (
    <main className="grid flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <section className="retro-panel neural-card neural-grid-shell rounded-[2rem] p-5">
        <p className="neural-kicker">Cognitive Metrics</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="neural-metric-card neural-metric-card-cyan">
            <span className="neural-metric-label">Recall reserve</span>
            <strong className="neural-metric-value">{recallReserve}%</strong>
            <span className="neural-metric-meta">{taggedNotesCount} tagged memories available</span>
          </div>
          <div className="neural-metric-card neural-metric-card-violet">
            <span className="neural-metric-label">Synapse density</span>
            <strong className="neural-metric-value">{noteDensity.toFixed(1)}</strong>
            <span className="neural-metric-meta">{Math.round(totalConnections / 2)} active bridges</span>
          </div>
          <div className="neural-metric-card neural-metric-card-green">
            <span className="neural-metric-label">Focus vector</span>
            <strong className="neural-metric-value">{focusScore}%</strong>
            <span className="neural-metric-meta">
              {studyHoursToday ? `${studyHoursToday}h study logged today` : "No study telemetry yet"}
            </span>
          </div>
          <div className="neural-metric-card neural-metric-card-amber">
            <span className="neural-metric-label">Sync latency</span>
            <strong className="neural-metric-value">{syncLatency}ms</strong>
            <span className="neural-metric-meta">{manualConnections} pinned pathways</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="neural-kicker">Process Nodes</p>
            <button
              type="button"
              onClick={() => setCurrentView("notes")}
              className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 transition hover:bg-cyan-400/18"
            >
              Open Notes
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {recentNodeRows.length ? (
              recentNodeRows.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setSelectedNoteId(node.id);
                    setCurrentView("notes");
                  }}
                  className="neural-node-row w-full text-left"
                >
                  <div
                    className={`neural-node-dot ${
                      node.tone === "cyan"
                        ? "neural-node-dot-cyan"
                        : node.tone === "violet"
                        ? "neural-node-dot-violet"
                        : node.tone === "green"
                        ? "neural-node-dot-green"
                        : "neural-node-dot-amber"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{node.name}</div>
                    <div className="truncate text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      {node.address}
                    </div>
                  </div>
                  <div className="neural-node-meter">
                    <span style={{ width: `${node.load}%` }} />
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300/70">
                Add a few notes and your control panel will start listing active memory nodes.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="retro-panel neural-core-shell overflow-hidden rounded-[2rem] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="neural-kicker neural-kicker-cyan">Neural Core</p>
              <h2 className="mt-3 max-w-2xl font-mono text-3xl font-semibold uppercase tracking-[0.08em] text-white md:text-4xl">
                Command the second brain like a live system, not a static notes app.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRebuildLinks}
                className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-400/18"
              >
                Rebuild Links
              </button>
              <button
                type="button"
                onClick={() => openGraphView()}
                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/18"
              >
                Open Graph
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="neural-top-stat">
              <span className="neural-top-stat-label">Cognition</span>
              <strong className="neural-top-stat-value">{cognitiveLoad.toFixed(1)}%</strong>
            </div>
            <div className="neural-top-stat">
              <span className="neural-top-stat-label">Memory clusters</span>
              <strong className="neural-top-stat-value">{activeTagCount || 1}</strong>
            </div>
            <div className="neural-top-stat">
              <span className="neural-top-stat-label">Signal coverage</span>
              <strong className="neural-top-stat-value">{connectionCoverage}%</strong>
            </div>
            <div className="neural-top-stat">
              <span className="neural-top-stat-label">Local time</span>
              <strong className="neural-top-stat-value">{formatCommandClock(dashboardClock)}</strong>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="neural-graph-stage">
              <div className="neural-graph-hud">
                <span className="neural-live-dot" />
                Live stream · memory field online
              </div>
              <div className="flex min-h-[520px] items-center justify-center p-6">
                <BrainCoreDisplay
                  noteCount={notes.length}
                  activeTagCount={activeTagCount}
                  totalConnections={Math.round(totalConnections / 2)}
                  cognitiveLoad={cognitiveLoad}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="neural-side-panel">
                <p className="neural-kicker neural-kicker-violet">Search stream</p>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Search notes
                    </span>
                    <input
                      className="brain-input"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search title, content, or tags"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Filter cluster
                    </span>
                    <select
                      className="brain-input"
                      value={activeTag}
                      onChange={(event) => setActiveTag(event.target.value)}
                    >
                      <option value="">All tags</option>
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(searchQuery || activeTag) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveTag("");
                      }}
                      className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              <div className="neural-side-panel">
                <p className="neural-kicker neural-kicker-green">Signal gauges</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
                      <span>Creative bandwidth</span>
                      <span>{creativeScore}%</span>
                    </div>
                    <div className="neural-gauge-bar"><span style={{ width: `${creativeScore}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
                      <span>Consistency</span>
                      <span>{consistencyScore}%</span>
                    </div>
                    <div className="neural-gauge-bar neural-gauge-bar-violet"><span style={{ width: `${consistencyScore}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
                      <span>Visible notes</span>
                      <span>{filteredNotes.length}</span>
                    </div>
                    <div className="neural-gauge-bar neural-gauge-bar-green">
                      <span style={{ width: `${notes.length ? (filteredNotes.length / notes.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="retro-panel neural-card neural-grid-shell rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="neural-kicker neural-kicker-cyan">Recent thoughts</p>
                <p className="mt-2 text-sm text-slate-300/80">
                  Jump back into the newest memory traces without leaving the command floor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView("notes")}
                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/18"
              >
                Note Library
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentNotes.length ? (
                recentNotes.map((note) => (
                  <button
                    key={note._id}
                    type="button"
                    onClick={() => {
                      setSelectedNoteId(note._id);
                      setCurrentView("notes");
                    }}
                    className="neural-note-row w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-medium text-white">{note.title}</div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300/78">
                          {note.content}
                        </p>
                      </div>
                      <div className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                        {(note.relatedNotes || []).filter((entry) => entry.note).length} links
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300/70">
                  Add your first notes to start feeding the digital brain.
                </div>
              )}
            </div>
          </section>

          <section className="retro-panel neural-card neural-grid-shell rounded-[2rem] p-5">
            <p className="neural-kicker neural-kicker-violet">System log</p>
            <div className="mt-4 space-y-3">
              {commandLogEntries.map((entry) => (
                <div
                  key={`${entry.time}-${entry.tag}`}
                  className={`neural-log-row ${
                    entry.tone === "critical"
                      ? "neural-log-row-critical"
                      : entry.tone === "warn"
                      ? "neural-log-row-warn"
                      : entry.tone === "ok"
                      ? "neural-log-row-ok"
                      : ""
                  }`}
                >
                  <span className="neural-log-time">{entry.time}</span>
                  <span className="neural-log-tag">{entry.tag}</span>
                  <span className="text-sm leading-6 text-slate-200/85">{entry.message}</span>
                </div>
              ))}
            </div>

            <div
              className={`mt-5 rounded-[1.4rem] border px-4 py-4 text-sm ${
                statusError
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                  : "border-cyan-300/10 bg-cyan-400/5 text-cyan-100/80"
              }`}
            >
              {statusMessage}
              {!!statusMessages.length && (
                <ul className="mt-3 space-y-2 text-xs leading-6">
                  {statusMessages.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="retro-panel neural-card neural-grid-shell rounded-[2rem] p-5">
        <p className="neural-kicker neural-kicker-violet">Mission Status</p>

        <div className="mt-4 grid gap-3">
          <div className="neural-mini-card">
            <span className="neural-mini-label">Selected memory</span>
            <strong className="neural-mini-value">{selectedNote?.title || "No note selected"}</strong>
            <span className="neural-mini-meta">Current focal thought for editing or graph zoom.</span>
          </div>
          <div className="neural-mini-card">
            <span className="neural-mini-label">Habit stream</span>
            <strong className="neural-mini-value">
              {habitToday?.gymCompleted ? "Gym logged" : "Gym pending"}
            </strong>
            <span className="neural-mini-meta">
              Sleep {sleepHoursToday}h · Study {studyHoursToday}h · Mood {habitToday?.mood || "mixed"}
            </span>
          </div>
          <div className="neural-mini-card">
            <span className="neural-mini-label">Idea resurfacing</span>
            <strong className="neural-mini-value">{forgottenIdeas.length}</strong>
            <span className="neural-mini-meta">Older notes suggested for deliberate revisit.</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="neural-kicker neural-kicker-green">Quick launch</p>
          <div className="mt-3 grid gap-3">
            <button
              type="button"
              onClick={() => setCurrentView("notes")}
              className="neural-action-btn"
            >
              Draft or edit notes
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("habits")}
              className="neural-action-btn"
            >
              Open habit tracker
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("face")}
              className="neural-action-btn"
            >
              Analyze face mood
            </button>
          </div>
        </div>
      </section>
    </main>
  );

  const renderNotesView = () => (
    <main className="grid flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
      <NoteForm
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onVoiceCapture={handleVoiceCapture}
        onAddDraft={handleAddDraft}
        onRemoveDraft={handleRemoveDraft}
        onImportDrafts={handleImportDrafts}
        onSuggestContent={handleSuggestContent}
        onRecommendDraft={handleRecommendDraft}
        aiEnabled={AI_FEATURES_ENABLED}
        statusMessage={statusMessage}
        statusMessages={statusMessages}
        statusError={statusError}
        contentSuggestions={contentSuggestions}
        recommendations={draftRecommendations}
        onSelectRecommendation={setSelectedNoteId}
      />

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              Note Library
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Browse and select
            </h2>
          </div>
          <button
            type="button"
            onClick={handleRebuildLinks}
            className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-400/18"
          >
            Rebuild Links
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            className="brain-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, content, or tags"
          />
          <select
            className="brain-input"
            value={activeTag}
            onChange={(event) => setActiveTag(event.target.value)}
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 space-y-3">
          {filteredNotes.length ? (
            filteredNotes.map((note) => (
              <button
                key={note._id}
                type="button"
                onClick={() => setSelectedNoteId(note._id)}
                className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                  note._id === selectedNoteId
                    ? "border-cyan-400/30 bg-cyan-400/10"
                    : "border-white/10 bg-white/5 hover:border-cyan-400/20 hover:bg-cyan-400/6"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{note.title}</span>
                  <span className="text-xs text-slate-500">
                    {(note.relatedNotes || []).filter((entry) => entry.note).length} links
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300/80">
                  {note.content}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300/70">
              No notes match your current filters.
            </div>
          )}
        </div>
      </section>

      <NotePanel
        note={selectedNote}
        allNotes={notes}
        onSelectNote={setSelectedNoteId}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onLinkNote={handleCreateManualLink}
        onUnlinkNote={handleDeleteManualLink}
        forgottenIdeas={forgottenIdeas}
      />
    </main>
  );

  const renderGraphView = () => (
    <main className="flex flex-1">
      <section className="glass-panel relative min-h-[78vh] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 p-3 shadow-[0_0_70px_rgba(56,189,248,0.08)]">
        <BrainGraph
          notes={filteredNotes}
          selectedNoteId={selectedNoteId}
          hoveredNodeId={hoveredNodeId}
          pulseOriginId={pulseOriginId}
          onNodeSelect={setSelectedNoteId}
          onNodeHover={setHoveredNodeId}
          minimal
          defaultFullscreen
          autoFocusOnSelect
        />
      </section>
    </main>
  );

  const renderHabitsView = () => (
    <HabitPanel
      habitDashboard={habitDashboard}
      habitLoading={habitLoading}
      habitError={habitError}
      habitStatus={habitStatus}
      habitForm={habitForm}
      onRefresh={loadHabitDashboard}
      onSubmit={handleHabitSubmit}
      onFieldChange={handleHabitFieldChange}
    />
  );

  const renderFaceView = () => (
    <FaceMoodPanel
      aiEnabled={AI_FEATURES_ENABLED}
      analysis={faceAnalysis}
      analysisLoading={faceAnalysisLoading}
      analysisStatus={faceAnalysisStatus}
      analysisError={faceAnalysisError}
      onAnalyzeSnapshot={handleAnalyzeFaceSnapshot}
    />
  );

    return (
      <div className="retro-theme min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="retro-starfield absolute inset-0" />
          <div className="retro-stars absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.16),transparent_24%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.16),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_45%,#030712_100%)]" />
          <div className="absolute left-[-10%] top-[10%] h-80 w-80 rounded-full bg-cyan-400/12 blur-[120px] floating-aurora" />
          <div className="absolute bottom-[2%] right-[-5%] h-96 w-96 rounded-full bg-fuchsia-500/12 blur-[150px] floating-aurora-delayed" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1900px] flex-col px-4 py-4 lg:px-6">
          <header className="retro-panel neural-command-header mb-4 overflow-hidden rounded-[2rem] px-6 py-5 backdrop-blur-xl">
            <div className="pointer-events-none absolute right-[-1.5rem] top-1/2 z-0 hidden h-[320px] w-[320px] -translate-y-1/2 opacity-95 lg:block xl:right-0 xl:h-[380px] xl:w-[380px]">
              <ByteMascot decorative className="h-full w-full scale-[1.18]" />
            </div>

            <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between xl:pr-[260px]">
              <div className="max-w-3xl">
                <p className="pixel-label text-xs font-semibold uppercase tracking-[0.42em] text-cyan-300/80">
                  Digital Brain Command Deck
                </p>
                <h1 className="pixel-hero mt-3 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Your thoughts,
                  <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                    running like a neural operating system
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/82">
                  Notes become memory nodes, habits become telemetry, and the graph becomes
                  the live control surface for your second brain.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))] xl:w-[620px]">
                <div className="neural-header-stat">
                  <span className="neural-header-label">Notes</span>
                  <strong className="neural-header-value">{notes.length}</strong>
                </div>
                <div className="neural-header-stat">
                  <span className="neural-header-label">Synapses</span>
                  <strong className="neural-header-value">{Math.round(totalConnections / 2)}</strong>
                </div>
                <div className="neural-header-stat">
                  <span className="neural-header-label">Mood</span>
                  <strong className="neural-header-value">
                    {habitToday?.mood ? habitToday.mood.slice(0, 3).toUpperCase() : "MIX"}
                  </strong>
                </div>
                <div className="neural-header-stat">
                  <span className="neural-header-label">Clock</span>
                  <strong className="neural-header-value">{formatCommandClock(dashboardClock)}</strong>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 md:grid-cols-3 xl:w-[62%]">
                <div className="neural-banner-chip">
                  <span className="neural-live-dot" />
                  Secure session active
                </div>
                <div className="neural-banner-chip">
                  Visible cluster load {filteredNotes.length}/{notes.length || 0}
                </div>
                <div className="neural-banner-chip">
                  Coverage {connectionCoverage}% connected
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Signed in as</p>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="retro-btn rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200 transition hover:bg-fuchsia-400/20"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <nav className="retro-panel retro-nav-shell mb-4 flex flex-wrap gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                item.id === "graph" ? openGraphView() : setCurrentView(item.id)
              }
              className={`retro-tab rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentView === item.id
                  ? "retro-tab-active bg-cyan-400 text-slate-950"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          </nav>

          {currentView === "dashboard" && renderDashboardView()}
          {currentView === "notes" && renderNotesView()}
          {currentView === "graph" && renderGraphView()}
          {currentView === "habits" && renderHabitsView()}
          {currentView === "face" && renderFaceView()}
        </div>
      </div>
    );
}

export default App;
