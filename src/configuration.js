/**
 * Configuration — centralized bot settings combining game API data with localStorage overrides.
 *
 * Populates the character roster from `get_characters()`, reads user-configurable
 * values (active roster, farm target) from localStorage with `al_bot:config:` prefix,
 * and exposes thresholds and toggles consumed by other systems.
 */

/**
 * Creates the configuration object, loading roster from the game API and
 * persisted overrides from localStorage.
 *
 * @returns {object} Config object with `roster`, `thresholds`, `toggles`, `farmTarget`, and `reload()`
 */
export function createConfig() {
  const config = {
    roster: {
      available: [],
      active: [],
      characters: {},
      merchant: null,
      self: {
        name: character.name,
        ctype: character.ctype,
        isMerchant: character.ctype === 'merchant',
      },
    },
    thresholds: {
      hpPotionPercent: 0.5,
      mpPotionPercent: 0.3,
      fleeHpPercent: 0.2,
    },
    toggles: {
      pvpDefense: true,
      autoUpgrade: false,
    },
    specialMonsters: ['phoenix', 'mvampire'],
    farmTarget: null,
    reload,
  };

  function loadAvailableRoster() {
    try {
      const chars = get_characters();
      config.roster.available = chars.map(c => c.name);
      config.roster.characters = {};
      for (const c of chars) {
        config.roster.characters[c.name] = { name: c.name, ctype: c.ctype, online: c.online };
        if (c.ctype === 'merchant') {
          config.roster.merchant = c.name;
        }
      }
    } catch (e) {
      console.error('[Config] get_characters() failed:', e);
      config.roster.available = [];
      config.roster.characters = {};
      config.roster.merchant = null;
    }
  }

  function loadLocalStorageValues() {
    // Active roster
    try {
      const raw = localStorage.getItem('al_bot:config:activeRoster');
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          config.roster.active = parsed;
        } else {
          console.warn('[Config] al_bot:config:activeRoster is not an array, ignoring');
          config.roster.active = config.roster.available.filter(
            name => config.roster.characters[name]?.online > 0
          );
        }
      } else {
        config.roster.active = config.roster.available.filter(
          name => config.roster.characters[name]?.online > 0
        );
      }
    } catch (e) {
      console.warn('[Config] Failed to parse al_bot:config:activeRoster:', e);
      config.roster.active = config.roster.available.filter(
        name => config.roster.characters[name]?.online > 0
      );
    }

    // Farm target
    try {
      const raw = localStorage.getItem('al_bot:config:farmTarget');
      config.farmTarget = raw !== null ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[Config] Failed to parse al_bot:config:farmTarget:', e);
      config.farmTarget = null;
    }
  }

  function reload() {
    loadLocalStorageValues();
  }

  loadAvailableRoster();
  loadLocalStorageValues();

  return config;
}
