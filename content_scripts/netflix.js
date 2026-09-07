// ---------------------------------------------------------------------------
// Netflix adapter. See site-common.js for the shared logic; this just says
// how to find Netflix's video element.
// ---------------------------------------------------------------------------

window.TetherSite.start(function findVideo() {
  // Netflix's player renders a single <video> element while watching.
  // No stable id/class is guaranteed across Netflix's own redesigns, so
  // just take the first (and normally only) <video> on the page.
  return document.querySelector('video');
});
