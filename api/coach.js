const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
function buildLocalCoachFallback(user, summary) {
  const mission = user?.mission || "build a steadier operating rhythm";
  const reflection = `Local Shadow OS readout: your recent logs suggest recurring patterns that are shaping identity more than intention. The system is still useful without cloud AI because the behavioral signals are already visible.`;
  const nudge = `Choose one concrete move that supports your mission to ${mission}, then do it before opening another distracting tab or app.`;
  const risk = summary.toLowerCase().includes("miss")
    ? "Repeated missed commitments can turn temporary inconsistency into self-image."
    : "When friction stays vague, reactive behavior usually takes control again.";
  const next_step =
    "Log one new thought or decision today and use that as the trigger for a clean next action.";

  return {
    reflection,
    nudge,
    risk,
    next_step,
    source: "local-fallback",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { user, summary } = req.body ?? {};
    if (!summary) {
      return res.status(400).json({ error: "Summary payload is required." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        result: buildLocalCoachFallback(user, summary),
      });
    }

    const prompt = [
      "You are Shadow OS, a behavioral operating system.",
      "Return concise, concrete coaching in JSON with keys: reflection, nudge, risk, next_step.",
      "The tone should be emotionally intelligent, sharp, and practical.",
      `User: ${user?.name || "User"}`,
      `Mission: ${user?.mission || ""}`,
      `Intent: ${user?.intent || ""}`,
      `Behavior summary: ${summary}`,
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "shadow_os_coaching",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reflection: { type: "string" },
                nudge: { type: "string" },
                risk: { type: "string" },
                next_step: { type: "string" },
              },
              required: ["reflection", "nudge", "risk", "next_step"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText || "OpenAI request failed." });
    }

    const data = await response.json();
    const content =
      data.output?.[0]?.content?.find((item) => item.type === "output_text")?.text ?? "{}";

    return res.status(200).json({ result: JSON.parse(content) });
  } catch (error) {
    const { user, summary } = req.body ?? {};
    return res.status(200).json({
      result: buildLocalCoachFallback(user, summary || ""),
      warning: error instanceof Error ? error.message : "Unexpected server fallback.",
    });
  }
}
