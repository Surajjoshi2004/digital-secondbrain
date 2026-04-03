import { useState } from "react";

const streakCardConfig = [
  { key: "gym", label: "Gym streak", tone: "emerald" },
  { key: "study", label: "Study streak", tone: "amber" },
  { key: "sleep", label: "Sleep streak", tone: "sky" },
];

const getTiltStyle = (tilt) => {
  const rotateX = tilt?.rotateX || 0;
  const rotateY = tilt?.rotateY || 0;

  return {
    transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`,
  };
};

function HabitPanel({
  habitDashboard,
  habitLoading,
  habitError,
  habitStatus,
  habitForm,
  onRefresh,
  onSubmit,
  onFieldChange,
}) {
  const [tilts, setTilts] = useState({});

  const handleCardMove = (key, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 12;
    const rotateX = (0.5 - y) * 12;

    setTilts((current) => ({
      ...current,
      [key]: { rotateX: Number(rotateX.toFixed(2)), rotateY: Number(rotateY.toFixed(2)) },
    }));
  };

  const handleCardLeave = (key) => {
    setTilts((current) => ({
      ...current,
      [key]: { rotateX: 0, rotateY: 0 },
    }));
  };

  return (
    <main className="grid flex-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
      <section className="retro-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="habit-orbit-ring h-36 w-36 border-emerald-300/20" />
          <div className="habit-orbit-ring habit-orbit-ring-delayed h-48 w-48 border-cyan-300/20" />
          <div className="habit-orbit-dot bg-emerald-300/70" />
          <div className="habit-orbit-dot habit-orbit-dot-delayed bg-cyan-300/70" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
              Habit Tracker
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Build consistency daily
            </h2>
            <p className="mt-2 text-sm text-slate-300/80">
              Log gym, study, and sleep in one place and let your streaks stay visible.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="retro-btn rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/18"
          >
            Refresh
          </button>
        </div>

        <div className="habit-3d-stage mt-5 grid gap-3 md:grid-cols-3">
          {streakCardConfig.map((card) => (
            <div
              key={card.key}
              className={`habit-card-tilt rounded-[1.2rem] border p-4 ${
                card.tone === "emerald"
                  ? "border-emerald-400/20 bg-emerald-500/10"
                  : card.tone === "amber"
                  ? "border-amber-400/20 bg-amber-500/10"
                  : "border-sky-400/20 bg-sky-500/10"
              }`}
              style={getTiltStyle(tilts[card.key])}
              onMouseMove={(event) => handleCardMove(card.key, event)}
              onMouseLeave={() => handleCardLeave(card.key)}
            >
              <p
                className={`text-xs uppercase tracking-[0.22em] ${
                  card.tone === "emerald"
                    ? "text-emerald-200/80"
                    : card.tone === "amber"
                    ? "text-amber-200/80"
                    : "text-sky-200/80"
                }`}
              >
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {habitDashboard?.streaks?.[card.key] ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-300/70">days in a row</p>
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                name="gymCompleted"
                checked={habitForm.gymCompleted}
                onChange={onFieldChange}
              />
              Gym completed today
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Study Hours
              </span>
              <input
                className="brain-input"
                type="number"
                min="0"
                max="24"
                step="0.25"
                name="studyHours"
                value={habitForm.studyHours}
                onChange={onFieldChange}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sleep Hours
              </span>
              <input
                className="brain-input"
                type="number"
                min="0"
                max="24"
                step="0.25"
                name="sleepHours"
                value={habitForm.sleepHours}
                onChange={onFieldChange}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Note
              </span>
              <input
                className="brain-input"
                name="note"
                value={habitForm.note}
                onChange={onFieldChange}
                placeholder="How did today feel?"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className={`text-xs ${habitError ? "text-rose-200" : "text-emerald-200/90"}`}>
              {habitLoading ? "Loading habit data..." : habitStatus || " "}
            </p>
            <button
              type="submit"
              className="retro-btn rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/18"
            >
              Save Today
            </button>
          </div>
        </form>
      </section>

      <section className="retro-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Last 10 Days
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          {(habitDashboard?.recentLogs || []).length ? (
            (habitDashboard?.recentLogs || []).map((log) => (
              <div
                key={log.id}
                className="habit-log-row flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2"
              >
                <span>{log.date}</span>
                <span>Gym: {log.gymCompleted ? "Yes" : "No"}</span>
                <span>Study: {log.studyHours}h</span>
                <span>Sleep: {log.sleepHours}h</span>
              </div>
            ))
          ) : (
            <p className="text-slate-400">No habit logs yet. Start with today.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default HabitPanel;
