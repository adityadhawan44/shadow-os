import { identityModes } from "../data/seed";

const average = (list) =>
  list.length ? list.reduce((sum, item) => sum + item, 0) / list.length : 0;

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

const formatMoment = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getActiveMode(modeId) {
  return identityModes.find((mode) => mode.id === modeId) ?? identityModes[0];
}

export function computeLifeScore(snapshot) {
  const decisions = snapshot.decisions;
  const mentalStates = snapshot.mentalStates;
  const commitments = snapshot.commitments;

  const decisionAverage = decisions.length
    ? average(decisions.map((decision) => decision.outcomeScore))
    : 50;
  const focusAverage = mentalStates.length
    ? average(mentalStates.map((state) => state.focus * 10))
    : 50;
  const energyAverage = mentalStates.length
    ? average(mentalStates.map((state) => state.energy * 10))
    : 50;

  const completed = commitments.filter((entry) => entry.status === "done").length;
  const missed = commitments.filter((entry) => entry.status === "missed").length;
  const commitmentScore = commitments.length
    ? Math.max(15, ((completed - missed * 0.4) / commitments.length) * 100)
    : 60;

  const total = Math.round(
    decisionAverage * 0.35 +
      focusAverage * 0.25 +
      energyAverage * 0.15 +
      commitmentScore * 0.25,
  );

  return Math.max(0, Math.min(100, total));
}

export function computeShadowGap(snapshot) {
  const identityClaims = snapshot.thoughts.filter((entry) =>
    /discipline|consistent|focus|routine|serious|commit/i.test(entry.text + entry.intent),
  ).length;
  const missed = snapshot.commitments.filter((entry) => entry.status === "missed").length;
  const lowOutcome = snapshot.decisions.filter((entry) => entry.outcomeScore < 45).length;
  const gapScore = Math.min(100, identityClaims * 8 + missed * 14 + lowOutcome * 10);

  let message = "Your intentions and behavior are aligned more often than not.";
  if (gapScore >= 70) {
    message =
      "Your identity language is outrunning your behavior. The system sees promises exceeding proof.";
  } else if (gapScore >= 45) {
    message =
      "There is a visible gap between what you want to be known for and what your recent actions confirm.";
  }

  return { gapScore, message };
}

export function extractPatterns(snapshot) {
  const patterns = [];
  const lateStates = snapshot.mentalStates.filter(
    (entry) => new Date(entry.createdAt).getHours() >= 23,
  );
  if (lateStates.length) {
    const lateFocus = average(lateStates.map((entry) => entry.focus));
    if (lateFocus <= 5) {
      patterns.push(
        `You tend to lose focus late at night. Entries after 11 PM average ${lateFocus.toFixed(1)}/10 focus.`,
      );
    }
  }

  const highSocial = snapshot.mentalStates.filter((entry) => entry.socialMediaMinutes >= 45);
  const lowSocial = snapshot.mentalStates.filter((entry) => entry.socialMediaMinutes <= 20);
  if (highSocial.length && lowSocial.length) {
    const highFocus = average(highSocial.map((entry) => entry.focus));
    const lowFocus = average(lowSocial.map((entry) => entry.focus));
    if (lowFocus > highFocus) {
      patterns.push(
        `Focus improves when social media stays low. Low-scroll days average ${lowFocus.toFixed(1)}/10 focus vs ${highFocus.toFixed(1)}/10 on high-scroll days.`,
      );
    }
  }

  const sleepStrong = snapshot.mentalStates.filter((entry) => entry.sleepHours >= 7);
  const sleepWeak = snapshot.mentalStates.filter((entry) => entry.sleepHours < 6);
  if (sleepStrong.length && sleepWeak.length) {
    const strongEnergy = average(sleepStrong.map((entry) => entry.energy));
    const weakEnergy = average(sleepWeak.map((entry) => entry.energy));
    if (strongEnergy > weakEnergy) {
      patterns.push(
        `Energy is materially better after 7+ hours of sleep. You average ${strongEnergy.toFixed(1)}/10 energy vs ${weakEnergy.toFixed(1)}/10 on short sleep.`,
      );
    }
  }

  const misses = snapshot.commitments.filter((entry) => entry.status === "missed").length;
  if (misses >= 2) {
    patterns.push(
      `Missed commitments are becoming a recurring drag. You have missed ${misses} tracked commitments in this cycle.`,
    );
  }

  if (!patterns.length) {
    patterns.push(
      "The system needs a few more logs to sharpen pattern confidence, but your current inputs already suggest sleep and phone usage are major levers.",
    );
  }

  return patterns;
}

export function buildNudges(snapshot) {
  const latestState = [...snapshot.mentalStates].sort(byNewest)[0];
  const latestDecision = [...snapshot.decisions].sort(byNewest)[0];
  const nudges = [];

  if (latestState && latestState.socialMediaMinutes >= 45) {
    nudges.push("You usually drift after heavy scrolling. Put the phone away for 20 minutes and start one hard task now.");
  }

  if (latestState && latestState.sleepHours < 6) {
    nudges.push("Short sleep is already visible in your behavior. Lower the bar, protect momentum, and avoid fake urgency tonight.");
  }

  if (latestDecision && latestDecision.outcomeScore < 45) {
    nudges.push(
      `Your latest decision backfired: "${latestDecision.title}". Pause before repeating the same pattern today.`,
    );
  }

  if (!nudges.length) {
    nudges.push("You are in a stable window. Use it for deliberate work before the day becomes reactive.");
  }

  return nudges;
}

export function runFutureSimulation(snapshot) {
  const lifeScore = computeLifeScore(snapshot);
  const positiveDecisions = snapshot.decisions.filter(
    (entry) => entry.outcomeScore >= 65,
  ).length;
  const negativeDecisions = snapshot.decisions.filter(
    (entry) => entry.outcomeScore < 45,
  ).length;

  const direction = positiveDecisions >= negativeDecisions ? "upward" : "fragile";
  const sixMonthScore = Math.max(
    10,
    Math.min(95, lifeScore + positiveDecisions * 2 - negativeDecisions * 3),
  );

  return {
    direction,
    sixMonthScore,
    summary:
      direction === "upward"
        ? `If you keep these patterns for six months, your system projects stronger identity consistency and a Life Score near ${sixMonthScore}.`
        : `If nothing changes, the current pattern compounds into more drift. In six months, the system projects a Life Score near ${sixMonthScore} with lower self-trust.`,
    timeline: [
      {
        label: "30 days",
        text:
          direction === "upward"
            ? "Momentum starts feeling normal. Decisions become less emotionally expensive."
            : "You still know what to do, but delay keeps growing and commitments feel heavier.",
      },
      {
        label: "90 days",
        text:
          direction === "upward"
            ? "Identity and action begin matching. Your environment starts supporting discipline instead of fighting it."
            : "Your intent-action gap becomes part of self-image, making recovery harder each week.",
      },
      {
        label: "180 days",
        text:
          direction === "upward"
            ? "You look like the kind of person you keep describing."
            : "You become more predictable to yourself in the wrong direction.",
      },
    ],
  };
}

export function buildWeeklyNarrative(snapshot) {
  const patterns = extractPatterns(snapshot);
  const shadowGap = computeShadowGap(snapshot);
  const mode = getActiveMode(snapshot.user.activeMode);
  return `${snapshot.user.coachVoice} in ${mode.name}: ${patterns[0]} ${shadowGap.message}`;
}

export function getDashboardCards(snapshot) {
  const lifeScore = computeLifeScore(snapshot);
  const shadowGap = computeShadowGap(snapshot);
  const simulation = runFutureSimulation(snapshot);
  return [
    {
      label: "Life Score",
      value: lifeScore,
      note: lifeScore >= 70 ? "Momentum is building." : "The system sees unstable habits.",
    },
    {
      label: "Shadow Gap",
      value: shadowGap.gapScore,
      note: shadowGap.message,
    },
    {
      label: "6-Month Projection",
      value: simulation.sixMonthScore,
      note: simulation.summary,
    },
  ];
}

export function getRecentFeed(snapshot) {
  const items = [
    ...snapshot.thoughts.map((entry) => ({
      id: entry.id,
      type: "Thought",
      createdAt: entry.createdAt,
      text: entry.text,
    })),
    ...snapshot.decisions.map((entry) => ({
      id: entry.id,
      type: "Decision",
      createdAt: entry.createdAt,
      text: `${entry.title}: ${entry.actualOutcome || entry.choice}`,
    })),
    ...snapshot.mentalStates.map((entry) => ({
      id: entry.id,
      type: "State",
      createdAt: entry.createdAt,
      text: `Mood ${entry.mood}/10, energy ${entry.energy}/10, focus ${entry.focus}/10.`,
    })),
  ];

  return items
    .sort(byNewest)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      createdLabel: formatMoment(item.createdAt),
    }));
}

export function exportSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}
