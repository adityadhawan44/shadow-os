export const identityModes = [
  {
    id: "beast",
    name: "Beast Mode",
    tone: "Direct, demanding, focused on execution.",
    accent: "ember",
  },
  {
    id: "calm",
    name: "Calm Mode",
    tone: "Grounded, restorative, emotionally steady.",
    accent: "teal",
  },
  {
    id: "business",
    name: "Business Mode",
    tone: "Strategic, clean, outcome-oriented.",
    accent: "blue",
  },
];

export const coachVoices = [
  "Future Self",
  "Aggressive Coach",
  "Calm Advisor",
  "Strategic Mentor",
];

export const defaultUser = {
  name: "Aditya",
  mission: "Build a calmer, sharper, more disciplined self.",
  intent:
    "Stay consistent with deep work, intentional decisions, and less reactive scrolling.",
  coachVoice: "Future Self",
  activeMode: "beast",
};

const now = new Date();
const hoursAgo = (count) =>
  new Date(now.getTime() - count * 60 * 60 * 1000).toISOString();

export const sampleThoughts = [
  {
    id: "thought-1",
    createdAt: hoursAgo(72),
    text: "I want a serious routine, but late-night phone use keeps ruining my mornings.",
    tags: ["discipline", "sleep"],
    intent: "Protect sleep and wake up focused.",
    intensity: 7,
  },
  {
    id: "thought-2",
    createdAt: hoursAgo(26),
    text: "I felt locked in after staying off Instagram before breakfast.",
    tags: ["focus", "social"],
    intent: "Repeat the clean morning setup.",
    intensity: 8,
  },
  {
    id: "thought-3",
    createdAt: hoursAgo(6),
    text: "I keep saying I am disciplined, but I delay hard tasks until the pressure becomes painful.",
    tags: ["identity", "procrastination"],
    intent: "Start before motivation arrives.",
    intensity: 9,
  },
];

export const sampleDecisions = [
  {
    id: "decision-1",
    createdAt: hoursAgo(80),
    title: "Opened social media after midnight",
    category: "focus",
    choice: "Scrolled for 55 minutes instead of sleeping",
    expectedImpact: "negative",
    actualOutcome: "Felt slow and skipped morning planning.",
    confidence: 3,
    outcomeScore: 28,
  },
  {
    id: "decision-2",
    createdAt: hoursAgo(32),
    title: "Worked before checking messages",
    category: "deep work",
    choice: "Protected the first hour for uninterrupted work",
    expectedImpact: "positive",
    actualOutcome: "Finished a key task before 10 AM and felt sharper all day.",
    confidence: 8,
    outcomeScore: 86,
  },
  {
    id: "decision-3",
    createdAt: hoursAgo(9),
    title: "Skipped a planned workout",
    category: "health",
    choice: "Delayed movement because energy felt low",
    expectedImpact: "negative",
    actualOutcome: "Energy never recovered and mood dropped later.",
    confidence: 5,
    outcomeScore: 38,
  },
];

export const sampleMentalStates = [
  {
    id: "state-1",
    createdAt: hoursAgo(81),
    mood: 4,
    energy: 3,
    focus: 2,
    sleepHours: 5,
    socialMediaMinutes: 85,
    note: "Restless night, reactive morning.",
  },
  {
    id: "state-2",
    createdAt: hoursAgo(33),
    mood: 8,
    energy: 8,
    focus: 9,
    sleepHours: 7,
    socialMediaMinutes: 10,
    note: "Clean morning and strong execution.",
  },
  {
    id: "state-3",
    createdAt: hoursAgo(8),
    mood: 5,
    energy: 4,
    focus: 4,
    sleepHours: 6,
    socialMediaMinutes: 65,
    note: "Too many interruptions and delayed start.",
  },
];

export const sampleCommitments = [
  {
    id: "commitment-1",
    title: "Deep work block",
    dueDate: hoursAgo(-8),
    status: "missed",
  },
  {
    id: "commitment-2",
    title: "Sleep before midnight",
    dueDate: hoursAgo(-4),
    status: "done",
  },
  {
    id: "commitment-3",
    title: "Workout",
    dueDate: hoursAgo(-1),
    status: "missed",
  },
];

export const sampleVaultEntries = [
  {
    id: "vault-1",
    createdAt: hoursAgo(20),
    title: "Private fear",
    content: "I am afraid of looking disciplined in public and failing in private.",
  },
];

export const initialData = {
  version: 1,
  user: defaultUser,
  thoughts: sampleThoughts,
  decisions: sampleDecisions,
  mentalStates: sampleMentalStates,
  commitments: sampleCommitments,
  vault: sampleVaultEntries,
};
