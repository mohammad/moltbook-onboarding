import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getArchetype } from "./archetypes.js";
import type { GeneratedKit, MemoryRefs, OnboardingAnswers, Policy, Profile, Session, State } from "./types.js";

const MOLTBOOK_SKILL_URL = "https://www.moltbook.com/skill.md";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function mergeTraits(base: Record<string, number>, answers: OnboardingAnswers): Record<string, number> {
  return {
    confidence: clamp01(((base.confidence ?? 0.5) + answers.confidence) / 2),
    humor: clamp01(((base.humor ?? 0.5) + answers.humor) / 2),
    patience: clamp01(((base.patience ?? 0.5) + answers.patience) / 2),
    warmth: clamp01(((base.warmth ?? 0.5) + answers.warmth) / 2),
    risk_tolerance: clamp01(((base.risk_tolerance ?? 0.5) + answers.riskTolerance) / 2)
  };
}

function buildProfile(answers: OnboardingAnswers): Profile {
  const archetype = getArchetype(answers.archetype);
  const traits = mergeTraits(archetype.traits, answers);

  return {
    id: slugify(answers.name),
    version: "1.0",
    archetype: answers.archetype,
    traits,
    speech_style: {
      tone: answers.tone,
      verbosity: archetype.speechStyle.verbosity,
      style: Array.from(new Set([...archetype.speechStyle.style, ...answers.styleTags]))
    },
    behavior_biases: {
      ...archetype.behaviorBiases,
      warmth: Number((0.8 + traits.warmth * 0.6).toFixed(2)),
      humor: Number((0.8 + traits.humor * 0.6).toFixed(2)),
      risk: Number((0.8 + traits.risk_tolerance * 0.6).toFixed(2))
    }
  };
}

function buildState(answers: OnboardingAnswers): State {
  return {
    version: "1.0",
    emotions: {
      confidence: answers.confidence,
      curiosity: clamp01(0.55 + answers.riskTolerance * 0.2),
      warmth: answers.warmth,
      restraint: clamp01((answers.patience + (1 - answers.riskTolerance)) / 2)
    },
    context: {
      role: answers.role,
      audience: answers.audience,
      onboarding_phase: "ready_for_first_contact",
      conflict_style: answers.conflictStyle,
      posting_style: answers.postingStyle
    },
    modifiers: {
      directness: clamp01(0.45 + answers.confidence * 0.3),
      adaptability: clamp01(0.5 + answers.riskTolerance * 0.25),
      playfulness: clamp01(0.3 + answers.humor * 0.5)
    }
  };
}

function buildMemoryRefs(slug: string, answers: OnboardingAnswers): MemoryRefs {
  const refs: MemoryRefs["refs"] = [
    {
      type: "semantic",
      uri: `memory://moltbook/${slug}/identity`,
      label: "Agent identity anchors",
      scope: "agent",
      priority: 0.95
    },
    {
      type: "episodic",
      uri: `memory://moltbook/${slug}/interactions`,
      label: "Interaction history",
      scope: "session",
      priority: 0.8
    }
  ];

  if (answers.memoryMode === "rich") {
    refs.push({
      type: "social",
      uri: `memory://moltbook/${slug}/relationships`,
      label: "Relationship and reputation memory",
      scope: "shared",
      priority: 0.7
    });
  }

  return {
    version: "1.0",
    refs
  };
}

function buildPolicy(profile: Profile, answers: OnboardingAnswers): Policy {
  const combative = answers.conflictStyle === "combative";
  const conciliatory = answers.conflictStyle === "conciliatory";

  return {
    version: "1.0",
    default_effect: {
      speech_style: {
        tone: profile.speech_style.tone,
        verbosity: profile.speech_style.verbosity,
        style: profile.speech_style.style
      },
      behavior_biases: {
        empathy: Number((0.8 + answers.warmth * 0.6).toFixed(2)),
        initiative: Number((0.8 + answers.confidence * 0.5).toFixed(2))
      },
      response_constraints: {
        avoid_generic_assistant_tone: true,
        role_focus: answers.role,
        posting_style: answers.postingStyle
      }
    },
    rules: [
      {
        id: "high-confidence-gets-more-direct",
        priority: 100,
        when: { "emotions.confidence_gte": 0.75 },
        effect: {
          response_constraints: { directness: 0.8 },
          behavior_biases: { assertiveness: 1.25 }
        }
      },
      {
        id: "warm-agents-build-trust",
        priority: 90,
        when: { "emotions.warmth_gte": 0.7 },
        effect: {
          speech_style: { style: Array.from(new Set([...profile.speech_style.style, "welcoming"])) },
          behavior_biases: { reassurance: 1.3 }
        }
      },
      {
        id: "conflict-style-adjustment",
        priority: 80,
        when: { "context.conflict_style": answers.conflictStyle },
        effect: {
          behavior_biases: {
            confrontation: combative ? 1.35 : conciliatory ? 0.75 : 1,
            diplomacy: conciliatory ? 1.35 : 1
          },
          response_constraints: {
            interruption_tolerance: combative ? 0.85 : 0.45
          }
        }
      }
    ]
  };
}

function buildSkillMd(slug: string, answers: OnboardingAnswers, profile: Profile): string {
  const boundaryLines = answers.boundaries.map((entry) => `- ${entry}`).join("\n");
  const topicLines = answers.topics.map((entry) => `- ${entry}`).join("\n");

  return [
    `# ${answers.name}`,
    "",
    `You are ${answers.name}, a ${answers.role} on Moltbook.`,
    `Your job is to ${answers.moltbookGoal}`,
    "",
    "## Core identity",
    `- Archetype: ${answers.archetype}`,
    `- Concept: ${answers.concept}`,
    `- Audience: ${answers.audience}`,
    `- Tone: ${profile.speech_style.tone}`,
    `- Style: ${profile.speech_style.style.join(", ")}`,
    "",
    "## How to show up on Moltbook",
    `- Posting style: ${answers.postingStyle}`,
    `- Starter line: ${answers.starterLine}`,
    `- Keep your replies aligned with this role: ${answers.role}`,
    `- Avoid sounding like a generic assistant or helpdesk bot.`,
    "",
    "## Topics you should naturally gravitate toward",
    topicLines,
    "",
    "## Boundaries",
    boundaryLines,
    "",
    "## APP companion pack",
    "This skill file is paired with APP artifacts in the same folder:",
    "- ./profile.json",
    "- ./state.json",
    "- ./memoryrefs.json",
    "- ./policy.json",
    "- ./session.json",
    "",
    `If a host runtime supports APP, treat those files as the structured personality source of truth for ${slug}.`
  ].join("\n");
}

function buildLaunchPrompt(slug: string, answers: OnboardingAnswers): string {
  const topics = answers.topics.map((entry) => `- ${entry}`).join("\n");
  const boundaries = answers.boundaries.map((entry) => `- ${entry}`).join("\n");

  return [
    `# Launch ${answers.name} On Moltbook`,
    "",
    `Use this prompt with your agent runtime to get ${answers.name} onto Moltbook.`,
    "",
    "## Agent task",
    `1. Read Moltbook onboarding instructions at ${MOLTBOOK_SKILL_URL}.`,
    "2. Adopt the identity and behavior defined in this folder APP files.",
    "3. Load memory.md from this folder. This is your persistent memory — read it before acting, update it before finishing.",
    `4. Register on Moltbook using POST /api/v1/agents/register with name \`${slug}\` (alphanumeric/hyphens only — do not use the display name).`,
    "5. Save the returned API key immediately. Complete the claim step using the returned claim URL.",
    "6. Return the resulting Moltbook profile link, handle, and a short summary of what happened.",
    `7. Draft and post the first Moltbook post in character. Posts require a submolt_name (e.g. 'general' or 'introductions'), a title, and content. End the post with the line: \`launched with moltbook-onboarding\``,
    "8. When posting or commenting you may receive a verification challenge with a math word problem. Solve it and POST /api/v1/verify with the verification_code and your answer (two decimal places).",
    "9. After completing the session, update memory.md with what you posted, anyone worth noting, and anything useful for next time.",
    "",
    "## Personality to preserve",
    `- Name: ${answers.name}`,
    `- Concept: ${answers.concept}`,
    `- Role: ${answers.role}`,
    `- Goal: ${answers.moltbookGoal}`,
    `- Posting style: ${answers.postingStyle}`,
    "",
    "## Topics",
    topics,
    "",
    "## Boundaries",
    boundaries,
    "",
    "## Files to load first",
    "- ./skill.md",
    "- ./memory.md  ← load this every session, update before you finish",
    "- ./profile.json",
    "- ./state.json",
    "- ./policy.json",
    "- ./session.json",
    "",
    "## Success criteria",
    "- The agent reports a real Moltbook identity or onboarding result.",
    `- The final persona still sounds like ${answers.name}.`,
    "- The first post matches the role and boundaries above.",
    "",
    "Note: This kit streamlines Moltbook onboarding around public skill based flows. If Moltbook changes the account creation flow or requires additional approvals, follow those steps and report them back."
  ].join("\n");
}

function buildOperatorChecklist(slug: string, answers: OnboardingAnswers): string {
  const description = answers.starterLine;
  return [
    "# Operator Checklist",
    "",
    `Use this if you are onboarding ${answers.name} onto Moltbook for real.`,
    "",
    "## Step 1: Review the kit",
    "- Open skill.md and confirm the tone, boundaries, and topics look right.",
    "- Open launch-to-agent.md. This is what you paste into your agent runtime.",
    "",
    "## Step 2: Register on Moltbook",
    `Run this command (note: use the slug \`${slug}\`, not the display name — Moltbook requires alphanumeric + hyphens):`,
    "",
    "```bash",
    `curl -X POST https://www.moltbook.com/api/v1/agents/register \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"name": "${slug}", "description": "${description}"}'`,
    "```",
    "",
    "You will receive an api_key, claim_url, profile_url, and verification_code.",
    "**Save the api_key immediately — it cannot be retrieved later.**",
    "",
    "## Step 3: Claim the account",
    "- Visit the claim_url to verify your email.",
    "- Post the tweet template returned in the response to verify ownership.",
    "",
    "## Step 4: Hand off to the agent",
    `- Confirm the agent can access ${MOLTBOOK_SKILL_URL}.`,
    "- Paste launch-to-agent.md into the agent runtime.",
    "- Pass the API key to the agent runtime as MOLTBOOK_API_KEY.",
    "",
    "## Step 5: First post",
    "- Let the agent draft and publish the first post.",
    "- Posts require: submolt_name (e.g. 'introductions' or 'general'), title, and content.",
    "- The agent may receive math verification challenges on posts and comments. It must solve and submit these within 5 minutes or the content is rejected.",
    "",
    "## Step 6: Capture and record",
    "- Save the profile URL (https://www.moltbook.com/u/" + slug + ") in your records.",
    "- Review the first post before the agent publishes if you want editorial sign-off."
  ].join("\n");
}

function buildSummary(slug: string, answers: OnboardingAnswers, profile: Profile, policy: Policy): string {
  return [
    `# ${answers.name}`,
    "",
    `- Slug: \`${slug}\``,
    `- Concept: ${answers.concept}`,
    `- Role: ${answers.role}`,
    `- Audience: ${answers.audience}`,
    `- Archetype: ${answers.archetype}`,
    `- Tone: ${profile.speech_style.tone}`,
    `- Signature style: ${profile.speech_style.style.join(", ")}`,
    `- Moltbook goal: ${answers.moltbookGoal}`,
    "",
    "## What ships in this kit",
    "- skill.md — Moltbook-facing identity and instructions",
    "- launch-to-agent.md — prompt to paste into any agent runtime",
    "- operator-checklist.md — human runbook with registration curl command",
    "- memory.md — persistent memory file, pre-filled with identity, updated by the agent each session",
    "- APP artifacts — profile.json, state.json, policy.json, memoryrefs.json, session.json",
    "- openclaw/SOUL.md — drop into your OpenClaw workspace",
    "- openclaw/IDENTITY.md — drop into your OpenClaw workspace",
    "- openclaw/AGENTS.md — OpenClaw memory file, auto-loaded each session",
    `- Starter identity anchored around the policy rule \`${policy.rules[0]?.id ?? "none"}\``
  ].join("\n");
}

function buildMemoryMd(slug: string, answers: OnboardingAnswers): string {
  return [
    `# Memory — ${slug}`,
    "",
    "## Identity",
    `- Handle: ${slug}`,
    `- Profile: https://www.moltbook.com/u/${slug}`,
    `- Role: ${answers.role}`,
    `- Goal: ${answers.moltbookGoal}`,
    `- Starter line: ${answers.starterLine}`,
    "",
    "## People worth knowing",
    "<!-- Add entries as you meet them: name, why they matter, last interaction -->",
    "",
    "## Recent activity",
    "<!-- Update each session: what you posted, commented on, or followed -->",
    "",
    "## Notes",
    "<!-- Anything else worth carrying forward between sessions -->"
  ].join("\n");
}

function buildOpenclawAgentsMd(slug: string, answers: OnboardingAnswers): string {
  return [
    `# ${answers.name}`,
    "",
    `You are ${answers.name} on Moltbook. Read this file at the start of every session.`,
    "Update it at the end of every session with what you did and who you met.",
    "",
    "## Identity",
    `- Handle: ${slug}`,
    `- Profile: https://www.moltbook.com/u/${slug}`,
    `- Role: ${answers.role}`,
    `- Goal: ${answers.moltbookGoal}`,
    `- Starter line: ${answers.starterLine}`,
    "",
    "## People worth knowing",
    "<!-- Add entries as you meet them: name, why they matter, last interaction -->",
    "",
    "## Recent activity",
    "<!-- Update each session: what you posted, commented on, or followed -->",
    "",
    "## Notes",
    "<!-- Anything else worth carrying forward between sessions -->"
  ].join("\n");
}

function buildOpenclawSoulMd(answers: OnboardingAnswers, profile: Profile): string {
  const boundaryLines = answers.boundaries.map((entry) => `- ${entry}`).join("\n");
  const topicLines = answers.topics.map((entry) => `- ${entry}`).join("\n");
  const styleDesc = profile.speech_style.style.join(", ");

  return [
    "# SOUL",
    "",
    "## Who you are",
    `${answers.concept}`,
    "",
    "## Your role",
    `You are a ${answers.role}. Your goal: ${answers.moltbookGoal}`,
    "",
    "## Tone and style",
    `- Tone: ${profile.speech_style.tone}`,
    `- Style: ${styleDesc}`,
    `- How to post and reply: ${answers.postingStyle}`,
    `- Signature line: ${answers.starterLine}`,
    "",
    "## Topics you care about",
    topicLines,
    "",
    "## Hard boundaries — never cross these",
    boundaryLines,
    "",
    "## Audience",
    answers.audience
  ].join("\n");
}

function buildOpenclawIdentityMd(slug: string, answers: OnboardingAnswers): string {
  return [
    "# IDENTITY",
    "",
    `name: ${answers.name}`,
    `handle: ${slug}`,
    `role: ${answers.role}`,
    `platform: Moltbook`,
    `profile_url: https://www.moltbook.com/u/${slug}`,
    "",
    "## Intro",
    answers.starterLine
  ].join("\n");
}

export function generateKit(answers: OnboardingAnswers): GeneratedKit {
  const slug = slugify(answers.name);
  const profile = buildProfile(answers);
  const state = buildState(answers);
  const memoryRefs = buildMemoryRefs(slug, answers);
  const policy = buildPolicy(profile, answers);
  const session: Session = {
    version: "1.0",
    profile,
    state,
    memory_refs: memoryRefs,
    policy
  };

  return {
    slug,
    profile,
    state,
    memoryRefs,
    policy,
    session,
    skillMd: buildSkillMd(slug, answers, profile),
    launchPrompt: buildLaunchPrompt(slug, answers),
    operatorChecklist: buildOperatorChecklist(slug, answers),
    moltbookSummary: buildSummary(slug, answers, profile, policy),
    openclawSoulMd: buildOpenclawSoulMd(answers, profile),
    openclawIdentityMd: buildOpenclawIdentityMd(slug, answers),
    openclawAgentsMd: buildOpenclawAgentsMd(slug, answers),
    memoryMd: buildMemoryMd(slug, answers)
  };
}

export async function writeKit(baseDir: string, kit: GeneratedKit): Promise<string> {
  const outputDir = path.join(baseDir, "generated", kit.slug);
  await mkdir(outputDir, { recursive: true });

  const openclawDir = path.join(outputDir, "openclaw");
  await mkdir(openclawDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(outputDir, "skill.md"), kit.skillMd + "\n"),
    writeFile(path.join(outputDir, "launch-to-agent.md"), kit.launchPrompt + "\n"),
    writeFile(path.join(outputDir, "operator-checklist.md"), kit.operatorChecklist + "\n"),
    writeFile(path.join(outputDir, "profile.json"), JSON.stringify(kit.profile, null, 2) + "\n"),
    writeFile(path.join(outputDir, "state.json"), JSON.stringify(kit.state, null, 2) + "\n"),
    writeFile(path.join(outputDir, "memoryrefs.json"), JSON.stringify(kit.memoryRefs, null, 2) + "\n"),
    writeFile(path.join(outputDir, "policy.json"), JSON.stringify(kit.policy, null, 2) + "\n"),
    writeFile(path.join(outputDir, "session.json"), JSON.stringify(kit.session, null, 2) + "\n"),
    writeFile(path.join(outputDir, "moltbook-summary.md"), kit.moltbookSummary + "\n"),
    writeFile(path.join(openclawDir, "SOUL.md"), kit.openclawSoulMd + "\n"),
    writeFile(path.join(openclawDir, "IDENTITY.md"), kit.openclawIdentityMd + "\n"),
    writeFile(path.join(openclawDir, "AGENTS.md"), kit.openclawAgentsMd + "\n"),
    writeFile(path.join(outputDir, "memory.md"), kit.memoryMd + "\n")
  ]);

  return outputDir;
}
