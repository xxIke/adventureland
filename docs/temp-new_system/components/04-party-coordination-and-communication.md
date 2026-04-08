# Party Coordination and Communication

## Purpose

Coordinate merchant and hunters around shared objectives, party integrity, supplies, and local decisions.

## Responsibilities

- party maintenance
- command and status messaging
- objective dissemination
- shared supply and wishlist coordination

## Dependencies

- runtime/shared-state layer
- world model
- config/roster

## Explicit non-responsibilities

- direct combat logic
- direct path execution

## Candidate design patterns

### Leader/follower command model

- Pros:
  - simple and practical
  - fits merchant-led or commander-led coordination
- Cons:
  - can become brittle if the leader fails or is overloaded

### Shared localStorage blackboard

- Pros:
  - simple browser-native shared memory mechanism
  - useful for durable snapshots
- Cons:
  - weak freshness guarantees
  - easy to create ownership conflicts

### CM message protocol with localStorage fallback

- Pros:
  - combines active communication with persistent fallback
  - fits strongest prior-art usage
- Cons:
  - requires explicit protocol design
  - more moving parts than one-channel solutions

### Hybrid leader directives plus shared status snapshots

- Pros:
  - clean separation between commands and durable status
  - scales well for merchant/hunter coordination
- Cons:
  - requires discipline in message and key design

## Recommended default pattern

Use hybrid leader-issued directives plus shared status snapshots:

- CM for active commands and responses
- localStorage for objective/status snapshots and recovery-friendly shared data

## Notes about known AdventureLand/browser constraints

- localStorage should hold status, not become the sole live command bus.
- CM payloads should be versioned and typed.
- Party leader authority should be explicit, but not hidden in hardcoded names.
