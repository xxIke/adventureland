# Intent: Party

Covers party formation, cross-character communication, status coordination, and tank management.

---

## Party Formation

- **What**: Auto-invite/request to form party from all online characters in roster
- **MVP**: Characters who come online send party party request to oldest character (longest online time). Characters accept party requests from friendly characters (owned by same player, or player in friends list). If a character is the oldest member, do nothing and await requests from newer characters.
- **End-state**: Merchant coordinated logic to join multiple player parties together. Merchants form party then invite their respective player characters to join party. Characters that come online send party request to merchant by default
- **Notes**: Currently implemented in party.js. Game API may rate-limit party invites.
- **Notes (additional)**: Party invites are a single request (no retry/cooldown known). Cannot distinguish declined vs ignored.

## Party Invite Acceptance

- **What**: Accept incoming party requests from known characters
- **MVP**: on_party_request handler accepts if sender is in roster or friendly.
- **End-state**: Also handle party invites to join merchant-formed multi-player party (post-MVP).
- **Notes**: Game uses different functions for invites vs requests. Invites ("hey you, join me") use accept_party_invite(). Requests ("I'd like to join you") use accept_party_request(). These are distinct API calls.
- **Multi-player**: Post-MVP. MVP is strictly single-player (4 characters: paladin, ranger, priest, merchant).

## CM Message Sending

- **What**: Send typed code messages between characters via send_cm()
- **MVP**: party.sendMessage(target, type, data) wraps send_cm with typed envelope (type, sender, data, timestamp). Do not process messages from non player owned characters
- **End-state**: Automated bot coordination for inter-player coordination within party. Potential way avenue to mess with hostile players if they have implemented secure message handling protocols. Some players stick with mvp and expect commands to execute, could have them teleport to town or d/c if they are attempting to be hostile
- **Notes**: Currently implemented. CMs are rate-limited by the game server. Fire-and-forget is appropriate for most messages.

## CM Message Routing

- **What**: Route incoming CMs by message type to appropriate handlers
- **MVP**: handleCM validates sender is friendly, routes by type (party-invite, objective-directive, status-request, emergency). Unknown types logged and discarded.
- **End-state**: Extensible routing — register handlers dynamically so new message types can be added without modifying party.js. Support for response/acknowledgment patterns.
- **Notes**: Currently implemented with switch statement. Adequate for MVP.

## Status Publishing

- **What**: Write character state snapshots to localStorage for cross-tab/cross-character visibility
- **MVP**: Every 5 seconds, publishes: name, ctype, hp, max_hp, mp, max_mp, level, map, position, objective, target, alive status.
- **End-state**: Add inventory summary (potion count, empty slots, gold) for merchant restock detection. Add combat metrics (DPS, kills/min) for objective optimization.
- **Notes**: Currently implemented. localStorage key: `al_bot:party:{name}:status`.

## Tank Identification

- **What**: Determine which party member is the tank (absorbs damage, others kite around)
- **MVP**: Tank = member with highest (max_hp + armor + resistance). Recalculated when party membership changes. Published to ctx.party.tank.
- **End-state**: Tank role could be explicitly assigned via config or CM directive rather than auto-calculated. Some parties may want a specific character as tank regardless of stats (e.g., warrior with taunt skills even if paladin has more HP).
- **Notes**: Currently implemented in party.js. Movement system reads ctx.party.tank for kite decisions.
- **Notes (additional)**: Configurable tank and mid-combat tank failover are beyond MVP.

## Config Broadcast

- **What**: Sync configuration across party members via CM (farm target, thresholds, toggles)
- **MVP**: Merchant publishes farm target to localStorage. Hunters read via config.farmTarget at boot + reload(). No real-time CM broadcast needed for MVP — localStorage polling is sufficient.
- **End-state**: Real-time config push via CM — merchant changes farm target, all hunters receive update immediately and switch targets. Support for per-character config overrides.
- **Notes**: hyper-fixate has update_config CM messages. For MVP, the localStorage approach works because config changes are infrequent (minutes/hours between target changes).

## Wishlist Coordination

- **What**: Hunters publish supply needs, merchant reads and fulfills
- **MVP**: Hunters publish with snapshot if resupply is needed to signal potion needs or high inventory (>50%) utilization 
- **End-state**: Hunters publish structured wishlists to show resupply needs and gear progression desires/intent. Merchant can then plan target stock for resupply and gear improvement objectives.
- **Notes**: hyper-fixate has update_wishlist CM. For MVP, the simpler approach is merchant monitoring potion levels from status snapshots.
- **MVP**: Hunters publish resupply-needed flag in status snapshot (potions < 50% target levels OR inventory > 50% full). Simple boolean signal.
- **End-state**: Structured wishlists: potion counts by tier, desired gear items. Merchant plans resupply and gear delivery from wishlist data.
- **Trade-slot complement**: Hunters also maintain trade slots listing needed items at 1g (see merchant.md resupply workflow). Merchant fulfills own characters' trade requests when nearby.

## Emergency Coordination

- **What**: Broadcast flee/regroup signals when party is in danger
- **MVP**: Not implemented. Characters independently flee when HP drops below threshold.
- **End-state**: Coordinated emergency response — any character can broadcast "flee" to all, causing party-wide retreat. "Regroup" signal with rally point. "Help" signal to summon party to character's location.
- **Notes**: Contract defines emergency CM type. Independent flee per character is adequate for MVP since each character manages its own survival.
