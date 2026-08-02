#!/usr/bin/env bash
# 用法: render.sh <svg文件名(不含扩展)> [宽 高]
# 用 Edge headless 把 images/<name>.svg 渲染成 .svg-render/<name>.png
set -e
NAME="$1"
W="${2:-700}"
H="${3:-500}"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
ROOT="D:/work/note/数学/game/geometry"
"$EDGE" --headless --disable-gpu \
  --screenshot="D:\\work\\note\\数学\\game\\geometry\\.svg-render\\${NAME}.png" \
  --window-size="${W},${H}" \
  "file:///${ROOT}/images/${NAME}.svg" 2>&1 | tail -1
