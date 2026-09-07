// ---------------------------------------------------------------------------
// Disney+ adapter. See site-common.js for the shared logic; this just says
// how to find Disney+'s video element.
// ---------------------------------------------------------------------------

window.TetherSite.start(function findVideo() {
  // Same starting approach as Netflix and Hulu. Disney+ has been known to
  // occasionally keep more than one <video> element around (a background
  // trailer, for instance), so if sync ever seems to grab the wrong one
  // here, prefer the largest on-screen video instead of just the first.
  const videos = document.querySelectorAll('video');
  if (videos.length <= 1) return videos[0] || null;
  return [...videos].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
});
