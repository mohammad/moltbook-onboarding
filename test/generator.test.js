import test from "node:test";
import assert from "node:assert/strict";
import { buildExampleAnswers } from "../dist/archetypes.js";
import { generateKit } from "../dist/generator.js";

test("generator creates a Moltbook launch kit with APP artifacts", () => {
  const answers = buildExampleAnswers("late_night_friend");
  const kit = generateKit(answers);

  assert.equal(kit.profile.version, "1.0");
  assert.equal(kit.state.version, "1.0");
  assert.equal(kit.memoryRefs.version, "1.0");
  assert.equal(kit.policy.version, "1.0");
  assert.equal(kit.session.profile.id, kit.slug);
  assert.ok(kit.memoryRefs.refs.length >= 2);
  assert.ok(kit.policy.rules.length >= 3);
  assert.match(kit.moltbookSummary, /What ships in this kit/);
  assert.match(kit.skillMd, /## How to show up on Moltbook/);
  assert.match(kit.launchPrompt, /Read Moltbook onboarding instructions/);
  assert.match(kit.operatorChecklist, /Operator Checklist/);
});
