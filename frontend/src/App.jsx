import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import AuthPanel from "./components/AuthPanel";
import BrainGraph from "./components/BrainGraph";
import ByteMascot from "./components/ByteMascot";
import HabitPanel from "./components/HabitPanel";
import NoteForm from "./components/NoteForm";
import NotePanel from "./components/NotePanel";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
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
  const responseData = error.response?.data;
  const statusCode = error.response?.status;
  const detailMessages = Array.isArray(responseData?.details)
    ? responseData.details
        .map((detail) => detail?.message)
        .filter(Boolean)
    : [];
  let message = responseData?.message || fallbackMessage;
  let messages = [...new Set([message, ...detailMessages].filter(Boolean))];

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
    note: "",
  });
  const [contentSuggestions, setContentSuggestions] = useState([]);
  const [draftRecommendations, setDraftRecommendations] = useState([]);
  const [forgottenIdeas, setForgottenIdeas] = useState([]);
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

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
      }),
    []
  );

  const loadCurrentUser = async () => {
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
      await api.post("/habits/log", {
        date: getTodayDate(),
        gymCompleted: Boolean(habitForm.gymCompleted),
        studyHours: Number(habitForm.studyHours || 0),
        sleepHours: Number(habitForm.sleepHours || 0),
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

  const navigationItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "notes", label: "Notes" },
    { id: "graph", label: "Graph" },
    { id: "habits", label: "Habits" },
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
    <main className="grid flex-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          Dashboard
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          See your brain at a glance
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300/80">
          Use this page to search, filter, and jump into either note management or
          graph exploration without crowding everything into one workspace.
        </p>

        <section className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Search Notes
            </span>
            <input
              className="brain-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, content, or tags"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Filter Tag
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

          <div className="flex items-end justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Visible Notes
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {filteredNotes.length}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRebuildLinks}
                className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-400/18"
              >
                Rebuild Links
              </button>
              {(searchQuery || activeTag) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTag("");
                  }}
                  className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/18"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.6rem] border border-cyan-400/15 bg-cyan-400/8 p-5">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/80">
              Total notes
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">{notes.length}</p>
          </div>
          <div className="rounded-[1.6rem] border border-fuchsia-400/15 bg-fuchsia-400/8 p-5">
            <p className="text-xs uppercase tracking-[0.26em] text-fuchsia-200/80">
              Visible now
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {filteredNotes.length}
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-blue-400/15 bg-blue-400/8 p-5">
            <p className="text-xs uppercase tracking-[0.26em] text-blue-200/80">
              Selected
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {selectedNote?.title || "None"}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[1.8rem] border border-white/10 bg-slate-950/45 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Recent Notes
              </p>
              <p className="mt-2 text-sm text-slate-300/80">
                Jump straight into a note or open the full notes workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView("notes")}
              className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/18"
            >
              Open Notes
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
                  className="w-full rounded-[1.3rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/8"
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
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300/70">
                Add your first notes to populate the dashboard.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-4">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-300/80">
                Graph Snapshot
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Explore the network
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView("graph")}
              className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-400/18"
            >
              Open Graph
            </button>
          </div>
          <div className="mt-4 h-[420px]">
            <BrainGraph
              notes={filteredNotes}
              selectedNoteId={selectedNoteId}
              hoveredNodeId={hoveredNodeId}
              pulseOriginId={pulseOriginId}
              onNodeSelect={(noteId) => {
                setSelectedNoteId(noteId);
                setCurrentView("graph");
              }}
              onNodeHover={setHoveredNodeId}
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Status
          </p>
          <div
            className={`mt-4 rounded-[1.5rem] border px-4 py-4 text-sm ${
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

    return (
      <div className="retro-theme min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
          <div className="retro-starfield absolute inset-0" />
          <div className="retro-stars absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.16),transparent_24%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.16),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_45%,#030712_100%)]" />
          <div className="absolute left-[-10%] top-[10%] h-80 w-80 rounded-full bg-cyan-400/12 blur-[120px] floating-aurora" />
          <div className="absolute bottom-[2%] right-[-5%] h-96 w-96 rounded-full bg-fuchsia-500/12 blur-[150px] floating-aurora-delayed" />
        </div>
      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col px-4 py-4 lg:px-6">
        <header className="retro-panel relative mb-4 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-5 backdrop-blur-xl">
          <div className="pointer-events-none absolute right-[-1.5rem] top-1/2 z-0 hidden h-[320px] w-[320px] -translate-y-1/2 opacity-95 lg:block xl:right-0 xl:h-[380px] xl:w-[380px]">
            <ByteMascot decorative className="h-full w-full scale-[1.18]" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 lg:pr-[180px] lg:flex-row lg:items-end lg:justify-between xl:pr-[260px]">
          <div>
            <p className="pixel-label text-xs font-semibold uppercase tracking-[0.42em] text-cyan-300/80">
              Personal Knowledge Engine
            </p>
            <h1 className="pixel-hero mt-3 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Your thoughts,
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                alive as a digital brain
              </span>
            </h1>
          </div>

          <div className="flex max-w-xl flex-col items-start gap-4 lg:items-end">
            <div className="text-sm leading-7 text-slate-300/80 lg:text-right">
              Search, refine, batch-import, and deliberately wire your ideas into a
              second brain that feels editable instead of static.
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Signed in as
                </p>
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
          </div>
        </header>
        <nav className="retro-panel retro-nav-shell mb-4 flex flex-wrap gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
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
      </div>
    </div>
  );
}

export default App;
