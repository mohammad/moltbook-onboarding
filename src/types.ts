import type {
  Profile,
  State,
  MemoryRefs,
  MemoryRefEntry,
  Policy,
  Rule,
  Condition,
  Session
} from "agent-personality-protocol";

export type { Profile, State, MemoryRefs, MemoryRefEntry, Policy, Rule, Condition, Session };

export type Verbosity = "short" | "medium" | "long";

export interface OnboardingAnswers {
  name: string;
  concept: string;
  role: string;
  audience: string;
  archetype: string;
  tone: string;
  styleTags: string[];
  warmth: number;
  patience: number;
  riskTolerance: number;
  confidence: number;
  humor: number;
  conflictStyle: "conciliatory" | "balanced" | "combative";
  memoryMode: "light" | "rich";
  moltbookGoal: string;
  postingStyle: string;
  topics: string[];
  boundaries: string[];
  starterLine: string;
}

// The generator always sets speech_style and behavior_biases on every profile it builds.
// This type narrows the APP Profile to reflect that guarantee.
export type BuiltProfile = Profile & {
  speech_style: NonNullable<Profile["speech_style"]> & { style: string[] };
  behavior_biases: NonNullable<Profile["behavior_biases"]>;
};

export interface GeneratedKit {
  slug: string;
  profile: BuiltProfile;
  state: State;
  memoryRefs: MemoryRefs;
  policy: Policy;
  session: Session;
  skillMd: string;
  launchPrompt: string;
  operatorChecklist: string;
  moltbookSummary: string;
  openclawSoulMd: string;
  openclawIdentityMd: string;
  openclawAgentsMd: string;
  memoryMd: string;
  memoryIdentityJson: string;
  memoryInteractionsJson: string;
  memoryRelationshipsJson: string;
}
