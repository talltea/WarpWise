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
    loom: {
      shafts, treadles, warpCount, weftCount,
      epi: overrides.epi ?? null,
      ppi: overrides.ppi ?? null,
    },
    threading: overrides.threading ?? createStraightDraw(warpCount, shafts),
    tieup: overrides.tieup ?? createDefaultTieup(shafts, treadles),
    treadling: overrides.treadling ?? createDefaultTreadling(weftCount),
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

/**
 * Build a tie-up from a readable mapping of treadle -> shaft numbers.
 * Example: { 0: [0, 2], 1: [1, 3] } means treadle 0 raises shafts 0 and 2.
 */
export function tieupFromMap(shafts, treadles, map) {
  const tieup = Array.from({ length: shafts }, () => Array(treadles).fill(false));
  for (const [treadle, shaftList] of Object.entries(map)) {
    for (const s of shaftList) {
      tieup[s][Number(treadle)] = true;
    }
  }
  return tieup;
}

// Default tie-up: twill + tabby
//   treadle (0-indexed) -> shafts raised
export function createDefaultTieup(shafts, treadles) {
  return tieupFromMap(shafts, treadles, {
    0: [0, 2],  // treadle 1
    1: [1, 3],  // treadle 2
    2: [0, 1],  // treadle 3
    3: [1, 2],  // treadle 4
    4: [2, 3],  // treadle 5
    5: [3, 0],  // treadle 6
  });
}

/**
 * Build a treadling sequence from an array of treadle indices (0-based),
 * repeated to fill the given count.
 */
export function createRepeatingTreadling(count, sequence) {
  return Array.from({ length: count }, (_, i) => sequence[i % sequence.length]);
}

// Default treadling: treadles 3-4-5-6 (0-indexed: 2,3,4,5)
export function createDefaultTreadling(count) {
  return createRepeatingTreadling(count, [2, 3, 4, 5]);
}

/**
 * Resize a draft to new loom/project dimensions.
 * Preserves existing data where possible, fills new cells with defaults.
 */
export function resizeDraft(draft, { shafts, treadles, warpCount, weftCount, epi, ppi }) {
  const oldLoom = draft.loom;

  // --- Shafts ---
  if (shafts !== oldLoom.shafts) {
    // Resize tieup rows
    if (shafts > oldLoom.shafts) {
      for (let s = oldLoom.shafts; s < shafts; s++) {
        draft.tieup.push(Array(oldLoom.treadles).fill(false));
      }
    } else {
      draft.tieup.length = shafts;
    }
    // Clamp threading values
    for (let i = 0; i < draft.threading.length; i++) {
      if (draft.threading[i] >= shafts) draft.threading[i] = draft.threading[i] % shafts;
    }
    oldLoom.shafts = shafts;
  }

  // --- Treadles ---
  if (treadles !== oldLoom.treadles) {
    for (let s = 0; s < draft.tieup.length; s++) {
      if (treadles > oldLoom.treadles) {
        draft.tieup[s] = [...draft.tieup[s], ...Array(treadles - oldLoom.treadles).fill(false)];
      } else {
        draft.tieup[s].length = treadles;
      }
    }
    // Clamp treadling values
    for (let i = 0; i < draft.treadling.length; i++) {
      if (draft.treadling[i] >= treadles) draft.treadling[i] = draft.treadling[i] % treadles;
    }
    oldLoom.treadles = treadles;
  }

  // --- Warp count ---
  if (warpCount !== oldLoom.warpCount) {
    if (warpCount > oldLoom.warpCount) {
      for (let i = oldLoom.warpCount; i < warpCount; i++) {
        draft.threading.push(i % shafts);
        draft.warpColors.push(draft.warpColors[oldLoom.warpCount - 1] ?? '#000000');
      }
    } else {
      draft.threading.length = warpCount;
      draft.warpColors.length = warpCount;
    }
    oldLoom.warpCount = warpCount;
  }

  // --- Weft count ---
  if (weftCount !== oldLoom.weftCount) {
    if (weftCount > oldLoom.weftCount) {
      for (let i = oldLoom.weftCount; i < weftCount; i++) {
        draft.treadling.push(i % treadles);
        draft.weftColors.push(draft.weftColors[oldLoom.weftCount - 1] ?? '#ffffff');
      }
    } else {
      draft.treadling.length = weftCount;
      draft.weftColors.length = weftCount;
    }
    oldLoom.weftCount = weftCount;
  }

  // --- Optional metadata ---
  oldLoom.epi = epi;
  oldLoom.ppi = ppi;

  return draft;
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
