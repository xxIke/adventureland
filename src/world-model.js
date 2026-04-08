export function createWorldModel(ctx) {
  let previousHostilePlayers = [];
  let previousSpecialMonsters = [];

  function isFriendly(entity) {
    if (entity.owner === character.owner) return true;
    if (entity.party && entity.party === character.party) return true;
    if (character.friends && character.friends.includes(entity.owner)) return true;
    return false;
  }

  function tick() {
    const specialMonsters = [];
    const targetMonsters = [];
    const easyMonsters = [];
    const hostileMonsters = [];
    const hostilePlayers = [];
    const partyMembers = [character];
    const charactersOfferingTrade = [];

    // Entities with a target are collected here; hostile check is deferred
    // until after the pass so we have the full party member set
    const potentialHostileMonsters = [];
    const potentialHostilePlayers = [];

    try {
      for (const id in parent.entities) {
        let e;
        try {
          e = parent.entities[id];
          if (!e.visible || e.dead || e.rip || e.type === 'npc') continue;
        } catch (err) {
          console.error('[WorldModel] Error reading entity:', err);
          continue;
        }

        if (e.type === 'character') {
          if (isFriendly(e) && e.party === character.party) {
            partyMembers.push(e);
          } else if (e.target) {
            potentialHostilePlayers.push(e);
          }

          if (e.slots) {
            for (const slot in e.slots) {
              if (slot.includes('trade') && e.slots[slot]) {
                charactersOfferingTrade.push(e);
                break;
              }
            }
          }
        } else if (e.type === 'monster') {
          if (e.xp < 0) continue;

          if (e.target) {
            potentialHostileMonsters.push(e);
          }

          const specialList = ctx.config.specialMonsters;
          if (specialList.some(s => e.mtype?.includes(s) || e.name?.includes(s))) {
            specialMonsters.push(e);
          }

          if (ctx.config.farmTarget && e.mtype === ctx.config.farmTarget) {
            targetMonsters.push(e);
          }

          if (e.hp < character.attack * 0.8) {
            easyMonsters.push(e);
          }
        }
      }
    } catch (err) {
      console.error('[WorldModel] Error during entity survey:', err);
    }

    // Resolve hostiles now that party is fully known
    const partyNames = new Set(partyMembers.map(m => m.name));
    for (const e of potentialHostileMonsters) {
      if (partyNames.has(e.target)) {
        hostileMonsters.push(e);
      }
    }
    for (const e of potentialHostilePlayers) {
      if (partyNames.has(e.target)) {
        hostilePlayers.push(e);
      }
    }

    // Emit signals for newly detected threats/opportunities
    const prevHostileNames = new Set(previousHostilePlayers.map(p => p.name));
    for (const p of hostilePlayers) {
      if (!prevHostileNames.has(p.name)) {
        ctx.bus.emit('world:hostile-player-detected', { player: p });
      }
    }

    const prevSpecialIds = new Set(previousSpecialMonsters.map(m => m.id));
    for (const m of specialMonsters) {
      if (!prevSpecialIds.has(m.id)) {
        ctx.bus.emit('world:special-monster-detected', { monster: m });
      }
    }

    previousHostilePlayers = hostilePlayers;
    previousSpecialMonsters = specialMonsters;

    ctx.world.specialMonsters = specialMonsters;
    ctx.world.targetMonsters = targetMonsters;
    ctx.world.easyMonsters = easyMonsters;
    ctx.world.hostileMonsters = hostileMonsters;
    ctx.world.hostilePlayers = hostilePlayers;
    ctx.world.partyMembers = partyMembers;
    ctx.world.charactersOfferingTrade = charactersOfferingTrade;
    ctx.world.lastUpdated = Date.now();
  }

  return { tick };
}
