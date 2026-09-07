// ---------------------------------------------------------------------------
// Netflix adapter. Finds the <video> element and keeps TetherSync pointed at
// it as Netflix's single-page app swaps the player in and out (browsing vs.
// watching, changing episodes, etc).
// ---------------------------------------------------------------------------

(function () {
  let statusBadge = null;

  function findVideo() {
    // Netflix's player renders a single <video> element while watching.
    // No stable id/class is guaranteed across Netflix's own redesigns, so
    // just take the first (and normally only) <video> on the page.
    return document.querySelector('video');
  }

  function showStatus(status) {
    if (!statusBadge) {
      statusBadge = document.createElement('div');
      statusBadge.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
        font: 590 12.5px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        padding: 8px 14px 8px 10px; border-radius: 999px; color: #fff;
        display: flex; align-items: center; gap: 7px; pointer-events: none;
        background: rgba(28,28,30,0.82); backdrop-filter: blur(14px) saturate(1.6);
        -webkit-backdrop-filter: blur(14px) saturate(1.6);
        box-shadow: 0 4px 20px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.08) inset;
        transition: opacity 0.35s ease, transform 0.35s ease; opacity: 0; transform: translateY(6px);
      `;
      const dot = document.createElement('span');
      dot.style.cssText = 'width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:background 0.25s;';
      statusBadge.appendChild(dot);
      const label = document.createElement('span');
      statusBadge.appendChild(label);
      document.documentElement.appendChild(statusBadge);
      statusBadge._dot = dot;
      statusBadge._label = label;
    }
    const labels = {
      connected: ['In sync', '#34c759'],
      disconnected: ['Reconnecting…', '#ff9f0a'],
      'no-room': ['Open Tether to join a room', '#8e8e93'],
    };
    const [text, color] = labels[status] || ['', '#8e8e93'];
    statusBadge._label.textContent = text;
    statusBadge._dot.style.background = color;
    statusBadge.style.opacity = '1';
    statusBadge.style.transform = 'translateY(0)';
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => {
      statusBadge.style.opacity = '0';
      statusBadge.style.transform = 'translateY(6px)';
    }, 3500);
  }

  window.TetherSync.init(showStatus);

  let current = null;
  const observer = new MutationObserver(() => {
    const v = findVideo();
    if (v !== current) {
      current = v;
      window.TetherSync.setVideo(v);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // catch the case where a video is already present on script injection
  current = findVideo();
  if (current) window.TetherSync.setVideo(current);
})();
