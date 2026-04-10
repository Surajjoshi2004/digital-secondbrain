const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const aiRoutes = require("./routes/aiRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const {
  aiRateLimitOptions,
  authRateLimitOptions,
  corsOptions,
  globalRateLimitOptions,
  rejectUnsafeMongoKeys,
} = require("./middleware/security");
const authRoutes = require("./routes/authRoutes");
const habitRoutes = require("./routes/habitRoutes");
const noteRoutes = require("./routes/noteRoutes");

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(rateLimit(globalRateLimitOptions));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(rejectUnsafeMongoKeys);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "second-brain-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use(
  "/api/auth",
  rateLimit(authRateLimitOptions),
  authRoutes
);
app.use(
  "/api/ai",
  rateLimit(aiRateLimitOptions),
  aiRoutes
);
app.use("/api/notes", noteRoutes);
app.use("/api/habits", habitRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
