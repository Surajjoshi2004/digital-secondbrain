const express = require("express");

const {
  createNote,
  createManualLink,
  deleteManualLink,
  deleteNote,
  getAllNotes,
  getKnowledgeGraph,
  getNoteById,
  getRelatedNotes,
  rebuildLinks,
  updateNote,
} = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/graph", getKnowledgeGraph);
router.post("/rebuild-links", rebuildLinks);
router.get("/", getAllNotes);
router.post("/", createNote);
router.post("/:id/links", createManualLink);
router.delete("/:id/links/:targetId", deleteManualLink);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);
router.get("/:id/related", getRelatedNotes);
router.delete("/:id", deleteNote);

module.exports = router;
