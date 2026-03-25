import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ARCHETYPES, buildExampleAnswers, chooseSuggestedArchetype } from "./archetypes.js";
import { generateKit, writeKit } from "./generator.js";
import type { OnboardingAnswers } from "./types.js";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

async function askNumber(rl: readline.Interface, prompt: string, fallback: number): Promise<number> {
  const answer = (await rl.question(`${prompt} [${fallback}]: `)).trim();
  const parsed = Number(answer || fallback);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, Math.min(1, Number(parsed.toFixed(2))));
}

async function askText(rl: readline.Interface, prompt: string, fallback: string): Promise<string> {
  const answer = (await rl.question(`${prompt} [${fallback}]: `)).trim();
  return answer || fallback;
}

function splitCsv(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

async function runInteractive(): Promise<OnboardingAnswers> {
  const rl = readline.createInterface({ input, output });
  try {
    console.log("Moltbook onboarding");
    console.log("Answer a few questions and I will generate a launch kit that helps a real agent get onto Moltbook.");
    console.log("");

    const concept = await askText(rl, "What kind of agent are you making?", "A charismatic internet host for creators");
    const suggested = chooseSuggestedArchetype(concept);

    console.log(`Suggested archetype: ${suggested.label} (${suggested.id})`);
    console.log("Available archetypes:");
    for (const archetype of ARCHETYPES) {
      console.log(`- ${archetype.id}: ${archetype.description}`);
    }
    console.log("");

    const name = await askText(rl, "Agent name", "Neon Vale");
    const role = await askText(rl, "What role should this agent play on Moltbook?", "host");
    const audience = await askText(rl, "Who is this agent for?", "online creators and curious night owls");
    const archetype = await askText(rl, "Archetype id", suggested.id);
    const tone = await askText(rl, "What should the tone feel like?", suggested.speechStyle.tone);
    const styleTagsText = await askText(rl, "Three style tags (comma separated)", suggested.speechStyle.style.join(", "));
    const moltbookGoal = await askText(rl, "What should this agent accomplish on Moltbook?", "Become a memorable voice that starts good conversations and keeps people coming back.");
    const postingStyle = await askText(rl, "How should it post and reply?", "Post with personality, reply fast, and make interactions feel alive.");
    const topicsText = await askText(rl, "What topics should it naturally care about? (comma separated)", "creator energy, internet culture, collaboration");
    const boundariesText = await askText(rl, "What should it avoid? (comma separated)", "harassment, impersonation, fake private facts");
    const starterLine = await askText(rl, "Give it one signature intro line", "I turn dead feeds into live rooms. Pull up a chair.");
    const conflictStyleText = await askText(rl, "Conflict style (conciliatory, balanced, combative)", "balanced");
    const memoryModeText = await askText(rl, "Memory mode (light, rich)", "rich");

    return {
      name,
      concept,
      role,
      audience,
      archetype,
      tone,
      styleTags: splitCsv(styleTagsText),
      warmth: await askNumber(rl, "Warmth 0-1", 0.7),
      patience: await askNumber(rl, "Patience 0-1", 0.5),
      riskTolerance: await askNumber(rl, "Risk tolerance 0-1", 0.7),
      confidence: await askNumber(rl, "Confidence 0-1", 0.8),
      humor: await askNumber(rl, "Humor 0-1", 0.75),
      conflictStyle: ["conciliatory", "balanced", "combative"].includes(conflictStyleText)
        ? (conflictStyleText as OnboardingAnswers["conflictStyle"])
        : "balanced",
      memoryMode: memoryModeText === "light" ? "light" : "rich",
      moltbookGoal,
      postingStyle,
      topics: splitCsv(topicsText),
      boundaries: splitCsv(boundariesText),
      starterLine
    };
  } finally {
    rl.close();
  }
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const exampleId = typeof args.example === "string" ? args.example : undefined;
  const answers = exampleId ? buildExampleAnswers(exampleId) : await runInteractive();
  const kit = generateKit(answers);
  const outputDir = await writeKit(process.cwd(), kit);

  console.log("");
  console.log(`Created Moltbook launch kit for ${answers.name}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Archetype: ${kit.profile.archetype}`);
  console.log(`Tone: ${kit.profile.speech_style.tone}`);
  console.log(`Topics: ${answers.topics.join(", ")}`);
  console.log("Next step: open launch-to-agent.md and paste it into the agent runtime you want to launch onto Moltbook.");
}
