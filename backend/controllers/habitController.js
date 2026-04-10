const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const HabitLog = require("../models/HabitLog");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUTCDateOnly = (dateInput) =>
  new Date(
    Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate())
  );

const formatUTCDate = (dateInput) => toUTCDateOnly(dateInput).toISOString().slice(0, 10);

const parseDateInput = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${fieldName} is invalid.`);
  }

  return parsed;
};

const parseNumberInRange = (value, fieldName, min, max) => {
  if (value === undefined) {
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new ApiError(400, `${fieldName} must be a valid number.`);
  }

  if (numeric < min || numeric > max) {
    throw new ApiError(400, `${fieldName} must be between ${min} and ${max}.`);
  }

  return numeric;
};

const parseBooleanInput = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  throw new ApiError(400, `${fieldName} must be a boolean.`);
};

const buildDateRange = ({ fromDate, toDate, fallbackDays = 30 }) => {
  const today = toUTCDateOnly(new Date());

  const end = toDate || today;
  const start =
    fromDate ||
    new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - (fallbackDays - 1)));

  if (start > end) {
    throw new ApiError(400, "from date cannot be after to date.");
  }

  return { start, end };
};

const buildLogByDateMap = (logs) => new Map(logs.map((log) => [formatUTCDate(log.date), log]));

const getConsecutiveStreak = ({ logsByDate, predicate }) => {
  const today = toUTCDateOnly(new Date());
  let streak = 0;

  for (let cursor = new Date(today); ; cursor.setUTCDate(cursor.getUTCDate() - 1)) {
    const key = formatUTCDate(cursor);
    const dailyLog = logsByDate.get(key);

    if (!dailyLog || !predicate(dailyLog)) {
      break;
    }

    streak += 1;
  }

  return streak;
};

const serializeLog = (log) => ({
  id: log._id,
  date: formatUTCDate(log.date),
  gymCompleted: log.gymCompleted,
  studyHours: log.studyHours,
  sleepHours: log.sleepHours,
  note: log.note || "",
  updatedAt: log.updatedAt,
});

const upsertHabitLog = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const logDate = parseDateInput(body.date, "date") || toUTCDateOnly(new Date());
  const gymCompleted = parseBooleanInput(body.gymCompleted, "gymCompleted");
  const studyHours = parseNumberInRange(body.studyHours, "studyHours", 0, 24);
  const sleepHours = parseNumberInRange(body.sleepHours, "sleepHours", 0, 24);
  const note =
    body.note === undefined
      ? undefined
      : typeof body.note === "string"
      ? body.note.trim()
      : null;

  if (note === null) {
    throw new ApiError(400, "note must be a string.");
  }

  const update = {};
  if (gymCompleted !== undefined) {
    update.gymCompleted = gymCompleted;
  }
  if (studyHours !== undefined) {
    update.studyHours = studyHours;
  }
  if (sleepHours !== undefined) {
    update.sleepHours = sleepHours;
  }
  if (note !== undefined) {
    update.note = note;
  }

  if (!Object.keys(update).length) {
    throw new ApiError(
      400,
      "At least one field is required: gymCompleted, studyHours, sleepHours, note."
    );
  }

  const log = await HabitLog.findOneAndUpdate(
    { owner: req.user._id, date: logDate },
    { $set: update, $setOnInsert: { owner: req.user._id, date: logDate } },
    { returnDocument: "after", upsert: true, runValidators: true }
  );

  res.status(200).json(serializeLog(log));
});

const getHabitLogs = asyncHandler(async (req, res) => {
  const fromDate = parseDateInput(req.query.from, "from");
  const toDate = parseDateInput(req.query.to, "to");
  const { start, end } = buildDateRange({ fromDate, toDate, fallbackDays: 30 });

  const logs = await HabitLog.find({
    owner: req.user._id,
    date: { $gte: start, $lte: end },
  }).sort({ date: -1 });

  res.status(200).json({
    from: formatUTCDate(start),
    to: formatUTCDate(end),
    logs: logs.map(serializeLog),
  });
});

const getHabitDashboard = asyncHandler(async (req, res) => {
  const daysInput =
    req.query.days === undefined ? 30 : parseNumberInRange(req.query.days, "days", 1, 365);
  const days = Math.floor(daysInput);
  const studyGoalHours =
    req.query.studyGoalHours === undefined
      ? 1
      : parseNumberInRange(req.query.studyGoalHours, "studyGoalHours", 0, 24);
  const sleepGoalHours =
    req.query.sleepGoalHours === undefined
      ? 7
      : parseNumberInRange(req.query.sleepGoalHours, "sleepGoalHours", 0, 24);

  const { start, end } = buildDateRange({
    fromDate: null,
    toDate: null,
    fallbackDays: days,
  });

  const logs = await HabitLog.find({
    owner: req.user._id,
    date: { $gte: start, $lte: end },
  }).sort({ date: -1 });

  const logsByDate = buildLogByDateMap(logs);
  const totalStudyHours = logs.reduce((acc, entry) => acc + entry.studyHours, 0);
  const totalGymDays = logs.reduce((acc, entry) => acc + (entry.gymCompleted ? 1 : 0), 0);
  const sleepTrackedDays = logs.filter((entry) => entry.sleepHours > 0).length;
  const averageSleepHours =
    sleepTrackedDays === 0
      ? 0
      : logs.reduce((acc, entry) => acc + (entry.sleepHours > 0 ? entry.sleepHours : 0), 0) /
        sleepTrackedDays;

  const streaks = {
    gym: getConsecutiveStreak({
      logsByDate,
      predicate: (entry) => entry.gymCompleted,
    }),
    study: getConsecutiveStreak({
      logsByDate,
      predicate: (entry) => entry.studyHours >= studyGoalHours,
    }),
    sleep: getConsecutiveStreak({
      logsByDate,
      predicate: (entry) => entry.sleepHours >= sleepGoalHours,
    }),
  };

  const todayKey = formatUTCDate(new Date());
  const todayLog = logsByDate.get(todayKey);

  res.status(200).json({
    range: {
      from: formatUTCDate(start),
      to: formatUTCDate(end),
      days,
    },
    goals: {
      studyGoalHours,
      sleepGoalHours,
    },
    today: todayLog
      ? serializeLog(todayLog)
      : {
          date: todayKey,
          gymCompleted: false,
          studyHours: 0,
          sleepHours: 0,
          note: "",
        },
    streaks,
    totals: {
      loggedDays: logs.length,
      gymDays: totalGymDays,
      studyHours: Number(totalStudyHours.toFixed(2)),
      averageSleepHours: Number(averageSleepHours.toFixed(2)),
    },
    recentLogs: logs.slice(0, 10).map(serializeLog),
  });
});

module.exports = {
  getHabitDashboard,
  getHabitLogs,
  upsertHabitLog,
};
