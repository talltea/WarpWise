// services/storage.js — Save/load abstraction (localStorage now, API later)

const STORAGE_KEY = 'weaving-drafts';

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
