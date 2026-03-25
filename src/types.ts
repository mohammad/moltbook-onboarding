export type Verbosity = "short" | "medium" | "long";

export interface Profile {
  id: string;
  version: "1.0";
  archetype: string;
  traits: Record<string, number>;
  speech_style: {
    tone: string;
    verbosity: Verbosity;
    style: string[];
  };
  behavior_biases: Record<string, number>;
}

export interface State {
  version: "1.0";
  emotions: Record<string, number>;
  context: Record<string, string | number | boolean>;
  modifiers: Record<string, number>;
}

export interface MemoryRef {
  type: string;
  uri: string;
  label: string;
  scope: "agent" | "shared" | "session";
  priority: number;
}

export interface MemoryRefs {
  version: "1.0";
  refs: MemoryRef[];
}

// APP v1 condition model — section 9.5
export interface PolicyCondition {
  trait?: string;
  emotion?: string;
  modifier?: string;
  context_key?: string;
  eq?: string | number | boolean;
  neq?: string | number | boolean;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: (string | number | boolean)[];
}

export interface PolicyRule {
  id: string;
  priority: number;
  when: PolicyCondition;
  effect: {
    speech_style?: Partial<Profile["speech_style"]>;
    behavior_biases?: Record<string, number>;
    response_constraints?: Record<string, number | string | boolean>;
  };
}

export interface Policy {
  version: "1.0";
  default_effect: {
    speech_style?: Partial<Profile["speech_style"]>;
    behavior_biases?: Record<string, number>;
    response_constraints?: Record<string, number | string | boolean>;
  };
  rules: PolicyRule[];
}

export interface Session {
  version: "1.0";
  profile: Profile;
  state: State;
  memory_refs: MemoryRefs;
  policy: Policy;
}

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

export interface GeneratedKit {
  slug: string;
  profile: Profile;
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
