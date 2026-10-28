#!/usr/bin/env bash
# Renders the opening film and encodes the files the review page serves (public/film/).
# Run from this folder: ./encode.sh
#
# Two near-lossless masters (portrait for phones, wide for desktop), then a ladder per framing:
# AV1 (smallest; most phones decode it), VP9 (older Android), H.264 (iPhones). The page lists them
# in that order and the browser takes the first it can play (src/app/r/[slug]/intro.tsx).
# The version in the file names (v1) lets them be cached for a year: bump it when the film changes,
# here and in intro.tsx.
set -euo pipefail
cd "$(dirname "$0")"

V=v1
OUT=../public/film
mkdir -p out "$OUT"

npx remotion render IntroPortrait out/master-portrait.mp4 --codec=h264 --crf=8 --log=error
npx remotion render IntroWide out/master-wide.mp4 --codec=h264 --crf=8 --log=error

F="npx remotion ffmpeg -hide_banner -loglevel error -y"
AV1="-c:v libaom-av1 -b:v 0 -cpu-used 4 -row-mt 1 -pix_fmt yuv420p -an"
VP9="-c:v libvpx-vp9 -b:v 0 -row-mt 1 -deadline good -cpu-used 1 -pix_fmt yuv420p -an"
H264="-c:v libx264 -preset veryslow -profile:v main -pix_fmt yuv420p -movflags +faststart -an"
SD="-vf scale=540:960:flags=lanczos"

# phones (720×1280, and 540×960 "lite")
$F -i out/master-portrait.mp4 $AV1 -crf 40 "$OUT/intro-portrait.$V.av1.webm"
$F -i out/master-portrait.mp4 $SD $VP9 -crf 40 "$OUT/intro-portrait-lite.$V.vp9.webm"
$F -i out/master-portrait.mp4 $SD $H264 -crf 27 "$OUT/intro-portrait-lite.$V.mp4"
# desktop (1280×720)
$F -i out/master-wide.mp4 $AV1 -crf 40 "$OUT/intro-wide.$V.av1.webm"
$F -i out/master-wide.mp4 $VP9 -crf 37 "$OUT/intro-wide.$V.vp9.webm"
$F -i out/master-wide.mp4 $H264 -crf 25 "$OUT/intro-wide.$V.mp4"

ls -la "$OUT"
