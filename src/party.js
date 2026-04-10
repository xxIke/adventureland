/**
 * Party — manages party assembly, tank election, status publishing, and
 * cross-character messaging via the game's CM (character mail) system.
 *
 * Periodically invites roster members to the party, publishes character status
 * to localStorage for cross-tab coordination, and handles incoming CMs from
 * friendly characters. Tank and party stats are assigned by the merchant via
 * localStorage (al_bot:party:stats); all characters read from there.
 */

import { countItem, isFriendlyName, isUpgrade } from './utils.js';

/** Scores a party member's suitability as tank based on survivability stats. */
function calculateTankScore(member) {
  return (member.max_hp || 0) + (member.armor || 0) + (member.resistance || 0);
}

/** Checks merchant item catalogue for gear upgrades this character could use. */
function getGearRequests() {
  try {
    const raw = localStorage.getItem('al_bot:merchant:catalogue');
    if (!raw) return [];
    const catalogue = JSON.parse(raw);
    const requests = [];
    for (const itemName in catalogue) {
      const entry = catalogue[itemName];
      if (typeof entry !== 'object' || !entry.max) continue;
      // Check each equipment slot for upgrade opportunity
      for (const slotName in character.slots) {
        const equipped = character.slots[slotName];
        if (!equipped) continue;
        if (equipped.name === itemName && isUpgrade({ name: itemName, level: entry.max }, equipped)) {
          requests.push({ slot: slotName, itemName, level: entry.max });
        }
      }
    }
    return requests;
  } catch (e) {
    return [];
  }
}

/**
 * Creates the party system that manages assembly, tank election, and inter-character communication.
 *
 * Installs global handlers (`on_cm`, `on_party_invite`, `on_party_request`) for the game's
 * event system. Merchants send invites; combat characters send requests to the merchant.
 * Status snapshots are written to localStorage with `al_bot:party:` prefix for cross-tab visibility.
 *
 * @param {object} ctx - Shared context; this function initializes `ctx.party`
 * @returns {{ tick: Function, sendMessage: Function, getState: Function }}
 */
export function createParty(ctx) {
  ctx.party = {
    tank: null,
    basic_dps: null,
    travelSync: { destination: null, slowestSpeed: null, active: false },
  };

  let statusTimer = 0;
  const STATUS_INTERVAL = 5000;
  const STATUS_KEY_PREFIX = 'al_bot:party:';
  const PARTY_STATS_KEY = 'al_bot:party:stats';
  const isMerchant = ctx.config.roster?.self?.isMerchant;

  function updateTankLocal() {
    const members = ctx.world?.partyMembers || [];
    if (members.length === 0) {
      ctx.party.tank = null;
      return;
    }

    let bestName = character.name;
    let bestScore = calculateTankScore(character);

    for (const member of members) {
      if (!member) continue;
      const score = calculateTankScore(member);
      if (score > bestScore) {
        bestScore = score;
        bestName = member.name;
      }
    }

    ctx.party.tank = bestName;
  }

  function readPartyStats() {
    try {
      const raw = localStorage.getItem(PARTY_STATS_KEY);
      if (!raw) return null;
      const stats = JSON.parse(raw);
      if (stats && stats.lastUpdated && Date.now() - stats.lastUpdated < 30000) {
        return stats;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function writePartyStats() {
    if (!isMerchant) return;

    const roster = ctx.config.roster;
    if (!roster) return;

    // Calculate tank from all party member status snapshots
    let bestTank = character.name;
    let bestScore = calculateTankScore(character);
    let totalDps = 0;

    for (const name of roster.active) {
      try {
        const raw = localStorage.getItem(`${STATUS_KEY_PREFIX}${name}:status`);
        if (!raw) continue;
        const snap = JSON.parse(raw);
        if (!snap || !snap.alive || Date.now() - snap.lastUpdated > 30000) continue;

        const score = calculateTankScore(snap);
        if (score > bestScore) {
          bestScore = score;
          bestTank = snap.name;
        }

        // Estimate DPS from character attack stats if available
        if (snap.attack && snap.frequency) {
          totalDps += snap.attack * snap.frequency;
        }
      } catch (e) {
        // Skip unparseable snapshots
      }
    }

    try {
      localStorage.setItem(PARTY_STATS_KEY, JSON.stringify({
        tank: bestTank,
        basic_dps: totalDps,
        lastUpdated: Date.now(),
      }));
    } catch (e) {
      ctx.logger.warn('party', `Failed to write party stats: ${e.message}`);
    }

    // Travel sync: detect if any party member is traveling and find slowest speed
    let anyTraveling = false;
    let slowestSpeed = Infinity;
    let travelDest = null;
    for (const name of roster.active) {
      try {
        const raw = localStorage.getItem(`${STATUS_KEY_PREFIX}${name}:status`);
        if (!raw) continue;
        const snap = JSON.parse(raw);
        if (!snap || !snap.alive || Date.now() - snap.lastUpdated > 30000) continue;
        if (snap.objective === 'travel') {
          anyTraveling = true;
          if (snap.target) travelDest = snap.target;
        }
        if (snap.speed && snap.speed < slowestSpeed) {
          slowestSpeed = snap.speed;
        }
      } catch (e) { /* skip */ }
    }
    // Also include own speed
    if (character.speed && character.speed < slowestSpeed) {
      slowestSpeed = character.speed;
    }

    const travelSync = anyTraveling && slowestSpeed < Infinity
      ? { destination: travelDest, slowestSpeed, active: true, lastUpdated: Date.now() }
      : { destination: null, slowestSpeed: null, active: false, lastUpdated: Date.now() };

    try {
      localStorage.setItem('al_bot:party:travel', JSON.stringify(travelSync));
    } catch (e) {
      ctx.logger.debug('party', `Failed to write travel sync: ${e.message}`);
    }
  }

  function updatePartyContext() {
    const stats = readPartyStats();
    if (stats) {
      ctx.party.tank = stats.tank;
      ctx.party.basic_dps = stats.basic_dps;
    } else {
      // Fallback: local tank calculation when no merchant stats available
      updateTankLocal();
    }

    // Read travel sync from localStorage
    try {
      const raw = localStorage.getItem('al_bot:party:travel');
      if (raw) {
        const sync = JSON.parse(raw);
        if (sync && sync.lastUpdated && Date.now() - sync.lastUpdated < 30000) {
          ctx.party.travelSync = sync;
        } else {
          ctx.party.travelSync = { destination: null, slowestSpeed: null, active: false };
        }
      }
    } catch (e) {
      // Keep existing travelSync on parse failure
    }
  }

  function assembleParty() {
    const roster = ctx.config.roster;
    if (!roster) return;

    const currentParty = get_party() || {};

    for (const name of roster.active) {
      if (name === character.name) continue;
      if (currentParty[name]) continue;

      if (parent.entities) {
        for (const id in parent.entities) {
          const e = parent.entities[id];
          if (e && e.name === name && e.type === 'character') {
            try {
              if (isMerchant) {
                send_party_invite(name);
              } else if (name === roster.merchant) {
                send_party_request(name);
              }
            } catch (e) {
              ctx.logger.warn('party', `invite/request failed for ${name}: ${e.message}`);
            }
            break;
          }
        }
      }
    }
  }

  function publishStatus() {
    const now = Date.now();
    if (now - statusTimer < STATUS_INTERVAL) return;
    statusTimer = now;

    const restockThresholds = ctx.config.restockThresholds?.potionsPerHunter || {};
    const potions = {
      hpot0: countItem('hpot0'),
      hpot1: countItem('hpot1'),
      mpot0: countItem('mpot0'),
      mpot1: countItem('mpot1'),
    };

    let emptySlots = 0;
    for (let i = 0; i < character.items.length; i++) {
      if (character.items[i] === null) emptySlots++;
    }

    // Check if any potion is below 50% of target
    let potionLow = false;
    for (const key in restockThresholds) {
      if (potions[key] !== undefined && potions[key] < restockThresholds[key] * 0.5) {
        potionLow = true;
        break;
      }
    }

    const snapshot = {
      name: character.name,
      ctype: character.ctype,
      hp: character.hp,
      max_hp: character.max_hp,
      mp: character.mp,
      max_mp: character.max_mp,
      level: character.level,
      map: character.map,
      x: character.real_x,
      y: character.real_y,
      attack: character.attack,
      frequency: character.frequency,
      armor: character.armor,
      resistance: character.resistance,
      speed: character.speed,
      objective: ctx.objective?.type || 'idle',
      target: ctx.objective?.target || null,
      alive: !character.rip,
      potions,
      emptySlots,
      gold: character.gold,
      needsResupply: potionLow || emptySlots < character.items.length * 0.5,
      gearRequests: getGearRequests(),
      lastUpdated: now,
    };

    try {
      localStorage.setItem(
        `${STATUS_KEY_PREFIX}${character.name}:status`,
        JSON.stringify(snapshot)
      );
    } catch (e) {
      ctx.logger.warn('party', `status publish failed: ${e.message}`);
    }
  }

  function handleCM(sender, data) {
    if (!isFriendlyName(sender, ctx)) {
      ctx.logger.warn('party', `CM from unknown sender: ${sender}`);
      return;
    }

    if (!data || !data.type) {
      ctx.logger.debug('party', `untyped CM from ${sender}`);
      return;
    }

    switch (data.type) {
      case 'party-invite':
        ctx.logger.info('party', `party-invite from ${sender}`);
        break;
      case 'objective-directive':
        ctx.logger.info('party', `objective-directive from ${sender}: ${JSON.stringify(data.data)}`);
        if (data.data?.farmTarget !== undefined) {
          try {
            localStorage.setItem('al_bot:config:farmTarget', JSON.stringify(data.data.farmTarget));
            ctx.config.reload();
            ctx.bus.emit('config:farm-target-changed', data.data);
            ctx.logger.info('party', `farmTarget updated to ${data.data.farmTarget}`);
          } catch (e) {
            ctx.logger.error('party', `Failed to apply objective-directive: ${e.message}`);
          }
        }
        break;
      case 'status-request':
        publishStatus();
        break;
      case 'emergency':
        ctx.logger.warn('party', `emergency from ${sender}: ${data.data?.type}`);
        break;
      default:
        ctx.logger.debug('party', `unknown CM type '${data.type}' from ${sender}`);
    }
  }

  function handlePartyInvite(name) {
    if (isFriendlyName(name, ctx)) {
      accept_party_invite(name);
      ctx.logger.info('party', `accepted invite from ${name}`);
      updatePartyContext();
    }
  }

  function handlePartyRequest(name) {
    if (isFriendlyName(name, ctx)) {
      accept_party_request(name);
      ctx.logger.info('party', `accepted request from ${name}`);
      updatePartyContext();
    }
  }

  on_cm = handleCM;
  on_party_invite = handlePartyInvite;
  on_party_request = handlePartyRequest;

  let lastMemberCount = 0;

  function tick() {
    try {
      assembleParty();

      const memberCount = (ctx.world?.partyMembers || []).length;
      if (memberCount !== lastMemberCount) {
        lastMemberCount = memberCount;
      }

      // Merchant writes party stats; all characters read them
      if (isMerchant) {
        writePartyStats();
      }
      updatePartyContext();

      publishStatus();
    } catch (e) {
      ctx.logger.error('party', `tick error: ${e.message}`);
    }
  }

  function sendMessage(target, type, data) {
    try {
      send_cm(target, {
        type,
        sender: character.name,
        data,
        timestamp: Date.now(),
      });
    } catch (e) {
      ctx.logger.error('party', `sendMessage failed to ${target}: ${e.message}`);
    }
  }

  updatePartyContext();

  return {
    tick,
    sendMessage,
    getState() {
      const currentParty = get_party();
      const roster = ctx.config.roster;
      const members = Object.keys(currentParty);
      const missing = (roster?.active || []).filter(n => n !== character.name && !currentParty[n]);
      return { members, missing, tank: ctx.party.tank, basic_dps: ctx.party.basic_dps };
    },
  };
}
