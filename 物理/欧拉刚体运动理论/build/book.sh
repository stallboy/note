#!/usr/bin/env bash
# 欧拉《刚体运动理论》合册 PDF 构建入口
# 用法：bash build/book.sh          # 全流程（SVG→PDF、md→tex、xelatex×n）
#       bash build/book.sh tex      # 跳过 SVG 转换，仅重排 md + 编译
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT_TEX=build/book.tex
OUT_PDF="欧拉刚体运动理论_现代汉语选编与重述.pdf"

# 1) SVG → 矢量 PDF（幂等，按时间戳跳过）
if [ "${1:-}" != "tex" ]; then
  bash build/svg2pdf.sh
  n_pdf=$(ls build/figpdf/*.pdf | wc -l)
  n_svg=$(ls images/*.svg | wc -l)
  if [ "$n_pdf" -ne "$n_svg" ]; then
    echo "警告：SVG($n_svg) 与已转 PDF($n_pdf) 数量不符，重跑一次 svg2pdf …"
    bash build/svg2pdf.sh || true
    n_pdf=$(ls build/figpdf/*.pdf | wc -l)
    [ "$n_pdf" -eq "$n_svg" ] || { echo "错误：SVG 转 PDF 仍缺件"; exit 1; }
  fi
fi

# 2) md → tex 片段
md2tex() { # $1=md文件 $2=输出名
  pandoc "$1" \
    --from=markdown+east_asian_line_breaks-implicit_figures \
    --to=latex --wrap=none --eol=lf \
    --lua-filter=build/filter.lua \
    -o "build/tex/$2.tex"
}

declare -a PARTS=()
build_part() { # $1=部名(引言/正文/附录) $2..$N=章号
  local p=$1; shift
  for n in "$@"; do
    local f="欧拉刚体运动理论_${p}_第${n}章.md"
    [ -f "$f" ] || { echo "缺文件：$f" >&2; exit 1; }
    md2tex "$f" "${p}_${n}"
    PARTS+=("\input{build/tex/${p}_${n}.tex}")
  done
}

md2tex "欧拉刚体运动理论_00_总览.md" "overview"
for n in 1 2 3 4 5 6; do build_part 引言 $n; done
for n in $(seq 1 19); do build_part 正文 $n; done
for n in 1 2 3 4 5; do build_part 附录 $n; done

# 3) 组装主文件
{
  echo '\input{build/preamble.tex}'
  echo '\begin{document}'
  echo '\frontmatter'
  echo '\input{build/front.tex}'
  echo '\input{build/tex/overview.tex}'
  echo '\mainmatter'
  echo '\eulerpart{第一部分}{引言}{为质点运动、力与相对运动作准备：走向刚体动力学的第一步}{part:intro}'
  for l in "${PARTS[@]:0:6}"; do echo "$l"; done
  echo '\eulerpart{第二部分}{正文}{从固定轴旋转到欧拉方程、自由转动、陀螺与滚动：全书主体}{part:body}'
  for l in "${PARTS[@]:6:19}"; do echo "$l"; done
  echo '\eulerpart{第三部分}{附录}{摩擦：平移、旋转与陀螺中的摩擦问题}{part:appx}'
  for l in "${PARTS[@]:25:5}"; do echo "$l"; done
  echo '\end{document}'
} > "$OUT_TEX"

# 4) 编译（失败时给出日志尾部）
if ! latexmk -xelatex -interaction=nonstopmode -bibtex- -outdir=build "$OUT_TEX" >build/latexmk.out 2>&1; then
  echo "=== latexmk 失败，book.log 尾部："
  tail -n 80 build/book.log 2>/dev/null || tail -n 40 build/latexmk.out
  exit 1
fi
cp "build/book.pdf" "$OUT_PDF"
pages=$(pdfinfo build/book.pdf 2>/dev/null | awk '$1=="Pages:"{print $2}')
echo "完成：$OUT_PDF（$(du -h "$OUT_PDF" | cut -f1)，${pages} 页）"
