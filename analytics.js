(() => {
  'use strict';

  const EVENT_KEY = 'dont-trust-this-level:analytics:v1';
  const PLAYER_KEY = 'dont-trust-this-level:player-id';
  const MAX_EVENTS = 2500;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function uuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  function readEvents() {
    try {
      const value = JSON.parse(window.localStorage.getItem(EVENT_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function playerId() {
    try {
      let id = window.localStorage.getItem(PLAYER_KEY);
      if (!id || !UUID_PATTERN.test(id)) {
        id = uuid();
        window.localStorage.setItem(PLAYER_KEY, id);
      }
      return id;
    } catch {
      return 'local-player';
    }
  }

  function writeEvent(type, data = {}) {
    const event = {
      id: uuid(),
      type,
      playerId: playerId(),
      timestamp: new Date().toISOString(),
      data
    };

    const events = readEvents();
    events.push(event);
    try {
      window.localStorage.setItem(EVENT_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
    } catch {
      // Analytics must never interrupt gameplay.
    }

    sendToCloud(event);

    window.dispatchEvent(new CustomEvent('game-analytics-update'));
    return event;
  }

  function sendToCloud(event) {
    const config = window.GAME_CLOUD_CONFIG;
    if (!config?.url || !config?.publishableKey) return;
    const payload = {
      event_id: event.id,
      event_type: event.type,
      player_id: event.playerId,
      occurred_at: event.timestamp,
      chapter: Number(event.data?.chapter) || null,
      deaths: Number.isFinite(event.data?.deaths) ? event.data.deaths : null,
      page_path: event.data?.path || null
    };
    fetch(`${config.url}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${config.publishableKey}`,
        'content-type': 'application/json',
        prefer: 'return=minimal'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  function trackVisit() {
    const sessionKey = 'dont-trust-this-level:visit-recorded';
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, 'true');
    } catch {
      // Record the visit when session storage is unavailable.
    }
    writeEvent('visit', { path: window.location.pathname });
  }

  window.gameAnalytics = {
    track: writeEvent,
    trackVisit,
    getEvents: readEvents,
    getPlayerId: playerId,
    clear() {
      window.localStorage.removeItem(EVENT_KEY);
      window.dispatchEvent(new CustomEvent('game-analytics-update'));
    }
  };
})();
