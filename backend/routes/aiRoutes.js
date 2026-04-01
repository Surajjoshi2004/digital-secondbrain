const express = require("express");

const {
  getForgottenIdeas,
  suggestContent,
  suggestRelatedNotes,
} = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/suggest-content", suggestContent);
router.post("/recommend-related", suggestRelatedNotes);
router.get("/forgotten-ideas", getForgottenIdeas);

module.exports = router;
