/**
 * Trade — entity-level trade interactions running parallel to attack/heal/skills.
 *
 * Hunter strategy sends junk items and excess gold to the merchant when nearby.
 * Merchant strategy fulfills buy requests in nearby characters' trade slots via
 * trade_sell(). Uses the strategy pattern for role-specific behavior.
 */

import { isKeepItem, tradeSell, sendItem, sendGold } from './utils.js';

/**
 * Creates a hunter trade strategy that sends junk and gold to the merchant when nearby.
 *
 * Keeps potions, scrolls, stand, and tracker. Sends everything else via send_item().
 * Sends excess gold above a reserve amount via send_gold().
 * Throttled to one send cycle per ~30s to avoid spam.
 *
 * @returns {{ name: string, evaluate: Function }}
 */
export function createHunterTradeStrategy() {
  let lastSendTime = 0;
  const SEND_COOLDOWN = 30000;
  const GOLD_RESERVE = 10000;

  return {
    name: 'hunter-trade',

    evaluate(ctx) {
      if (Date.now() - lastSendTime < SEND_COOLDOWN) return { delay: 5000 };

      const merchantName = ctx.config.roster?.merchant;
      if (!merchantName) return { delay: 5000 };

      // Find merchant entity nearby
      let merchantEntity = null;
      for (const id in parent.entities) {
        const e = parent.entities[id];
        if (e && e.name === merchantName && e.type === 'character' && !e.dead) {
          merchantEntity = e;
          break;
        }
      }
      if (!merchantEntity || distance(character, merchantEntity) > 200) return { delay: 5000 };

      lastSendTime = Date.now();
      let sentCount = 0;

      // Send non-keep items to merchant
      for (let i = 0; i < character.items.length; i++) {
        const item = character.items[i];
        if (!item) continue;
        if (isKeepItem(item)) continue;
        sendItem(merchantName, i, item.q || 1).catch(e =>
          ctx.logger.debug('trade', `send_item failed slot ${i}: ${e.message}`)
        );
        sentCount++;
      }

      // Send excess gold
      if (character.gold > GOLD_RESERVE) {
        sendGold(merchantName, character.gold - GOLD_RESERVE).catch(e =>
          ctx.logger.debug('trade', `send_gold failed: ${e.message}`)
        );
      }

      if (sentCount > 0) {
        ctx.logger.info('trade', `Sent ${sentCount} items to ${merchantName}`);
      }

      return { delay: 5000 };
    },
  };
}

/**
 * Creates a merchant trade strategy that fulfills buy requests in nearby characters' trade slots.
 *
 * Own characters: always fulfill (any price). Friendly: price >= 80% item value.
 * Others: price >= 120% item value. Checks the `b` flag on trade slots to identify buy requests.
 *
 * @returns {{ name: string, evaluate: Function }}
 */
export function createMerchantTradeStrategy() {
  return {
    name: 'merchant-trade',

    evaluate(ctx) {
      const traders = ctx.world?.charactersOfferingTrade || [];
      if (traders.length === 0) return { delay: 3000 };

      const roster = ctx.config.roster;
      let fulfilled = 0;

      for (const entity of traders) {
        if (!entity.slots || entity.name === character.name) continue;
        if (distance(character, entity) > 200) continue;

        const isOwnCharacter = roster?.available?.includes(entity.name);

        for (const slotName in entity.slots) {
          if (!slotName.includes('trade')) continue;
          const slot = entity.slots[slotName];
          if (!slot || !slot.b) continue; // Only buy requests

          // Check if merchant has the requested item
          let haveItem = false;
          for (let i = 0; i < character.items.length; i++) {
            if (character.items[i]?.name === slot.name) { haveItem = true; break; }
          }
          if (!haveItem) continue;

          // Price evaluation
          if (!isOwnCharacter) {
            const value = typeof item_value === 'function' ? item_value(slot) : 0;
            const isFriendly = roster?.available?.includes(entity.name) ||
              ctx.config.friendlyPlayers?.includes(entity.owner);
            const threshold = isFriendly ? value * 0.8 : value * 1.2;
            if (slot.price < threshold) continue;
          }

          tradeSell(entity, slotName, slot.q || 1).catch(e =>
            ctx.logger.debug('trade', `trade_sell to ${entity.name} failed: ${e.message}`)
          );
          fulfilled++;
        }
      }

      if (fulfilled > 0) {
        ctx.logger.info('trade', `Fulfilled ${fulfilled} trade requests`);
      }

      return { delay: 2000 };
    },
  };
}

/**
 * Creates the trade system that delegates to the provided strategy each tick.
 *
 * @param {object} ctx - Shared context
 * @param {object} strategy - Trade strategy with `evaluate(ctx)` method
 * @returns {{ tick: Function }}
 */
export function createTrade(ctx, strategy) {
  function tick() {
    try {
      if (character.rip) return { delay: 2000 };

      const result = strategy.evaluate(ctx);
      return result && result.delay ? result : { delay: 2000 };
    } catch (e) {
      ctx.logger.error('trade', `tick error: ${e.message}`);
      return { delay: 2000 };
    }
  }

  return { tick };
}
