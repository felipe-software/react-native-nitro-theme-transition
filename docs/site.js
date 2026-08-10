// Shared behaviour for the index grid and the per-effect pages.

// Only the videos on screen are allowed to decode — sixteen at once is a lot of
// frames for a laptop that is just reading a README.
const videos = [...document.querySelectorAll('video')];

if (videos.length) {
  const io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
        else entry.target.pause();
      }
    },
    { rootMargin: '150px' },
  );

  for (const video of videos) {
    io.observe(video);
    // Cards are links; replaying from a click there would fight the navigation.
    if (video.closest('a')) continue;
    video.addEventListener('click', () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });
  }
}

// ---- colour scheme ---------------------------------------------------
const root = document.documentElement;
const button = document.getElementById('toggle');
const icon = document.getElementById('toggle-icon');
const label = document.getElementById('toggle-label');

const systemDark = matchMedia('(prefers-color-scheme: dark)');
const stored = localStorage.getItem('theme');
if (stored) root.dataset.theme = stored;

function isDark() {
  return root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches;
}

function paintButton() {
  const dark = isDark();
  icon.textContent = dark ? '☀️' : '🌙';
  label.textContent = dark ? 'Light' : 'Dark';
}

function apply() {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  localStorage.setItem('theme', root.dataset.theme);
  paintButton();
}

if (button) {
  paintButton();
  systemDark.addEventListener('change', paintButton);

  // The web equivalent of what the library does natively: snapshot, swap, then
  // animate the old snapshot away as a circle from the point that was touched.
  button.addEventListener('click', event => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !document.startViewTransition) {
      apply();
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 650,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  });
}
