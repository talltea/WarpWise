// model/draft.js — Draft creation, validation, defaults

export function createDraft(overrides = {}) {
  const shafts = overrides.shafts ?? 4;
  const treadles = overrides.treadles ?? 6;
  const warpCount = overrides.warpCount ?? 60;
  const weftCount = overrides.weftCount ?? 60;

  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Untitled Draft',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    loom: { shafts, treadles, warpCount, weftCount },
    threading: overrides.threading ?? createStraightDraw(warpCount, shafts),
    tieup: overrides.tieup ?? createPlainWeaveTieup(shafts, treadles),
    treadling: overrides.treadling ?? createStraightTreadling(weftCount, treadles),
    warpColors: overrides.warpColors ?? Array(warpCount).fill('#000000'),
    weftColors: overrides.weftColors ?? Array(weftCount).fill('#ffffff'),
    palette: overrides.palette ?? ['#000000', '#ffffff', '#cc0000', '#0066cc', '#339933', '#ff9900'],
    progress: overrides.progress ?? { currentThread: -1, currentPick: -1 },
  };
}

// 0-1-2-3-0-1-2-3...
export function createStraightDraw(count, shafts) {
  return Array.from({ length: count }, (_, i) => i % shafts);
}

// Plain weave: shaft 0 on treadle 0, shaft 1 on treadle 1, alternating
export function createPlainWeaveTieup(shafts, treadles) {
  const tieup = Array.from({ length: shafts }, () => Array(treadles).fill(false));
  // Even shafts tied to treadle 0, odd shafts tied to treadle 1
  for (let s = 0; s < shafts; s++) {
    tieup[s][s % 2] = true;
  }
  return tieup;
}

// 0-1-2-3-4-5-0-1-2-3-4-5...
export function createStraightTreadling(count, treadles) {
  return Array.from({ length: count }, (_, i) => i % treadles);
}

export function validateDraft(draft) {
  const { loom, threading, tieup, treadling, warpColors, weftColors } = draft;
  const errors = [];

  if (loom.shafts < 2 || loom.shafts > 32) errors.push('Shafts must be 2–32');
  if (loom.treadles < 2 || loom.treadles > 32) errors.push('Treadles must be 2–32');
  if (threading.length !== loom.warpCount) errors.push('Threading length must match warp count');
  if (treadling.length !== loom.weftCount) errors.push('Treadling length must match weft count');
  if (tieup.length !== loom.shafts) errors.push('Tie-up rows must match shaft count');
  if (tieup[0]?.length !== loom.treadles) errors.push('Tie-up columns must match treadle count');
  if (warpColors.length !== loom.warpCount) errors.push('Warp colors length must match warp count');
  if (weftColors.length !== loom.weftCount) errors.push('Weft colors length must match weft count');

  if (threading.some(s => s < 0 || s >= loom.shafts)) errors.push('Threading values out of range');
  if (treadling.some(t => t < 0 || t >= loom.treadles)) errors.push('Treadling values out of range');

  return { valid: errors.length === 0, errors };
}
