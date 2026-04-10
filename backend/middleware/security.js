const ApiError = require("../utils/ApiError");

const JSON_METHODS = new Set(["POST", "PUT", "PATCH"]);

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return configuredOrigins;
  }

  return [
    ...new Set([
      ...configuredOrigins,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]),
  ];
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (getAllowedOrigins().includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new ApiError(403, "Origin is not allowed."));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

const globalRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
};

const authRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
};

const aiRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AI_RATE_LIMIT_MAX || 40),
  standardHeaders: true,
  legacyHeaders: false,
};

const requireJsonBody = (req, _res, next) => {
  if (
    req.path.startsWith("/api/") &&
    JSON_METHODS.has(req.method) &&
    req.headers["content-length"] !== undefined &&
    !req.is("application/json")
  ) {
    throw new ApiError(415, "Content-Type must be application/json.");
  }

  next();
};

const initializeEmptyBody = (req, _res, next) => {
  if (req.body === undefined) {
    req.body = {};
  }

  next();
};

const hasUnsafeMongoKey = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasUnsafeMongoKey);
  }

  return Object.entries(value).some(
    ([key, nestedValue]) =>
      key.startsWith("$") || key.includes(".") || hasUnsafeMongoKey(nestedValue)
  );
};

const rejectUnsafeMongoKeys = (req, _res, next) => {
  if (hasUnsafeMongoKey(req.body) || hasUnsafeMongoKey(req.query) || hasUnsafeMongoKey(req.params)) {
    throw new ApiError(400, "Request contains unsupported field names.");
  }

  next();
};

module.exports = {
  aiRateLimitOptions,
  authRateLimitOptions,
  corsOptions,
  globalRateLimitOptions,
  initializeEmptyBody,
  rejectUnsafeMongoKeys,
  requireJsonBody,
};
