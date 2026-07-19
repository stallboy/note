# 《几何学的四大支柱》中文重排流程

> 替代旧版「文本覆盖法」（在英文 PDF 上 redact+insert 中文，版式受限于英文，中文拥挤）。
> 新方案：**MinerU 提取 → 清洗 LaTeX → 翻译正文 → ctex 重排版**，版式自由，质量上限高。

## 总流程

```
原PDF ─MinerU─▶ 结构化LaTeX(正文+公式+图) ─clean.py─▶ 干净英文body
      ─Agent翻译─▶ 中文body ─ctex/XeLaTeX─▶ 中文PDF
```

## 阶段 0：MinerU 提取

```bash
mineru-open-api extract Stillwell_Geometry.pdf --pages A-B -f md,latex --model vlm -o build/mineru/chN/
```

**关键坑（已验证）：**
- **必须 `-f md,latex` 双格式**才提取图片（单 `-f latex` 只出 `.tex`，`images/` 为空）
- **`--model vlm`** 公式识别准（pipeline 模型有 OCR 瑕疵）
- **>200 页须 `--pages` 分批**（单次超限）；全书分 p11–p150、p151–p240 两批
- token 已配置在 `~/.mineru/config.yaml`

## 阶段 1：清洗（`build/scripts/clean.py`）

MinerU 的 `.tex` 是 pandoc 风格，自带 preamble + 瑕疵，需清洗成纯 body：

| 瑕疵 | 处理 |
|---|---|
| 自带 preamble（`\documentclass` 到 `\begin{document}`） | 截取 `\begin{document}...\end{document}` 之间 |
| 控制字符 `^^A`(\x01) 等 | `re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',body)` |
| 章首页前的目录/前言残留 | 按章标题截断 |
| 章标题 `\section{...}` | 升级为 `\chapter{...}` |
| 编号节标题 `\subsection{1.1 ...}` 页眉重复 2–3 次 | 去重（仅留首次）+ 升级 `\section` |
| 图 `\pandocbounded{\includegraphics{X}}\\Figure N: cap` | 重组为 `\begin{figure}...\caption{Figure N: cap}\end{figure}` |
| URL 误识别为 `\subsection{http://...}` | 转 `\url{...}` |
| 连字/断词 `intersec tion` | 词典修复 + 行尾连字符合并 |

## 阶段 2：翻译（Agent 分批）

- 按 `\section` 切批，每批 Agent 翻译，**并发 ≤ 3**（GLM 并行 >7 触发 429）
- **硬性保留不译**：`\includegraphics`、`$...$`/`\(...\)`/`\[...\]` 公式、`\label`、变量字母、`\section{}`结构
- **翻译**：正文、标题（保留节号）、图标题（`Figure N: X`→`图N　X` 全角空格）、`\item`
- **顺手修 MinerU 瑕疵**：`the Elements` 的 Elements 常被吞 → 补《几何原本》；`\mathrm{so}` 等误判 → 改中文移出公式
- 复用 `proto/translator_brief.md`（术语表 + 人名表）

## 阶段 3：排版编译（`build/preamble.tex` + `build/main.tex`）

- `\documentclass{ctexbook}` + `\input{preamble}` + `\input{chN_zh}`
- **字体**：霞鹜文楷（复用 `kvant_zh/build_pdf/fonts/LXGWWenKai-{Regular,Medium}.ttf`，用 `Path=fonts/` 指定）
- **章节编号**：chapter 自动（第N章）；section/subsection `numbering=false`（用标题内手写号/小标题无号）
- **图**：`\figimg{...}` 命令 = `\adjustbox{max width=0.6\linewidth,max height=0.35\textheight}{\includegraphics[keepaspectratio]{...}}`（小图保持自然小，竖长图/大图不爆炸占整页）
- **caption**：`\captionsetup[figure]{labelformat=empty,labelsep=none,font={small}}`（caption 内手写「图N　X」，关闭自动编号避免重复）
- **编译**：`xelatex × 2`（解交叉引用）
- **辅助脚本**：`fix_figs.py`（includegraphics→\figimg）、`fix_subtitles.py`（章/节英文副标题）

## 阶段 3.5：补缺失矢量图

MinerU 漏提**矢量绘制**的图（如 Figure 1.19 正多面体）。用 PyMuPDF 从原 PDF 按图标题定位裁切：
```python
# 搜 "Figure N.N" 标题 rect，向上裁图区域，渲染高 DPI PNG
clip = fitz.Rect(x0, title_y0-H, x1, title_y0)
page.get_pixmap(matrix=fitz.Matrix(4,4), clip=clip).save('images/fig_N_N.png')
```
图内英文标签（A/B/C、Tetrahedron 等）保留（数学通用符号）；图标题用中文 caption 覆盖。

## 排版细节（用户反馈迭代得出）

- **√2 类对齐证明**：用 `\begin{tabular}{l@{\qquad}l}` 左对齐两列——结论与公式同在第一列，理由在第二列（**不要** multicolumn 跨列）
- **强调**：原文斜体句用 `\emph{}`
- **章/节英文副标题**：章 `\chapter[短标题]{中文\\[4pt]{\normalfont\large\itshape English}}`；节 `\section{中文\,\textnormal{\itshape (English)}}`
- **正文概念首次出现标注英文**：`中文（English）`，核心概念（尺规作图/相似/可作/有理无理/公理）可标 2 次；保留人名英文标注；公式/图标题内不标

## 产物（第1章样章）

```
build/
  mineru/              # MinerU 原始输出(.tex/.md/images/)
  src/ch1_en.tex       # 清洗后英文 body
  translated/section_*.tex  # 翻译中间结果
  ch1_zh.tex           # 合并后的中文 body(含所有修复)
  images/              # 图(含补的 fig_1_19.png)
  fonts/               # 霞鹜文楷
  preamble.tex  main.tex  scripts/{clean,fix_figs,fix_subtitles}.py
  TheFourPillars_ch1_zh.pdf  # 成品
proto/                 # 旧版文本覆盖法(保留对照)
```

## 复用资产

| 资产 | 路径 |
|---|---|
| 术语表 | `proto/translator_brief.md` |
| 霞鹜文楷 | `kvant_zh/build_pdf/fonts/LXGWWenKai-*.ttf` |
| ctex 模板参考 | `mathcircle/mvp_algebra/build_pdf/preamble.tex` |
