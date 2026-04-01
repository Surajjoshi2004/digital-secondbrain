import { useEffect, useRef, useState } from "react";

function NoteForm({
  form,
  onChange,
  onSubmit,
  onVoiceCapture,
  onAddDraft,
  onRemoveDraft,
  onImportDrafts,
  onSuggestContent,
  onRecommendDraft,
  aiEnabled = false,
  statusMessage,
  statusMessages = [],
  statusError,
  contentSuggestions,
  recommendations,
  onSelectRecommendation,
}) {
  const [bulkInput, setBulkInput] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceError, setVoiceError] = useState(false);
  const recognitionRef = useRef(null);
  const isBatchMode = form.length > 1;

  const handleImportClick = () => {
    onImportDrafts(bulkInput);
    setBulkInput("");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoiceSupported(Boolean(SpeechRecognition));

    if (!SpeechRecognition) {
      setVoiceMessage("Your browser does not support built-in voice capture here.");
      setVoiceError(true);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = "";

    recognition.onstart = () => {
      finalTranscript = "";
      setIsListening(true);
      setVoiceError(false);
      setVoiceMessage("Listening now. Speak your thought, then press stop or pause.");
    };

    recognition.onresult = (event) => {
      finalTranscript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceError(true);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceMessage("Microphone permission was blocked. Please allow mic access and try again.");
        return;
      }

      if (event.error === "no-speech") {
        setVoiceMessage("No speech was detected. Try again and speak a little louder.");
        return;
      }

      setVoiceMessage("Voice capture ran into a microphone issue. Please try once more.");
    };

    recognition.onend = async () => {
      setIsListening(false);

      if (finalTranscript) {
        setVoiceError(false);
        setVoiceMessage("Transcribing and saving your voice note...");
        await onVoiceCapture(finalTranscript);
        return;
      }

      setVoiceError(true);
      setVoiceMessage("No speech was captured this time.");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onVoiceCapture]);

  const handleVoiceToggle = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    setVoiceError(false);
    setVoiceMessage("");
    recognition.start();
  };

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_0_60px_rgba(59,130,246,0.12)]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 bg-gradient-to-b from-cyan-400/10 to-transparent blur-2xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          Capture Notes
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          Seed new neurons
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300/80">
          Draft one note, queue several together, or paste a whole page and split
          it into separate thoughts before saving.
        </p>
      </div>

      <div className="relative mt-6 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Bulk Paste Import
          </p>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={!bulkInput.trim()}
            className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Split Into Drafts
          </button>
        </div>
        <textarea
          className="brain-input mt-4 min-h-32 resize-y"
          value={bulkInput}
          onChange={(event) => setBulkInput(event.target.value)}
          placeholder={"Title: Graph patterns\nTags: algorithms, practice\nExplain the note here.\n\nTitle: DP intuition\nShort summary here."}
        />
      </div>

      <form className="relative mt-8 space-y-5" onSubmit={onSubmit}>
        {form.map((draft, index) => (
          <div
            key={index}
            className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Note {index + 1}
              </p>
              {form.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveDraft(index)}
                  className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-400/18"
                >
                  Remove
                </button>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                Title
              </span>
              <input
                className="brain-input"
                name="title"
                data-index={index}
                value={draft.title}
                onChange={onChange}
                placeholder="Backtracking patterns"
                required
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                Content
              </span>
              <textarea
                className="brain-input min-h-40 resize-none"
                name="content"
                data-index={index}
                value={draft.content}
                onChange={onChange}
                placeholder="Explain the idea, intuition, or connection you want to preserve."
                required
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                Tags
              </span>
              <input
                className="brain-input"
                name="tags"
                data-index={index}
                value={draft.tags}
                onChange={onChange}
                placeholder="algorithms, recursion, practice"
              />
            </label>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddDraft}
          className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/30 hover:bg-cyan-400/8"
        >
          Add Another Note
        </button>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={!voiceSupported}
            className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/18 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {!voiceSupported
              ? "Voice unavailable"
              : isListening
                ? "Stop Voice Capture"
                : "Capture by Voice"}
          </button>
          <button
            type="button"
            onClick={onSuggestContent}
            disabled={isBatchMode || !aiEnabled}
            className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {!aiEnabled
              ? "AI disabled"
              : isBatchMode
                ? "AI works on one draft"
                : "Suggest content with AI"}
          </button>
          <button
            type="button"
            onClick={onRecommendDraft}
            disabled={isBatchMode || !aiEnabled}
            className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/18 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {!aiEnabled
              ? "AI disabled"
              : isBatchMode
                ? "Related AI works on one draft"
                : "Suggest related notes"}
          </button>
        </div>

        {!!voiceMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              voiceError
                ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
                : "border-cyan-300/10 bg-cyan-400/5 text-cyan-100/80"
            }`}
          >
            {voiceMessage}
          </div>
        )}

        <button
          type="submit"
          className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:scale-[1.01]"
        >
          <span className="absolute inset-0 translate-y-full bg-white/20 transition duration-300 group-hover:translate-y-0" />
          <span className="relative">
            {isBatchMode ? "Fire New Signals" : "Fire New Signal"}
          </span>
        </button>
      </form>

      {!!contentSuggestions.length && (
        <div className="relative mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            AI Writing Suggestions
          </p>
          <div className="mt-3 space-y-3">
            {contentSuggestions.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-[1.35rem] border border-cyan-300/10 bg-cyan-400/5 p-4 text-left"
              >
                <p className="text-sm leading-6 text-slate-100">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`relative mt-5 rounded-2xl border px-4 py-3 text-sm ${
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

      {!!recommendations.length && (
        <div className="relative mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            AI Related Suggestions
          </p>
          <div className="mt-3 space-y-3">
            {recommendations.map((item) => (
              <button
                key={item.noteId}
                type="button"
                onClick={() => onSelectRecommendation(item.noteId)}
                className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/8"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">
                    {item.note?.title || item.noteId}
                  </span>
                  <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-1 text-[11px] font-medium text-fuchsia-200">
                    {item.confidence}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300/80">{item.reason}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default NoteForm;
