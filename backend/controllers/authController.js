const bcrypt = require("bcryptjs");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const isValidEmail = (email = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email, and password are required.");
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Please provide a valid email address.");
  }

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  });

  const token = generateToken(user._id);
  res.cookie("token", token, COOKIE_OPTIONS);

  res.status(201).json({
    message: "Account created successfully.",
    user: sanitizeUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = generateToken(user._id);
  res.cookie("token", token, COOKIE_OPTIONS);

  res.status(200).json({
    message: "Logged in successfully.",
    user: sanitizeUser(user),
  });
});

const logout = asyncHandler(async (_req, res) => {
  res.cookie("token", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  res.status(200).json({
    message: "Logged out successfully.",
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: sanitizeUser(req.user),
  });
});

module.exports = {
  getCurrentUser,
  login,
  logout,
  register,
};
