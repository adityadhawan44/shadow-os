import { initialData, defaultUser } from "../data/seed";

const STORAGE_KEY = "shadow-os:v1";

const arrayOrEmpty = (value) => (Array.isArray(value) ? value : []);

const stringOrFallback = (value, fallback = "") =>
  typeof value === "string" ? value : fallback;

const numberOrFallback = (value, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function normalizeThought(entry, index) {
  return {
    id: stringOrFallback(entry?.id, `thought-${index}`),
    createdAt: stringOrFallback(entry?.createdAt, new Date().toISOString()),
    text: stringOrFallback(entry?.text),
    tags: arrayOrEmpty(entry?.tags).filter(Boolean),
    intent: stringOrFallback(entry?.intent),
    intensity: Math.min(10, Math.max(1, numberOrFallback(entry?.intensity, 5))),
  };
}

function normalizeDecision(entry, index) {
  return {
    id: stringOrFallback(entry?.id, `decision-${index}`),
    createdAt: stringOrFallback(entry?.createdAt, new Date().toISOString()),
    title: stringOrFallback(entry?.title),
    category: stringOrFallback(entry?.category),
    choice: stringOrFallback(entry?.choice),
    expectedImpact: stringOrFallback(entry?.expectedImpact, "neutral"),
    actualOutcome: stringOrFallback(entry?.actualOutcome),
    confidence: Math.min(10, Math.max(1, numberOrFallback(entry?.confidence, 5))),
    outcomeScore: Math.min(
      100,
      Math.max(0, numberOrFallback(entry?.outcomeScore, 50)),
    ),
  };
}

function normalizeMentalState(entry, index) {
  return {
    id: stringOrFallback(entry?.id, `state-${index}`),
    createdAt: stringOrFallback(entry?.createdAt, new Date().toISOString()),
    mood: Math.min(10, Math.max(1, numberOrFallback(entry?.mood, 5))),
    energy: Math.min(10, Math.max(1, numberOrFallback(entry?.energy, 5))),
    focus: Math.min(10, Math.max(1, numberOrFallback(entry?.focus, 5))),
    sleepHours: Math.min(12, Math.max(0, numberOrFallback(entry?.sleepHours, 7))),
    socialMediaMinutes: Math.min(
      600,
      Math.max(0, numberOrFallback(entry?.socialMediaMinutes, 0)),
    ),
    note: stringOrFallback(entry?.note),
  };
}

function normalizeCommitment(entry, index) {
  return {
    id: stringOrFallback(entry?.id, `commitment-${index}`),
    title: stringOrFallback(entry?.title),
    dueDate: stringOrFallback(entry?.dueDate, new Date().toISOString()),
    status: ["planned", "done", "missed"].includes(entry?.status)
      ? entry.status
      : "planned",
  };
}

function normalizeVaultEntry(entry, index) {
  return {
    id: stringOrFallback(entry?.id, `vault-${index}`),
    createdAt: stringOrFallback(entry?.createdAt, new Date().toISOString()),
    title: stringOrFallback(entry?.title),
    content: stringOrFallback(entry?.content),
  };
}

export function normalizeSnapshot(value) {
  return {
    version: 1,
    user: {
      ...defaultUser,
      ...(typeof value?.user === "object" && value?.user ? value.user : {}),
    },
    thoughts: arrayOrEmpty(value?.thoughts).map(normalizeThought),
    decisions: arrayOrEmpty(value?.decisions).map(normalizeDecision),
    mentalStates: arrayOrEmpty(value?.mentalStates).map(normalizeMentalState),
    commitments: arrayOrEmpty(value?.commitments).map(normalizeCommitment),
    vault: arrayOrEmpty(value?.vault).map(normalizeVaultEntry),
  };
}

export function loadSnapshot() {
  if (typeof window === "undefined") {
    return initialData;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialData;
    }

    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return initialData;
  }
}

export function saveSnapshot(snapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSnapshot(snapshot)));
}

export function clearSnapshot() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
