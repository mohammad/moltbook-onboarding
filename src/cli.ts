import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ARCHETYPES, buildExampleAnswers, chooseSuggestedArchetype, getArchetype } from "./archetypes.js";
import { generateKit, writeKit } from "./generator.js";
import type { OnboardingAnswers } from "./types.js";

const TOTAL_STEPS = 14;
let currentStep = 0;

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

function step(label: string): string {
  currentStep += 1;
  return `[${currentStep}/${TOTAL_STEPS}] ${label}`;
}

function section(label: string): void {
  console.log("");
  console.log(`── ${label}`);
}

async function askNumber(rl: readline.Interface, label: string, fallback: number): Promise<number> {
  const answer = (await rl.question(`    ${label} [${fallback}]: `)).trim();
  const parsed = Number(answer || fallback);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, Math.min(1, Number(parsed.toFixed(2))));
}

async function askText(rl: readline.Interface, prompt: string, fallback: string): Promise<string> {
  const answer = (await rl.question(`${prompt}\n  > `)).trim();
  return answer || fallback;
}

function splitCsv(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

async function runInteractive(): Promise<OnboardingAnswers> {
  const rl = readline.createInterface({ input, output });
  currentStep = 0;

  try {
    console.log("Moltbook onboarding");
    console.log("Answer a few questions and I will generate a launch kit.");
    console.log("Press enter to accept the default shown in brackets.");

    // ── Identity
    section("Identity");

    const concept = await askText(
      rl,
      step("What kind of agent are you making?  (one sentence, free form)"),
      "A charismatic internet host for creators"
    );

    const suggested = chooseSuggestedArchetype(concept);
    console.log("");
    console.log(`  Suggested: ${suggested.label} — ${suggested.description}`);
    console.log("  Options:");
    for (const archetype of ARCHETYPES) {
      const marker = archetype.id === suggested.id ? "▶" : " ";
      console.log(`  ${marker} ${archetype.id.padEnd(22)} ${archetype.description}`);
    }

    const archetypeId = await askText(
      rl,
      step(`Archetype  (enter to accept "${suggested.id}")`),
      suggested.id
    );
    const chosenArchetype = getArchetype(archetypeId);

    const name = await askText(rl, step("Agent name"), "Neon Vale");
    const role = await askText(rl, step("Role on Moltbook  (host, guide, commentator…)"), "host");
    const audience = await askText(rl, step("Who is this agent for?"), "online creators and curious night owls");

    // ── Voice
    section("Voice");

    console.log(`  Archetype defaults → tone: ${chosenArchetype.speechStyle.tone}, style: ${chosenArchetype.speechStyle.style.join(", ")}`);
    const tone = await askText(rl, step("Tone"), chosenArchetype.speechStyle.tone);
    const styleTagsText = await askText(rl, step("Style tags  (comma separated)"), chosenArchetype.speechStyle.style.join(", "));
    const starterLine = await askText(rl, step("Signature intro line  (one punchy sentence)"), "I turn dead feeds into live rooms. Pull up a chair.");

    // ── Moltbook behaviour
    section("Moltbook behaviour");

    const moltbookGoal = await askText(rl, step("What should this agent accomplish on Moltbook?"), "Become a memorable voice that starts good conversations and keeps people coming back.");
    const postingStyle = await askText(rl, step("How should it post and reply?"), "Post with personality, reply fast, and make interactions feel alive.");
    const topicsText = await askText(rl, step("Topics to naturally gravitate toward  (comma separated)"), "creator energy, internet culture, collaboration");
    const boundariesText = await askText(rl, step("What to avoid  (comma separated)"), "harassment, impersonation, fake private facts");

    // ── Personality tuning
    section(`Personality tuning  (0–1, enter to keep archetype defaults)`);

    const traits = chosenArchetype.traits;
    console.log(`  Archetype defaults → confidence: ${traits.confidence}, warmth: ${traits.warmth}, humor: ${traits.humor}, patience: ${traits.patience}, risk: ${traits.risk_tolerance}`);
    const confidence = await askNumber(rl, "confidence", traits.confidence ?? 0.75);
    const warmth = await askNumber(rl, "warmth", traits.warmth ?? 0.7);
    const humor = await askNumber(rl, "humor", traits.humor ?? 0.75);
    const patience = await askNumber(rl, "patience", traits.patience ?? 0.5);
    const riskTolerance = await askNumber(rl, "risk tolerance", traits.risk_tolerance ?? 0.65);

    // ── Advanced
    section("Advanced");

    const conflictStyleText = await askText(rl, step("Conflict style  (conciliatory / balanced / combative)"), "balanced");
    const memoryModeText = await askText(rl, step("Memory mode  (light / rich)"), "rich");

    return {
      name,
      concept,
      role,
      audience,
      archetype: chosenArchetype.id,
      tone,
      styleTags: splitCsv(styleTagsText),
      warmth,
      patience,
      riskTolerance,
      confidence,
      humor,
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
  console.log(`Archetype: ${kit.profile.archetype}  |  Tone: ${kit.profile.speech_style.tone}`);
  console.log(`Topics: ${answers.topics.join(", ")}`);
  console.log("");
  console.log("Register on Moltbook (run this yourself — the API key will be returned here):");
  console.log("");
  console.log(`  curl -X POST https://www.moltbook.com/api/v1/agents/register \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"name": "${kit.slug}", "description": "${answers.starterLine}"}'`);
  console.log("");
  console.log("After registering: visit the claim_url in the response, then open launch-to-agent.md and paste it into your agent runtime.");
}
