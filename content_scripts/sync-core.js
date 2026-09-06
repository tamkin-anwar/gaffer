// ---------------------------------------------------------------------------
// Tandem sync core — shared by every site-specific adapter (netflix.js, etc).
//
// Talks to Firebase Realtime Database over plain REST + the RTDB streaming
// API (Server-Sent Events on a .json endpoint), not the Firebase SDK. That
// keeps the extension dependency-free and avoids Manifest V3's restrictions
// on remote code in content scripts — this is just fetch() and EventSource,
// both native.
//
// A note on why sync lives in each content script rather than the background
// service worker: MV3 service workers get suspended after ~30s of
// inactivity, which would silently kill a long-lived EventSource stream.
// Content scripts stay alive for as long as the tab is open on a matching
// page, which is exactly the lifetime a "watch together" connection needs.
// ---------------------------------------------------------------------------

(function () {
  const CLIENT_ID = 'c_' + Math.random().toString(36).slice(2, 10);
  const APPLY_REMOTE_GUARD_MS = 400; // suppress re-broadcasting a change we just applied ourselves
  const DRIFT_CHECK_MS = 2000;
  const DRIFT_TOLERANCE_S = 0.5;
  const CLOCK_RECALIBRATE_MS = 60000;

  let config = null;       // { roomId, dbUrl }
  let video = null;
  let es = null;            // EventSource
  let applyingRemote = false;
  let lastRemote = null;    // { time, ts, playing } — for drift correction
  let driftTimer = null;
  let clockTimer = null;
  let serverOffsetMs = 0;   // add to Date.now() to estimate the Firebase server's clock
  let onStatus = () => {};  // callback(status: 'connected'|'disconnected'|'no-room')

  function log(...args) { console.log('[Tandem]', ...args); }

  function roomUrl(path) {
    return `${config.dbUrl.replace(/\/$/, '')}/rooms/${encodeURIComponent(config.roomId)}/${path}.json`;
  }

  // Over a long-distance connection, the two devices' own clocks can easily
  // be a few hundred ms apart — enough to matter for tight sync. Rather than
  // trust each device's local clock, calibrate once against the shared
  // Firebase server's clock (the same NTP-style trick used for any
  // low-latency sync): write a server-timestamp placeholder, see what the
  // server resolved it to, and back out the round-trip-adjusted offset.
  async function calibrateClock() {
    if (!config) return;
    try {
      const t0 = Date.now();
      const res = await fetch(roomUrl('_clock'), { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) });
      const t1 = Date.now();
      const serverTime = await res.json();
      if (typeof serverTime !== 'number') return;
      const rtt = t1 - t0;
      const estimatedServerNow = serverTime + rtt / 2; // the server likely stamped this roughly mid-flight
      serverOffsetMs = estimatedServerNow - t1;
    } catch (e) { /* keep the previous offset if this attempt fails */ }
  }
  function serverNow() { return Date.now() + serverOffsetMs; }

  function pushSync(type) {
    if (!config || applyingRemote || !video) return;
    const payload = { type, time: video.currentTime, playing: !video.paused, ts: { '.sv': 'timestamp' }, from: CLIENT_ID };
    fetch(roomUrl('sync'), { method: 'PUT', body: JSON.stringify(payload) }).catch((e) => log('push failed', e));
  }

  function applyRemote(data) {
    if (!data || data.from === CLIENT_ID || !video) return;
    applyingRemote = true;
    lastRemote = { time: data.time, ts: data.ts, playing: data.playing };
    const localTime = data.time + Math.max(0, (serverNow() - data.ts) / 1000); // account for time in transit
    if (Math.abs(video.currentTime - localTime) > 0.35) video.currentTime = localTime;
    if (data.playing && video.paused) video.play().catch(() => {});
    if (!data.playing && !video.paused) video.pause();
    setTimeout(() => { applyingRemote = false; }, APPLY_REMOTE_GUARD_MS);
  }

  function checkDrift() {
    if (!lastRemote || !lastRemote.playing || !video || video.paused || applyingRemote) return;
    const expected = lastRemote.time + (serverNow() - lastRemote.ts) / 1000;
    if (Math.abs(video.currentTime - expected) > DRIFT_TOLERANCE_S) {
      applyingRemote = true;
      video.currentTime = expected;
      setTimeout(() => { applyingRemote = false; }, APPLY_REMOTE_GUARD_MS);
    }
  }

  function connect() {
    if (es) es.close();
    if (clockTimer) clearInterval(clockTimer);
    if (!config || !config.roomId || !config.dbUrl) { onStatus('no-room'); return; }
    calibrateClock();
    clockTimer = setInterval(calibrateClock, CLOCK_RECALIBRATE_MS);
    es = new EventSource(roomUrl('sync'));
    es.addEventListener('put', (e) => {
      try { applyRemote(JSON.parse(e.data).data); } catch (err) { /* ignore malformed frames */ }
    });
    es.addEventListener('patch', (e) => {
      try { applyRemote(JSON.parse(e.data).data); } catch (err) { /* ignore malformed frames */ }
    });
    es.onopen = () => onStatus('connected');
    es.onerror = () => { onStatus('disconnected'); };
  }

  function attachVideo(el) {
    video = el;
    video.addEventListener('play', () => pushSync('play'));
    video.addEventListener('pause', () => pushSync('pause'));
    video.addEventListener('seeked', () => pushSync('seek'));
    driftTimer = setInterval(checkDrift, DRIFT_CHECK_MS);
  }

  function detachVideo() {
    video = null;
    if (driftTimer) clearInterval(driftTimer);
  }

  // ---------------------------------------------------------------------
  // Public API used by site adapters (window.TandemSync.*)
  // ---------------------------------------------------------------------
  window.TandemSync = {
    clientId: CLIENT_ID,
    /** Call once, with a function that returns the current <video> element
     *  (or null if not found yet) and a status callback. Site adapters are
     *  responsible for finding the right element and re-calling setVideo
     *  when the player is torn down/rebuilt (Netflix does this on episode
     *  change, for instance). */
    init(statusCallback) {
      onStatus = statusCallback || onStatus;
      chrome.storage.sync.get(['roomId', 'dbUrl'], (stored) => {
        config = { roomId: stored.roomId, dbUrl: stored.dbUrl };
        connect();
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        if (changes.roomId || changes.dbUrl) {
          chrome.storage.sync.get(['roomId', 'dbUrl'], (stored) => {
            config = { roomId: stored.roomId, dbUrl: stored.dbUrl };
            connect();
          });
        }
      });
    },
    setVideo(el) {
      if (video === el) return;
      detachVideo();
      if (el) attachVideo(el);
    },
  };
})();
