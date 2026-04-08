# Overview

## Goal

This document set defines the baseline requirements for a fresh AdventureLand bot implemented in the native client/browser CODE environment.

The target is not a custom client or external bot platform. The design should assume:

- JavaScript in the official game runtime
- browser/native client constraints
- multi-character coordination through in-game mechanisms and browser-side persistence

## Scope boundary

In scope:

- practical browser-native automation
- party coordination
- merchant support
- progression-aware farming and item improvement
- maintainable subsystem boundaries
- debugging and recovery sufficient for iterative development

Out of scope:

- custom protocol clients
- external process orchestration
- containerization
- host-machine services as design prerequisites

## Source basis

These requirements are synthesized from:

- `adventureland/main`
- `adventureland/codex`
- `hyper-fixate`
- `PBot`
- `IkeBot` docs as architecture prior art
- the official game reference in `IkeBot/reference/`

## Requirement interpretation

Each requirement records:

- Description
- Why it matters
- Minimum baseline behavior
- Priority:
  - `must`: needed for a practical fresh implementation
  - `should`: strong near-term capability
  - `later`: useful, but not foundational for the first disciplined implementation
