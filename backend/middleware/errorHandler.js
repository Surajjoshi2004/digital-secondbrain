const ApiError = require("../utils/ApiError");

const notFoundHandler = (req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found.`));
};

const formatMongooseValidationError = (err) => {
  const details = Object.values(err.errors || {}).map((entry) => ({
    field: entry.path,
    message: entry.message,
  }));

  return {
    statusCode: 400,
    message: details[0]?.message || "Validation failed.",
    details,
  };
};

const formatMongoServerError = (err) => {
  if (err?.code !== 11000) {
    return null;
  }

  const duplicateFields = Object.keys(err.keyPattern || err.keyValue || {});
  const details = duplicateFields.map((field) => ({
    field,
    message: `${field} already exists.`,
  }));

  return {
    statusCode: 409,
    message: details[0]?.message || "A duplicate value already exists.",
    details,
  };
};

const normalizeError = (err) => {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode || 500,
      message: err.message || "Internal server error.",
      details: err.details || [],
    };
  }

  if (err?.name === "ValidationError") {
    return formatMongooseValidationError(err);
  }

  if (err?.name === "CastError") {
    return {
      statusCode: 400,
      message: `${err.path || "Value"} is invalid.`,
      details: [
        {
          field: err.path,
          message: `${err.path || "Value"} is invalid.`,
        },
      ],
    };
  }

  if (err?.type === "entity.parse.failed") {
    return {
      statusCode: 400,
      message: "Request body contains invalid JSON.",
      details: [{ message: "Request body contains invalid JSON." }],
    };
  }

  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      message: "Session expired. Please log in again.",
      details: [],
    };
  }

  const mongoError = formatMongoServerError(err);
  if (mongoError) {
    return mongoError;
  }

  return {
    statusCode: err.statusCode || 500,
    message: err.statusCode && err.statusCode < 500 ? err.message : "Internal server error.",
    details: [],
  };
};

const errorHandler = (err, _req, res, _next) => {
  const normalizedError = normalizeError(err);
  const { statusCode, details } = normalizedError;
  const message =
    statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error."
      : normalizedError.message;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    details,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
