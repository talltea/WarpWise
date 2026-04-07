// services/storage.js — Save/load abstraction (localStorage now, API later)

const STORAGE_KEY = 'weaving-drafts';
const PATTERNS_KEY = 'weaving-patterns';

function getAllDrafts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function setAllDrafts(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export const StorageService = {
  async listDrafts() {
    const drafts = getAllDrafts();
    return Object.values(drafts)
      .map(d => ({ id: d.id, name: d.name, updatedAt: d.updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async loadDraft(id) {
    const drafts = getAllDrafts();
    return drafts[id] ?? null;
  },

  async saveDraft(draft) {
    const drafts = getAllDrafts();
    draft.updatedAt = new Date().toISOString();
    drafts[draft.id] = draft;
    setAllDrafts(drafts);
  },

  async deleteDraft(id) {
    const drafts = getAllDrafts();
    delete drafts[id];
    setAllDrafts(drafts);
  },
};

// --- Pattern Library ---

function getAllPatterns() {
  const raw = localStorage.getItem(PATTERNS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function setAllPatterns(patterns) {
  localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
}

export const PatternLibrary = {
  list(type) {
    const all = getAllPatterns();
    return Object.values(all)
      .filter(p => !type || p.type === type)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  save(pattern) {
    const all = getAllPatterns();
    if (!pattern.id) pattern.id = crypto.randomUUID();
    pattern.createdAt = pattern.createdAt ?? new Date().toISOString();
    all[pattern.id] = pattern;
    setAllPatterns(all);
    return pattern;
  },

  delete(id) {
    const all = getAllPatterns();
    delete all[id];
    setAllPatterns(all);
  },
};
