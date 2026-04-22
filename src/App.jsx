import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { coachVoices, identityModes, initialData } from "./data/seed";
import {
  buildNudges,
  buildWeeklyNarrative,
  computeLifeScore,
  computeShadowGap,
  createId,
  exportSnapshot,
  getActiveMode,
  getDashboardCards,
  getRecentFeed,
  extractPatterns,
  runFutureSimulation,
} from "./lib/engine";
import {
  isFirebaseConfigured,
  pullRemoteSnapshot,
  pushRemoteSnapshot,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeToAuth,
} from "./lib/firebase";
import {
  clearSnapshot,
  loadSnapshot,
  normalizeSnapshot,
  saveSnapshot,
} from "./lib/storage";

const defaultThoughtForm = {
  text: "",
  intent: "",
  tags: "",
  intensity: 6,
};

const defaultDecisionForm = {
  title: "",
  category: "",
  choice: "",
  expectedImpact: "positive",
  actualOutcome: "",
  confidence: 6,
  outcomeScore: 70,
};

const defaultStateForm = {
  mood: 6,
  energy: 6,
  focus: 6,
  sleepHours: 7,
  socialMediaMinutes: 20,
  note: "",
};

const defaultCommitmentForm = {
  title: "",
  dueDate: "",
  status: "planned",
};

const defaultVaultForm = {
  title: "",
  content: "",
};

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "log", label: "Log Center" },
  { id: "intelligence", label: "Intelligence" },
  { id: "vault", label: "Private Vault" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const [snapshot, setSnapshot] = useState(() => loadSnapshot());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [thoughtForm, setThoughtForm] = useState(defaultThoughtForm);
  const [decisionForm, setDecisionForm] = useState(defaultDecisionForm);
  const [stateForm, setStateForm] = useState(defaultStateForm);
  const [commitmentForm, setCommitmentForm] = useState(defaultCommitmentForm);
  const [vaultForm, setVaultForm] = useState(defaultVaultForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [isVaultVisible, setIsVaultVisible] = useState(false);
  const [feedQuery, setFeedQuery] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState("Local-only mode");
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const deferredFeedQuery = useDeferredValue(feedQuery);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    saveSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!firebaseReady) {
      return undefined;
    }

    const unsubscribe = subscribeToAuth(async (user) => {
      setAuthUser(user);

      if (!user) {
        setRemoteStatus("Signed out. Local mode remains active.");
        return;
      }

      setRemoteStatus("Connected to Firebase.");
      setIsSyncing(true);
      try {
        const remote = await pullRemoteSnapshot(user.uid);
        if (remote) {
          setSnapshot((current) => {
            const remoteSnapshot = normalizeSnapshot(remote);
            const localCount =
              current.thoughts.length +
              current.decisions.length +
              current.mentalStates.length +
              current.commitments.length +
              current.vault.length;
            const remoteCount =
              remoteSnapshot.thoughts.length +
              remoteSnapshot.decisions.length +
              remoteSnapshot.mentalStates.length +
              remoteSnapshot.commitments.length +
              remoteSnapshot.vault.length;

            return remoteCount >= localCount ? remoteSnapshot : current;
          });
          setStatusMessage("Remote workspace loaded.");
        }
      } catch {
        setRemoteStatus("Firebase connected, but remote sync could not load.");
      } finally {
        setIsSyncing(false);
      }
    });

    return unsubscribe;
  }, [firebaseReady]);

  useEffect(() => {
    if (!firebaseReady || !authUser) {
      return;
    }

    let cancelled = false;
    const sync = async () => {
      setIsSyncing(true);
      try {
        await pushRemoteSnapshot(authUser.uid, snapshot);
        if (!cancelled) {
          setRemoteStatus("Synced to Firestore.");
        }
      } catch {
        if (!cancelled) {
          setRemoteStatus("Sync failed. Local data is still safe.");
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    };

    const timeout = window.setTimeout(sync, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [authUser, firebaseReady, snapshot]);

  const scheduleToastClear = useEffectEvent(() => {
    window.clearTimeout(scheduleToastClear.timeoutId);
    scheduleToastClear.timeoutId = window.setTimeout(() => {
      setStatusMessage("");
    }, 2600);
  });

  useEffect(() => {
    if (statusMessage) {
      scheduleToastClear();
    }
  }, [statusMessage, scheduleToastClear]);

  const activeMode = getActiveMode(snapshot.user.activeMode);
  const dashboardCards = getDashboardCards(snapshot);
  const patterns = extractPatterns(snapshot);
  const nudges = buildNudges(snapshot);
  const simulation = runFutureSimulation(snapshot);
  const shadowGap = computeShadowGap(snapshot);
  const feed = getRecentFeed(snapshot).filter((item) => {
    const query = deferredFeedQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return `${item.type} ${item.text}`.toLowerCase().includes(query);
  });

  function updateSnapshot(updater, message) {
    setSnapshot((current) => normalizeSnapshot(updater(current)));
    if (message) {
      setStatusMessage(message);
    }
  }

  function handleProfileChange(field, value) {
    updateSnapshot(
      (current) => ({
        ...current,
        user: {
          ...current.user,
          [field]: value,
        },
      }),
      null,
    );
  }

  function handleThoughtSubmit(event) {
    event.preventDefault();
    if (!thoughtForm.text.trim()) {
      setStatusMessage("Thought text is required.");
      return;
    }

    updateSnapshot(
      (current) => ({
        ...current,
        thoughts: [
          {
            id: createId("thought"),
            createdAt: new Date().toISOString(),
            text: thoughtForm.text.trim(),
            intent: thoughtForm.intent.trim(),
            tags: thoughtForm.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            intensity: Number(thoughtForm.intensity),
          },
          ...current.thoughts,
        ],
      }),
      "Thought captured.",
    );
    setThoughtForm(defaultThoughtForm);
    startTransition(() => setActiveTab("dashboard"));
  }

  function handleDecisionSubmit(event) {
    event.preventDefault();
    if (!decisionForm.title.trim() || !decisionForm.choice.trim()) {
      setStatusMessage("Decision title and choice are required.");
      return;
    }

    updateSnapshot(
      (current) => ({
        ...current,
        decisions: [
          {
            id: createId("decision"),
            createdAt: new Date().toISOString(),
            title: decisionForm.title.trim(),
            category: decisionForm.category.trim(),
            choice: decisionForm.choice.trim(),
            expectedImpact: decisionForm.expectedImpact,
            actualOutcome: decisionForm.actualOutcome.trim(),
            confidence: Number(decisionForm.confidence),
            outcomeScore: Number(decisionForm.outcomeScore),
          },
          ...current.decisions,
        ],
      }),
      "Decision tracked.",
    );
    setDecisionForm(defaultDecisionForm);
  }

  function handleStateSubmit(event) {
    event.preventDefault();
    updateSnapshot(
      (current) => ({
        ...current,
        mentalStates: [
          {
            id: createId("state"),
            createdAt: new Date().toISOString(),
            mood: Number(stateForm.mood),
            energy: Number(stateForm.energy),
            focus: Number(stateForm.focus),
            sleepHours: Number(stateForm.sleepHours),
            socialMediaMinutes: Number(stateForm.socialMediaMinutes),
            note: stateForm.note.trim(),
          },
          ...current.mentalStates,
        ],
      }),
      "Mental state logged.",
    );
    setStateForm(defaultStateForm);
  }

  function handleCommitmentSubmit(event) {
    event.preventDefault();
    if (!commitmentForm.title.trim()) {
      setStatusMessage("Commitment title is required.");
      return;
    }

    updateSnapshot(
      (current) => ({
        ...current,
        commitments: [
          {
            id: createId("commitment"),
            title: commitmentForm.title.trim(),
            dueDate: commitmentForm.dueDate || new Date().toISOString(),
            status: commitmentForm.status,
          },
          ...current.commitments,
        ],
      }),
      "Commitment added.",
    );
    setCommitmentForm(defaultCommitmentForm);
  }

  function handleVaultSubmit(event) {
    event.preventDefault();
    if (!vaultForm.title.trim() || !vaultForm.content.trim()) {
      setStatusMessage("Vault title and content are required.");
      return;
    }

    updateSnapshot(
      (current) => ({
        ...current,
        vault: [
          {
            id: createId("vault"),
            createdAt: new Date().toISOString(),
            title: vaultForm.title.trim(),
            content: vaultForm.content.trim(),
          },
          ...current.vault,
        ],
      }),
      "Vault entry stored.",
    );
    setVaultForm(defaultVaultForm);
  }

  function handleExport() {
    const blob = new Blob([exportSnapshot(snapshot)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shadow-os-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Backup exported.");
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setSnapshot(normalizeSnapshot(parsed));
        setStatusMessage("Backup imported.");
      } catch {
        setStatusMessage("Import failed. Use a valid Shadow OS backup.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleReset() {
    clearSnapshot();
    setSnapshot(initialData);
    setStatusMessage("Workspace reset to the seeded demo state.");
  }

  async function handleSignIn() {
    try {
      await signInWithGoogle();
      setStatusMessage("Signed in with Google.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Sign-in could not complete.",
      );
    }
  }

  async function handleSignOut() {
    try {
      await signOutFromFirebase();
      setStatusMessage("Signed out.");
    } catch {
      setStatusMessage("Sign-out could not complete.");
    }
  }

  async function handleAiReflection() {
    setIsAiLoading(true);
    setAiResult(null);

    try {
      const summary = [
        buildWeeklyNarrative(snapshot),
        ...patterns.slice(0, 3),
        ...nudges.slice(0, 2),
        `Life Score: ${computeLifeScore(snapshot)}`,
      ].join(" ");

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: snapshot.user,
          summary,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI reflection failed.");
      }

      setAiResult(data.result);
      setStatusMessage("AI reflection generated.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "AI reflection failed.",
      );
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <div className={`app-shell mode-${activeMode.id}`}>
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div className="hero-topline">
          <div>
            <div className="eyebrow">Behavioral operating system</div>
            <h1>Shadow OS</h1>
          </div>
          <div className="status-cluster">
            <span className="status-chip">{activeMode.name}</span>
            <span className="status-chip">{snapshot.user.coachVoice}</span>
          </div>
        </div>

        <p className="hero-copy">
          A self-evolving system that learns your behavior, predicts outcomes,
          exposes your intent-action gap, and nudges you before the pattern wins.
        </p>

        <div className="hero-actions">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? "primary" : "secondary"}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hero-meta">
          <div className="auth-card">
            <span className="section-tag">Production mode</span>
            <h3>Identity and sync</h3>
            <p>
              {firebaseReady
                ? authUser
                  ? `Signed in as ${authUser.displayName || authUser.email || "user"}`
                  : "Firebase is configured. Sign in to sync your system across devices."
                : "Firebase env keys are missing, so the app stays in reliable local mode."}
            </p>
            <div className="inline-fields">
              {firebaseReady ? (
                authUser ? (
                  <button className="secondary" type="button" onClick={handleSignOut}>
                    Sign out
                  </button>
                ) : (
                  <button className="primary" type="button" onClick={handleSignIn}>
                    Sign in with Google
                  </button>
                )
              ) : null}
              <span className="status-chip">
                {isSyncing ? "Syncing..." : remoteStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-grid">
          {dashboardCards.map((card) => (
            <section key={card.label} className="card score-card">
              <span className="card-label">{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.note}</p>
            </section>
          ))}
        </div>
      </header>

      <main className="content">
        {statusMessage ? <div className="toast">{statusMessage}</div> : null}

        {activeTab === "dashboard" ? (
          <>
            <section className="panel">
              <div className="section-intro">
                <div>
                  <span className="section-tag">Weekly narrative</span>
                  <h2>{snapshot.user.name}'s system readout</h2>
                </div>
                <p className="support-copy">{buildWeeklyNarrative(snapshot)}</p>
              </div>
              <div className="feature-grid">
                <article className="feature-card">
                  <h3>Pattern Extraction Engine</h3>
                  <div className="stack-list">
                    {patterns.map((pattern) => (
                      <div key={pattern} className="feed-item">
                        {pattern}
                      </div>
                    ))}
                  </div>
                </article>
                <article className="feature-card">
                  <h3>Behavioral Nudges</h3>
                  <div className="stack-list">
                    {nudges.map((nudge) => (
                      <div key={nudge} className="feed-item">
                        {nudge}
                      </div>
                    ))}
                  </div>
                </article>
                <article className="feature-card">
                  <h3>Shadow vs Real You</h3>
                  <p className="big-stat">{shadowGap.gapScore}</p>
                  <p>{shadowGap.message}</p>
                </article>
              </div>
            </section>

            <section className="panel two-column">
              <article className="panel-card">
                <span className="section-tag">Future simulation</span>
                <h2>{simulation.summary}</h2>
                <div className="timeline">
                  {simulation.timeline.map((step) => (
                    <div key={step.label} className="timeline-item">
                      <strong>{step.label}</strong>
                      <p>{step.text}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <div className="section-row">
                  <div>
                    <span className="section-tag">Recent feed</span>
                    <h2>System memory</h2>
                  </div>
                  <input
                    className="search-input"
                    value={feedQuery}
                    onChange={(event) => setFeedQuery(event.target.value)}
                    placeholder="Search feed"
                  />
                </div>
                <div className="feed-list">
                  {feed.map((item) => (
                    <div key={item.id} className="feed-item">
                      <span className="micro-label">
                        {item.type} · {item.createdLabel}
                      </span>
                      <div>{item.text}</div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel two-column">
              <article className="panel-card">
                <span className="section-tag">AI reflection</span>
                <h2>Secure server-side coaching</h2>
                <p>
                  This uses the Vercel `/api/coach` endpoint so your API key stays on the
                  server, not in the browser.
                </p>
                <div className="action-column">
                  <button
                    className="primary"
                    type="button"
                    onClick={handleAiReflection}
                    disabled={isAiLoading}
                  >
                    {isAiLoading ? "Generating..." : "Generate AI Reflection"}
                  </button>
                </div>
              </article>

              <article className="panel-card">
                <span className="section-tag">Coach output</span>
                <h2>Adaptive response</h2>
                {aiResult ? (
                  <div className="stack-list">
                    <div className="feed-item">
                      <span className="micro-label">Reflection</span>
                      <div>{aiResult.reflection}</div>
                    </div>
                    <div className="feed-item">
                      <span className="micro-label">Nudge</span>
                      <div>{aiResult.nudge}</div>
                    </div>
                    <div className="feed-item">
                      <span className="micro-label">Risk</span>
                      <div>{aiResult.risk}</div>
                    </div>
                    <div className="feed-item">
                      <span className="micro-label">Next step</span>
                      <div>{aiResult.next_step}</div>
                    </div>
                  </div>
                ) : (
                  <div className="feed-item">
                    Generate a reflection after deployment with `OPENAI_API_KEY` configured.
                  </div>
                )}
              </article>
            </section>
          </>
        ) : null}

        {activeTab === "log" ? (
          <section className="panel log-grid">
            <article className="panel-card">
              <span className="section-tag">Thought logging</span>
              <h2>Capture identity, pressure, and intent</h2>
              <form className="form-grid" onSubmit={handleThoughtSubmit}>
                <textarea
                  value={thoughtForm.text}
                  onChange={(event) =>
                    setThoughtForm((current) => ({
                      ...current,
                      text: event.target.value,
                    }))
                  }
                  placeholder="What are you thinking right now?"
                />
                <input
                  value={thoughtForm.intent}
                  onChange={(event) =>
                    setThoughtForm((current) => ({
                      ...current,
                      intent: event.target.value,
                    }))
                  }
                  placeholder="What do you want instead?"
                />
                <input
                  value={thoughtForm.tags}
                  onChange={(event) =>
                    setThoughtForm((current) => ({
                      ...current,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="Tags, comma separated"
                />
                <label className="range-label">
                  Intensity
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={thoughtForm.intensity}
                    onChange={(event) =>
                      setThoughtForm((current) => ({
                        ...current,
                        intensity: event.target.value,
                      }))
                    }
                  />
                </label>
                <button className="primary" type="submit">
                  Save Thought
                </button>
              </form>
            </article>

            <article className="panel-card">
              <span className="section-tag">Decision tracker</span>
              <h2>Store choices and their real outcomes</h2>
              <form className="form-grid" onSubmit={handleDecisionSubmit}>
                <input
                  value={decisionForm.title}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Decision title"
                />
                <input
                  value={decisionForm.category}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Category"
                />
                <textarea
                  value={decisionForm.choice}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      choice: event.target.value,
                    }))
                  }
                  placeholder="What did you choose?"
                />
                <textarea
                  value={decisionForm.actualOutcome}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      actualOutcome: event.target.value,
                    }))
                  }
                  placeholder="What happened next?"
                />
                <div className="inline-fields">
                  <select
                    value={decisionForm.expectedImpact}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        expectedImpact: event.target.value,
                      }))
                    }
                  >
                    <option value="positive">Expected positive</option>
                    <option value="neutral">Expected neutral</option>
                    <option value="negative">Expected negative</option>
                  </select>
                  <label className="range-label">
                    Confidence
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={decisionForm.confidence}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          confidence: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="range-label">
                    Outcome score
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={decisionForm.outcomeScore}
                      onChange={(event) =>
                        setDecisionForm((current) => ({
                          ...current,
                          outcomeScore: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <button className="primary" type="submit">
                  Save Decision
                </button>
              </form>
            </article>

            <article className="panel-card">
              <span className="section-tag">Mental state log</span>
              <h2>Record mood, energy, focus, sleep, and scroll</h2>
              <form className="form-grid" onSubmit={handleStateSubmit}>
                <div className="inline-fields">
                  {[
                    ["Mood", "mood", 10],
                    ["Energy", "energy", 10],
                    ["Focus", "focus", 10],
                    ["Sleep hours", "sleepHours", 12],
                    ["Social minutes", "socialMediaMinutes", 180],
                  ].map(([label, field, max]) => (
                    <label key={field} className="range-label">
                      {label}
                      <input
                        type="range"
                        min="0"
                        max={String(max)}
                        value={stateForm[field]}
                        onChange={(event) =>
                          setStateForm((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <textarea
                  value={stateForm.note}
                  onChange={(event) =>
                    setStateForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="What influenced your state?"
                />
                <button className="primary" type="submit">
                  Save Mental State
                </button>
              </form>
            </article>

            <article className="panel-card">
              <span className="section-tag">Commitments</span>
              <h2>Track promises that shape self-trust</h2>
              <form className="form-grid" onSubmit={handleCommitmentSubmit}>
                <input
                  value={commitmentForm.title}
                  onChange={(event) =>
                    setCommitmentForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Commitment title"
                />
                <input
                  type="datetime-local"
                  value={commitmentForm.dueDate}
                  onChange={(event) =>
                    setCommitmentForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
                <select
                  value={commitmentForm.status}
                  onChange={(event) =>
                    setCommitmentForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="planned">Planned</option>
                  <option value="done">Done</option>
                  <option value="missed">Missed</option>
                </select>
                <button className="primary" type="submit">
                  Save Commitment
                </button>
              </form>
            </article>
          </section>
        ) : null}

        {activeTab === "intelligence" ? (
          <section className="panel intelligence-grid">
            <article className="panel-card">
              <span className="section-tag">Behavior engine</span>
              <h2>What the system believes right now</h2>
              <div className="stack-list">
                <div className="feed-item">
                  Life Score: {computeLifeScore(snapshot)}. This combines decision
                  quality, focus, energy, and commitment follow-through.
                </div>
                {patterns.map((pattern) => (
                  <div key={pattern} className="feed-item">
                    {pattern}
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <span className="section-tag">Decision consequence tracker</span>
              <h2>Recent decisions</h2>
              <div className="stack-list">
                {snapshot.decisions.slice(0, 5).map((decision) => (
                  <div key={decision.id} className="feed-item">
                    <span className="micro-label">
                      {decision.category || "General"} · {decision.outcomeScore}/100
                    </span>
                    <strong>{decision.title}</strong>
                    <p>{decision.actualOutcome || decision.choice}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <span className="section-tag">Readiness report</span>
              <h2>Reliability layer</h2>
              <div className="stack-list">
                <div className="feed-item">
                  Offline-first local persistence keeps the app usable without backend setup.
                </div>
                <div className="feed-item">
                  Schema normalization guards imported and stored data from breaking the UI.
                </div>
                <div className="feed-item">
                  Manual backup export and import keep user history portable.
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "vault" ? (
          <section className="panel two-column">
            <article className="panel-card">
              <span className="section-tag">Private vault</span>
              <h2>Store the truth you do not show elsewhere</h2>
              <form className="form-grid" onSubmit={handleVaultSubmit}>
                <input
                  value={vaultForm.title}
                  onChange={(event) =>
                    setVaultForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Vault entry title"
                />
                <textarea
                  value={vaultForm.content}
                  onChange={(event) =>
                    setVaultForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Write the unfiltered version"
                />
                <button className="primary" type="submit">
                  Lock Entry
                </button>
              </form>
            </article>

            <article className="panel-card">
              <div className="section-row">
                <div>
                  <span className="section-tag">Vault memory</span>
                  <h2>Protected notes</h2>
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setIsVaultVisible((current) => !current)}
                >
                  {isVaultVisible ? "Hide" : "Reveal"}
                </button>
              </div>
              <div className="stack-list">
                {snapshot.vault.map((entry) => (
                  <div key={entry.id} className="feed-item">
                    <span className="micro-label">{entry.title}</span>
                    <div>{isVaultVisible ? entry.content : "Hidden for privacy."}</div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className="panel settings-grid">
            <article className="panel-card">
              <span className="section-tag">Identity system</span>
              <h2>Configure your operating mode</h2>
              <div className="form-grid">
                <input
                  value={snapshot.user.name}
                  onChange={(event) => handleProfileChange("name", event.target.value)}
                  placeholder="Your name"
                />
                <textarea
                  value={snapshot.user.mission}
                  onChange={(event) => handleProfileChange("mission", event.target.value)}
                  placeholder="Mission"
                />
                <textarea
                  value={snapshot.user.intent}
                  onChange={(event) => handleProfileChange("intent", event.target.value)}
                  placeholder="What are you trying to become?"
                />
                <div className="inline-fields">
                  <select
                    value={snapshot.user.activeMode}
                    onChange={(event) =>
                      handleProfileChange("activeMode", event.target.value)
                    }
                  >
                    {identityModes.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={snapshot.user.coachVoice}
                    onChange={(event) =>
                      handleProfileChange("coachVoice", event.target.value)
                    }
                  >
                    {coachVoices.map((voice) => (
                      <option key={voice} value={voice}>
                        {voice}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </article>

            <article className="panel-card">
              <span className="section-tag">Backups and reset</span>
              <h2>Protect the system memory</h2>
              <div className="action-column">
                <button className="primary" type="button" onClick={handleExport}>
                  Export Backup
                </button>
                <label className="file-input">
                  Import Backup
                  <input type="file" accept="application/json" onChange={handleImport} />
                </label>
                <button className="secondary" type="button" onClick={handleReset}>
                  Reset to Demo Data
                </button>
              </div>
            </article>

            <article className="panel-card">
              <span className="section-tag">Deployment readiness</span>
              <h2>Production checklist</h2>
              <div className="stack-list">
                <div className="feed-item">
                  Vercel API route added for secure OpenAI requests.
                </div>
                <div className="feed-item">
                  Firebase auth and Firestore sync activate automatically when env keys exist.
                </div>
                <div className="feed-item">
                  Offline mode remains available if cloud services are not configured yet.
                </div>
              </div>
            </article>

            <article className="panel-card">
              <span className="section-tag">Mode behavior</span>
              <h2>{activeMode.name}</h2>
              <p>{activeMode.tone}</p>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}
