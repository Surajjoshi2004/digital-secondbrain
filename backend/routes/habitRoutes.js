const express = require("express");

const {
  getHabitDashboard,
  getHabitLogs,
  upsertHabitLog,
} = require("../controllers/habitController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/dashboard", getHabitDashboard);
router.get("/logs", getHabitLogs);
router.post("/log", upsertHabitLog);

module.exports = router;
