function AuthPanel({
  mode,
  authForm,
  authStatus,
  authMessages = [],
  authError,
  onModeChange,
  onChange,
  onSubmit,
}) {
  const isRegister = mode === "register";

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-6xl rounded-[2.2rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl lg:grid lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(3,7,18,0.92))] p-8 lg:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[8%] top-[10%] h-44 w-44 rounded-full bg-cyan-400/14 blur-3xl" />
            <div className="absolute bottom-[4%] right-[6%] h-52 w-52 rounded-full bg-fuchsia-500/14 blur-3xl" />
            <div className="brain-grid absolute inset-0 opacity-80" />
          </div>

          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-cyan-300/80">
              Personal Knowledge Engine
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Enter the
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                living digital brain
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300/85">
              Your notes become neurons. Their relationships behave like synapses.
              Authentication keeps each mental universe private, isolated, and secure.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-cyan-400/15 bg-cyan-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/80">
                  Private graph
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200/85">
                  Every note and every connection is scoped to your own account.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-fuchsia-400/15 bg-fuchsia-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-fuchsia-200/80">
                  Protected API
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200/85">
                  Secure cookies, rate limits, and protected routes guard the system.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-400/15 bg-blue-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-blue-200/80">
                  Thought engine
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200/85">
                  Sign in to watch your ideas pulse through a living neural map.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center p-4 lg:p-8">
          <div className="w-full rounded-[1.8rem] border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_60px_rgba(56,189,248,0.08)] lg:p-8">
            <div className="mb-8 flex rounded-full border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => onModeChange("login")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => onModeChange("register")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "register"
                    ? "bg-fuchsia-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Create account
              </button>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              {isRegister ? "New identity" : "Returning signal"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              {isRegister ? "Create your private brain" : "Reconnect to your thoughts"}
            </h2>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              {isRegister && (
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                    Name
                  </span>
                  <input
                    className="brain-input"
                    name="name"
                    value={authForm.name}
                    onChange={onChange}
                    placeholder="Suraj Joshi"
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                  Email
                </span>
                <input
                  className="brain-input"
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={onChange}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                  Password
                </span>
                <input
                  className="brain-input"
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={onChange}
                  placeholder="At least 8 characters"
                  required
                />
              </label>

              <button
                type="submit"
                className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] ${
                  isRegister
                    ? "bg-gradient-to-r from-fuchsia-400 via-violet-500 to-cyan-400 text-slate-950"
                    : "bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 text-slate-950"
                }`}
              >
                {isRegister ? "Create account" : "Sign in"}
              </button>
            </form>

            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm break-words overflow-hidden ${
                authError
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                  : "border-cyan-300/10 bg-cyan-400/5 text-cyan-100/80"
              }`}
            >
              {authStatus}
              {!!authMessages.length && (
                <ul className="mt-3 space-y-2 text-xs leading-6 text-left">
                  {authMessages.map((message, index) => (
                    <li key={`${message}-${index}`} className="break-words">
                      {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthPanel;
