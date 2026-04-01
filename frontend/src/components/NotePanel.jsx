import { useEffect, useMemo, useState } from "react";

function NotePanel({
  note,
  allNotes = [],
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onLinkNote,
  onUnlinkNote,
  forgottenIdeas = [],
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [linkTargetId, setLinkTargetId] = useState("");

  useEffect(() => {
    if (!note) {
      setIsEditing(false);
      setEditDraft({
        title: "",
        content: "",
        tags: "",
      });
      return;
    }

    setEditDraft({
      title: note.title || "",
      content: note.content || "",
      tags: (note.tags || []).join(", "),
    });
    setIsEditing(false);
  }, [note]);

  const linkableNotes = useMemo(
    () => allNotes.filter((candidate) => candidate._id !== note?._id),
    [allNotes, note?._id]
  );

  const relatedEntries = (note?.relatedNotes || []).filter((entry) => entry.note);

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditDraft((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    await onUpdateNote(note._id, editDraft);
    setIsEditing(false);
  };

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_0_60px_rgba(168,85,247,0.12)]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 bg-gradient-to-b from-fuchsia-400/10 to-transparent blur-2xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-300/80">
          Selected Note
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          {note ? note.title : "Waiting for a thought"}
        </h2>
      </div>

      {!note ? (
        <div className="relative mt-8 rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300/80">
          Click a neuron in the brain to inspect its meaning, edit it, or pin the
          links that matter most.
        </div>
      ) : (
        <div className="relative mt-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsEditing((current) => !current)}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 transition hover:bg-cyan-400/18"
            >
              {isEditing ? "Cancel Edit" : "Edit Note"}
            </button>
            <button
              type="button"
              onClick={() => onDeleteNote(note._id)}
              className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100 transition hover:bg-rose-500/18"
            >
              Delete Note
            </button>
          </div>

          {isEditing ? (
            <form
              onSubmit={handleSave}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                  Title
                </span>
                <input
                  className="brain-input"
                  name="title"
                  value={editDraft.title}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                  Content
                </span>
                <textarea
                  className="brain-input min-h-36 resize-y"
                  name="content"
                  value={editDraft.content}
                  onChange={handleEditChange}
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
                  value={editDraft.tags}
                  onChange={handleEditChange}
                />
              </label>

              <button
                type="submit"
                className="mt-4 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/18"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm leading-8 text-slate-200/90">{note.content}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Tags
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(note.tags || []).length ? (
                (note.tags || []).map((tag) => (
                  <span
                    key={`${note._id}-${tag}`}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">No tags yet.</span>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Manual Linking
              </p>
              <span className="text-xs text-slate-500">
                Pin important relationships
              </span>
            </div>
            <div className="mt-4 flex gap-3">
              <select
                className="brain-input"
                value={linkTargetId}
                onChange={(event) => setLinkTargetId(event.target.value)}
              >
                <option value="">Choose note to connect</option>
                {linkableNotes.map((candidate) => (
                  <option key={candidate._id} value={candidate._id}>
                    {candidate.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (linkTargetId) {
                    onLinkNote(note._id, linkTargetId);
                    setLinkTargetId("");
                  }
                }}
                disabled={!linkTargetId}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Link
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Related Notes
              </p>
              <span className="text-xs text-slate-500">
                {relatedEntries.length} synapses
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {relatedEntries.length ? (
                relatedEntries.map((entry) => (
                  <div
                    key={`${note._id}-${entry.note._id}`}
                    className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => onSelectNote(entry.note._id)}
                        className="text-left font-medium text-white transition hover:text-cyan-200"
                      >
                        {entry.note.title}
                      </button>
                      <div className="flex items-center gap-2">
                        {entry.isManual && (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
                            pinned
                          </span>
                        )}
                        <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-medium text-fuchsia-200">
                          {entry.score}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                      {(entry.sharedKeywords || []).join(" | ") || "semantic link"}
                    </p>
                    {entry.isManual && (
                      <button
                        type="button"
                        onClick={() => onUnlinkNote(note._id, entry.note._id)}
                        className="mt-3 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-500/18"
                      >
                        Remove Pinned Link
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300/70">
                  This thought has not formed strong synapses yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative mt-8">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Forgotten Ideas
          </p>
          <span className="text-xs text-slate-500">{forgottenIdeas.length} surfaced</span>
        </div>

        <div className="mt-4 space-y-3">
          {forgottenIdeas.length ? (
            forgottenIdeas.map((item) => (
              <button
                key={item.noteId}
                type="button"
                onClick={() => onSelectNote(item.noteId)}
                className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-fuchsia-400/30 hover:bg-fuchsia-400/8"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-white">
                    {item.note?.title || item.noteId}
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
                    revisit
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300/80">{item.reason}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  {item.revisitPrompt}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300/70">
              Once you have a few notes, Gemini can surface older ideas worth revisiting.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default NotePanel;
