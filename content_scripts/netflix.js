// ---------------------------------------------------------------------------
// Netflix adapter — finds the <video> element and keeps TandemSync pointed at
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
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        font: 500 12px -apple-system, sans-serif; padding: 6px 12px;
        border-radius: 999px; color: #fff; pointer-events: none;
        transition: opacity 0.3s; opacity: 0;
      `;
      document.documentElement.appendChild(statusBadge);
    }
    const labels = {
      connected: ['Tandem connected', '#1f8a4c'],
      disconnected: ['Tandem disconnected — retrying…', '#a33'],
      'no-room': ['Tandem: open the extension to join a room', '#555'],
    };
    const [text, color] = labels[status] || ['', '#555'];
    statusBadge.textContent = text;
    statusBadge.style.background = color;
    statusBadge.style.opacity = '1';
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => { statusBadge.style.opacity = '0'; }, 3500);
  }

  window.TandemSync.init(showStatus);

  let current = null;
  const observer = new MutationObserver(() => {
    const v = findVideo();
    if (v !== current) {
      current = v;
      window.TandemSync.setVideo(v);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // catch the case where a video is already present on script injection
  current = findVideo();
  if (current) window.TandemSync.setVideo(current);
})();
