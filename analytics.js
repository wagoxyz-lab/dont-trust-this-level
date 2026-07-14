(() => {
  'use strict';

  const EVENT_KEY = 'dont-trust-this-level:analytics:v1';
  const PLAYER_KEY = 'dont-trust-this-level:player-id';
  const MAX_EVENTS = 2500;

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
      if (!id) {
        id = window.crypto?.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.localStorage.setItem(PLAYER_KEY, id);
      }
      return id;
    } catch {
      return 'local-player';
    }
  }

  function writeEvent(type, data = {}) {
    const event = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
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

    const endpoint = window.GAME_ANALYTICS_ENDPOINT;
    if (endpoint) {
      const body = JSON.stringify(event);
      if (!navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'application/json' }))) {
        fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    }

    window.dispatchEvent(new CustomEvent('game-analytics-update'));
    return event;
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
