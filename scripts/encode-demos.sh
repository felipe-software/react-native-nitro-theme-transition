#!/usr/bin/env bash
set -euo pipefail

# Turn raw screen recordings of the example app into the two demo sets:
#
#   assets/demos/<name>.gif   small looping clips, embedded in the README
#   docs/media/<name>.mp4     full-quality clips, played on the demo site
#   docs/poster/<name>.jpg    still frames, so the site shows something at rest
#
# Usage: bash ./scripts/encode-demos.sh ~/Desktop/*.mov
#
# The recordings are minutes long and hundreds of megabytes; only the ~3s around
# the theme change is worth keeping. That moment is found automatically: the
# whole screen swaps between a light and a dark palette, so the frame with the
# largest jump in average luminance is the transition. Everything else is
# someone scrolling to the next effect.
#
# The masters are deliberately NOT committed — a 13s 120fps capture is ~20MB,
# and sixteen of them would put 360MB in every clone. Keep them out of the repo.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GIF_DIR="$ROOT_DIR/assets/demos"
MP4_DIR="$ROOT_DIR/docs/media"
POSTER_DIR="$ROOT_DIR/docs/poster"

LEAD=1.0     # seconds of context before the change
CLIP=3.4     # total clip length
GIF_WIDTH=320
MP4_WIDTH=900

if ! command -v ffmpeg >/dev/null; then
  echo "error: ffmpeg is required — brew install ffmpeg" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "usage: $0 <recording.mov> [more.mov ...]" >&2
  exit 1
fi

mkdir -p "$GIF_DIR" "$MP4_DIR" "$POSTER_DIR"

# Seconds into $1 where the theme change happens. Samples average luminance of
# the right-hand phone at 10Hz and takes the steepest step.
transition_at() {
  ffmpeg -v error -i "$1" \
    -vf "fps=10,crop=700:1400:1000:60,signalstats,metadata=print:file=-" -f null - 2>/dev/null |
    awk '
      /pts_time:/ { split($0, a, "pts_time:"); t = a[2] + 0 }
      /lavfi.signalstats.YAVG/ { split($0, b, "="); n++; time[n] = t; y[n] = b[2] }
      END {
        best = 0; at = time[1]
        for (i = 2; i <= n; i++) {
          d = y[i] - y[i - 1]; if (d < 0) d = -d
          if (d > best) { best = d; at = time[i] }
        }
        print at
      }'
}

for src in "$@"; do
  name="$(basename "${src%.*}")"
  at="$(transition_at "$src")"
  start="$(awk -v a="$at" -v l="$LEAD" 'BEGIN { s = a - l; print (s < 0 ? 0 : s) }')"
  echo "$name: change at ${at}s, clipping from ${start}s"

  ffmpeg -y -v error -ss "$start" -t "$CLIP" -i "$src" \
    -vf "fps=16,scale=$GIF_WIDTH:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=80[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
    -loop 0 "$GIF_DIR/$name.gif"

  ffmpeg -y -v error -ss "$start" -t "$CLIP" -i "$src" \
    -vf "fps=30,scale=$MP4_WIDTH:-2:flags=lanczos" \
    -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart -an \
    "$MP4_DIR/$name.mp4"

  ffmpeg -y -v error -ss "$start" -i "$src" -frames:v 1 -vf "scale=450:-2" -q:v 6 \
    "$POSTER_DIR/$name.jpg"
done

echo
echo "gif    $(du -sh "$GIF_DIR" | cut -f1)"
echo "mp4    $(du -sh "$MP4_DIR" | cut -f1)"
echo "poster $(du -sh "$POSTER_DIR" | cut -f1)"
