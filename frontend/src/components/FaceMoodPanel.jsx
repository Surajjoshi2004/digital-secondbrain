import { useEffect, useRef, useState } from "react";

const moodToneClasses = {
  energized: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  focused: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  calm: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  mixed: "border-slate-400/20 bg-slate-500/10 text-slate-100",
  stressed: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  low: "border-rose-400/20 bg-rose-500/10 text-rose-100",
};

function FaceMoodPanel({
  aiEnabled,
  analysis,
  analysisLoading,
  analysisStatus,
  analysisError,
  onAnalyzeSnapshot,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [snapshot, setSnapshot] = useState("");

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError("This browser does not support webcam capture here.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 960 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setCameraReady(true);
        setCameraError("");
      } catch (_error) {
        setCameraError("Camera access was blocked. Please allow webcam permission and try again.");
      }
    };

    startCamera();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <main className="grid flex-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          Face Mood
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          Analyze your expression live
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300/80">
          Open the webcam, capture a frame, and let Gemini estimate your current mood
          from visible facial cues. This is a soft emotional read, not identity or
          medical analysis.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/80">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/45 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Controls
            </p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!cameraReady}
                className="w-full rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-55"
              >
                Capture Frame
              </button>
              <button
                type="button"
                onClick={() => onAnalyzeSnapshot(snapshot)}
                disabled={!snapshot || !aiEnabled || analysisLoading}
                className="w-full rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/18 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {!aiEnabled
                  ? "AI disabled"
                  : analysisLoading
                  ? "Analyzing..."
                  : "Analyze Face Mood"}
              </button>
            </div>

            <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300/80">
              {cameraError || analysisStatus || "Capture a frame to begin."}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {snapshot ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Captured Frame
            </p>
            <div className="mt-3 overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/70">
              <img
                src={snapshot}
                alt="Captured webcam frame"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-300/80">
          Analysis
        </p>
        {analysis ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Estimated mood
              </p>
              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${
                  moodToneClasses[analysis.mood || "mixed"]
                }`}
              >
                {analysis.mood || "mixed"}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-200/90">
                {analysis.summary}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Confidence
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {Math.round((analysis.confidence || 0) * 100)}%
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Face visible
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {analysis.faceDetected ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Visual cues
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(analysis.indicators || []).length ? (
                  analysis.indicators.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No strong cues returned.</span>
                )}
              </div>
            </div>

            <div
              className={`rounded-[1.4rem] border px-4 py-4 text-sm ${
                analysisError
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                  : "border-cyan-300/10 bg-cyan-400/5 text-cyan-100/80"
              }`}
            >
              {analysis.guidance || analysisStatus}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.6rem] border border-dashed border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300/75">
            Capture a webcam frame and run analysis to populate this page with the
            detected mood, confidence, and visible facial cues.
          </div>
        )}
      </section>
    </main>
  );
}

export default FaceMoodPanel;
