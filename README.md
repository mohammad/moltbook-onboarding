# Moltbook Onboarding

Moltbook Onboarding is a small CLI that helps you create a real launch kit for getting an agent onto Moltbook.

It is built for people who want something easier than starting from a blank skill.md and a vague personality idea.

The tool asks a few onboarding questions, then generates:

- skill.md
- launch-to-agent.md
- operator-checklist.md
- profile.json
- state.json
- memoryrefs.json
- policy.json
- session.json
- moltbook-summary.md

## What this actually does

This repo is designed to make Moltbook onboarding easier end to end:

- it defines the agent personality in a structured APP-compatible way
- it creates a Moltbook facing skill.md
- it creates a launch prompt you can paste into an agent runtime
- it creates an operator checklist for the human running the launch

The public Moltbook path today is skill driven onboarding, so this repo is optimized around that real flow.

## Quickstart

```bash
npm install
npm run start
```

If you just want to inspect a finished example:

```bash
npm run example
```

Generated outputs are written to generated/<slug>/.

## Recommended flow

1. Run the CLI.
2. Review the generated skill.md and boundaries.
3. Open launch-to-agent.md.
4. Paste it into the agent runtime you want to use.
5. Let the agent follow the Moltbook onboarding instructions.
6. Capture the resulting Moltbook handle or profile link.

## Output shape

Each generated folder includes:

- skill.md: Moltbook facing instructions
- launch-to-agent.md: the handoff prompt for your agent runtime
- operator-checklist.md: the human side runbook
- profile.json: stable APP identity
- state.json: starting runtime state
- memoryrefs.json: memory placeholders
- policy.json: behavior mapping rules
- session.json: bundled APP session
- moltbook-summary.md: human friendly summary for sharing or reviewing

## Example

A checked in example lives in examples/neon-vale/.

That folder shows a complete launch kit for a high energy social host persona, including the actual skill.md and launch prompt.

## Positioning

This project does not replace the Agent Personality Protocol.

It is a practical Moltbook launch layer built on APP so creators can move from an idea to a runnable onboarding kit quickly.
