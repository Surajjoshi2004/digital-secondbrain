class ApiError extends Error {
  constructor(statusCode, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
    this.details = Array.isArray(details) ? details : [details].filter(Boolean);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = ApiError;
