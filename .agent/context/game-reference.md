# Game Reference

## External Server Code

Official Adventure Land server code is available for reference at:

```
/home/tron/game_things/AdventureLand/IkeBot/reference/
```

### Authoritative Sources

| Directory | Contents |
|-----------|----------|
| `adventureland_mongodb/` | Official server code — game logic, monster spawning/growth, damage formulas, loot tables, NPC behavior |
| `common_engine/` | Shared game engine code — movement, collision, stat calculations |
| `adventureland-appserver/` | Backend services — authentication, instance management |

### Excluded — Not Authoritative

| Directory | Why Excluded |
|-----------|-------------|
| `ALClient/` | Third-party community TypeScript client. Not official — may contain inaccurate type definitions or assumptions. |
| `caracAL/` | Third-party community Node.js client. Not official — implementation choices may not match actual game behavior. |

These are community implementations that may add confusion or ambiguity. Do not reference them for game API verification.

## When to Use

- Verifying server-side behavior for game mechanics not documented in `docs/game-api.md`
- Understanding formulas (damage, growth curves, drop rates) from the actual server implementation
- Resolving ambiguity in contracts about how the game works
- Discovering entity properties or API behaviors not yet captured in project docs

## When NOT to Use

- Do not import from or depend on reference code at runtime
- Do not copy code into the project — extract the knowledge, document it in `docs/game-api.md`
- Do not reference third-party client code (ALClient, caracAL) as authoritative

## Project Game API Documentation

The project's own game API reference is at `docs/game-api.md`. This documents the subset of game behavior that contracts depend on. **Check `docs/game-api.md` first** — use the external server reference only to fill gaps or verify claims.

When new game API knowledge is extracted from the server reference, add it to `docs/game-api.md` so it becomes part of the project's documented knowledge base.
