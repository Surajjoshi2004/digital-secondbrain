const Note = require("../models/Note");

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "will",
  "with",
  "you",
  "your",
]);

const normalizeWord = (word) => word.toLowerCase().replace(/[^a-z0-9]/g, "");

const CONCEPT_GROUPS = [
  ["recursion", "recursive", "backtracking", "dfs", "depthfirstsearch"],
  ["graph", "graphs", "node", "nodes", "edge", "edges", "tree", "trees"],
  ["dynamicprogramming", "dp", "memoization", "tabulation"],
  ["array", "arrays", "twopointer", "slidingwindow"],
  ["stack", "queue", "bfs", "breadthfirstsearch"],
];

const CONCEPT_ALIASES = CONCEPT_GROUPS.reduce((aliases, group) => {
  for (const term of group) {
    aliases[term] = group.filter((candidate) => candidate !== term);
  }

  return aliases;
}, {});

const stemWord = (word) => {
  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith("ing") && word.length > 5) {
    return word.slice(0, -3);
  }

  if (word.endsWith("ed") && word.length > 4) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s") && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
};

const tokenize = (text = "") =>
  text
    .split(/\s+/)
    .map(normalizeWord)
    .map(stemWord)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

const addWeightedTokens = (tokenMap, tokens, weight) => {
  for (const token of tokens) {
    tokenMap[token] = Math.max(tokenMap[token] || 0, weight);

    const aliases = CONCEPT_ALIASES[token] || [];
    for (const alias of aliases) {
      tokenMap[alias] = Math.max(tokenMap[alias] || 0, weight * 0.85);
    }
  }
};

const extractKeywordProfile = ({ title = "", content = "", tags = [] }) => {
  const tokenWeights = {};

  addWeightedTokens(tokenWeights, tokenize(title), 3);
  addWeightedTokens(tokenWeights, tokenize(tags.join(" ")), 2.5);
  addWeightedTokens(tokenWeights, tokenize(content), 1);

  return tokenWeights;
};

const extractKeywords = ({ title = "", content = "", tags = [] }) => {
  const weightedKeywords = extractKeywordProfile({ title, content, tags });

  return Object.keys(weightedKeywords);
};

const hasManualLink = (note, targetId) =>
  (note.manualLinks || []).some((entry) => entry.toString() === targetId.toString());

const mergeRelationshipMetadata = (autoRelationship, isManual) => {
  if (!autoRelationship && !isManual) {
    return null;
  }

  const sharedKeywords = autoRelationship?.sharedKeywords || [];

  return {
    score: isManual ? Math.max(autoRelationship?.score || 0, 0.99) : autoRelationship.score,
    sharedKeywords: isManual
      ? [...new Set(["manual-link", ...sharedKeywords])].slice(0, 10)
      : sharedKeywords,
    isManual,
  };
};

const buildRelationship = (sourceNote, targetNote) => {
  const sourceKeywords = new Set(sourceNote.keywords || []);
  const targetKeywords = new Set(targetNote.keywords || []);

  const sharedKeywords = [...sourceKeywords].filter((keyword) =>
    targetKeywords.has(keyword)
  );

  const sourceProfile = extractKeywordProfile(sourceNote);
  const targetProfile = extractKeywordProfile(targetNote);

  const totalUnique = new Set([
    ...(sourceNote.keywords || []),
    ...(targetNote.keywords || []),
  ]).size;

  const sharedWeight = sharedKeywords.reduce((total, keyword) => {
    return total + Math.min(sourceProfile[keyword] || 0, targetProfile[keyword] || 0);
  }, 0);

  const titleOverlap = tokenize(sourceNote.title).filter((token) =>
    new Set(tokenize(targetNote.title)).has(token)
  );

  const directKeywordScore = totalUnique ? sharedWeight / totalUnique : 0;
  const titleBoost = titleOverlap.length ? 0.2 : 0;
  const tagOverlap = (sourceNote.tags || []).filter((tag) =>
    new Set((targetNote.tags || []).map((item) => item.toLowerCase())).has(
      tag.toLowerCase()
    )
  ).length;
  const tagBoost = tagOverlap ? Math.min(tagOverlap * 0.12, 0.24) : 0;
  const conceptBoost = sharedKeywords.some((keyword) =>
    Object.prototype.hasOwnProperty.call(CONCEPT_ALIASES, keyword)
  )
    ? 0.18
    : 0;

  const score = Number(
    Math.min(directKeywordScore + titleBoost + tagBoost + conceptBoost, 0.98).toFixed(2)
  );

  if (sharedKeywords.length < 1 || score < 0.18) {
    return null;
  }

  return {
    score,
    sharedKeywords: sharedKeywords.slice(0, 10),
  };
};

const syncRelationshipsForNote = async (noteId, ownerId) => {
  const sourceNote = await Note.findOne({
    _id: noteId,
    owner: ownerId,
  }).select("+keywords +manualLinks");

  if (!sourceNote) {
    return null;
  }

  await Note.updateMany(
    { owner: ownerId, "relatedNotes.note": sourceNote._id },
    { $pull: { relatedNotes: { note: sourceNote._id } } }
  );

  sourceNote.relatedNotes = [];

  const candidateNotes = await Note.find({
    _id: { $ne: sourceNote._id },
    owner: ownerId,
  }).select("+keywords +manualLinks");

  const sourceRelationships = [];

  for (const candidate of candidateNotes) {
    const autoRelationship = buildRelationship(sourceNote, candidate);
    const relationship = mergeRelationshipMetadata(
      autoRelationship,
      hasManualLink(sourceNote, candidate._id) || hasManualLink(candidate, sourceNote._id)
    );

    if (!relationship) {
      continue;
    }

    sourceRelationships.push({
      note: candidate._id,
      ...relationship,
      linkedAt: new Date(),
    });

    candidate.relatedNotes = [
      ...candidate.relatedNotes.filter(
        (entry) => entry.note.toString() !== sourceNote._id.toString()
      ),
      {
        note: sourceNote._id,
        ...relationship,
        linkedAt: new Date(),
      },
    ];

    await candidate.save();
  }

  sourceNote.relatedNotes = sourceRelationships.sort((a, b) => b.score - a.score);
  await sourceNote.save();

  return sourceNote;
};

const removeRelationshipsForNote = async (noteId, ownerId) => {
  await Note.updateMany(
    { owner: ownerId, "relatedNotes.note": noteId },
    { $pull: { relatedNotes: { note: noteId } } }
  );
};

const buildGraph = async (ownerId) => {
  const notes = await Note.find({ owner: ownerId }).populate(
    "relatedNotes.note",
    "title tags"
  );

  const nodes = notes.map((note) => ({
    id: note._id.toString(),
    title: note.title,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));

  const seenEdges = new Set();
  const edges = [];

  for (const note of notes) {
    for (const relation of note.relatedNotes) {
      if (!relation.note) {
        continue;
      }

      const source = note._id.toString();
      const target = relation.note._id.toString();
      const edgeKey = [source, target].sort().join(":");

      if (seenEdges.has(edgeKey)) {
        continue;
      }

      seenEdges.add(edgeKey);
      edges.push({
        source,
        target,
        score: relation.score,
        sharedKeywords: relation.sharedKeywords,
      });
    }
  }

  return { nodes, edges };
};

const rebuildAllRelationships = async (ownerId) => {
  const notes = await Note.find({ owner: ownerId }).select("+keywords +manualLinks");

  for (const note of notes) {
    note.keywords = extractKeywords(note);
    note.relatedNotes = [];
    await note.save();
  }

  for (const note of notes) {
    await syncRelationshipsForNote(note._id, ownerId);
  }
};

module.exports = {
  buildGraph,
  extractKeywords,
  rebuildAllRelationships,
  removeRelationshipsForNote,
  syncRelationshipsForNote,
};
