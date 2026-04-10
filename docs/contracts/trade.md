---
system: Trade
writes: nothing
reads:
  ctx.config:
    - roster
  ctx.world:
    - partyMembers
    - charactersOfferingTrade
game_globals:
  - character
  - trade_sell()
  - trade_buy()
  - send_item()
  - send_gold()
  - item_value()
  - parent.entities
  - distance()
---

# Trade Contract

## Identity

The Trade system handles entity-level trade interactions — item/gold transfer and trade-slot fulfillment. It runs parallel to attack/heal/skills as an independent scheduled system. Hunter strategies send junk and gold to the merchant when nearby. Merchant strategies fulfill trade-slot buy requests from nearby characters.

**Scheduling**: Registered as `'trade'` at ~2000ms interval. Adaptive. Trade interactions are not time-critical.

## Dependencies

- `ctx.config` — reads `roster` (own characters, merchant name)
- `ctx.world` — reads `partyMembers`, `charactersOfferingTrade`
- `ctx.logger` — logs trade actions and errors
- Game globals: `character`, `trade_sell()`, `trade_buy()`, `send_item()`, `send_gold()`, `item_value()`, `parent.entities`, `distance()`

**Does NOT read** `ctx.targeting`, `ctx.objective`, or any combat system. Trade decisions are based on proximity and inventory state.

## Public Interface

### `createTrade(ctx, strategy)`

Creates and returns a Trade system instance.

**Parameters:**
- `ctx` (object) — shared context
- `strategy` (object) — trade strategy implementing the strategy interface

**Returns:** Object with:
- `tick()` — evaluation function registered with scheduler

### `trade.tick()`

1. **Death check**: If `character.rip`, return `{ delay: 2000 }`.
2. **Evaluate**: Call `strategy.evaluate(ctx)`. Strategy decides all trade logic.
3. **Adaptive delay**: Return `{ delay }` from strategy, or default `{ delay: 2000 }`.

## Trade Strategy Interface

```
{
  name: string,
  evaluate(ctx) -> { delay: number } | void,
}
```

Strategies are responsible for all trade logic: proximity checks, item selection, price evaluation, and API calls.

### `createHunterTradeStrategy()`

- `name`: `'hunter-trade'`
- **Behavior**: When merchant is visible in `parent.entities` and within ~200 distance, send junk items and excess gold.
- **Keep items**: Potions (hp/mp), stand, tracker — uses `isKeepItem()` utility.
- **Send items**: All non-keep items via `send_item(merchantName, slot, quantity)`.
- **Send gold**: Excess gold above reserve (~10000g) via `send_gold(merchantName, excess)`.
- **Throttle**: Only send once per ~30s to avoid spam. Track via closure timestamp.

### `createMerchantTradeStrategy()`

- `name`: `'merchant-trade'`
- **Behavior**: Scan nearby entities for trade-slot buy requests. Fulfill where profitable or for own characters.
- **Own characters**: Always fulfill via `trade_sell()` regardless of price (1g from R55).
- **Friendly characters**: Fulfill if `price >= item_value(item) * 0.8`.
- **Others**: Fulfill if `price >= item_value(item) * 1.2`.
- **Pattern**: Iterate `entity.slots`, check for `slot.b` flag (buy request), validate inventory has item, call `trade_sell(entity, slotName, quantity)`.
- **Standing offers (R29)**: Future extension — merchant posts buy/sell listings at configured prices.

## Behavior Contracts

### Invariants

1. Trade never writes to `ctx.world`, `ctx.objective`, or `ctx.targeting`.
2. Trade never calls `attack()`, `heal()`, `move()`, or `use_skill()`.
3. The tick function never throws to the scheduler.

### Error Handling

1. If `trade_sell()`, `send_item()`, or `send_gold()` throws or rejects, log and continue.
2. If `parent.entities` is unavailable, skip tick.
3. The tick never throws to the scheduler.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R55 (trade-slot resupply) | Hunter posts buy requests, merchant fulfills via trade_sell() |
| R28 (player trade interaction) | Merchant evaluates trade offers from non-own characters with price gating |
| R42 (explicit responsibilities) | Trade handles item/gold transfer only. Does not attack, move, or decide objectives. |
| R44 (no silent failures) | All trade errors caught and logged |
