# 版式复刻方法论：扫描版外文图书 → 中文 NML 复刻排版

> 依据：《科学中的数学方法》(Pólya & Bowden, NML 26) 五轮重排实战总结（2026-11-07）。
> 适用：移植 Sawyer《微积分是什么》、Niven《有理数与无理数》（已有 MinerU 译稿在 `sawyer_zh/`、`niven_zh/`），以及后续任何「原书 PDF + MinerU 译稿 → 复刻原书版式的中文书」任务。
> **核心原则：`*_zh/科学中的数学方法.tex` 式的成品 tex 是唯一事实源**； MinerU 备份和构建脚本只作过程留档，绝不从备份重跑覆盖成品。

---

## 0. 全景流水线

```
原书 PDF（版式权威）─┐
                     ├→ 版式实测（几何/字号/书眉/图尺寸）→ 模板参数
MinerU 译稿（内容源）─┘
        │
        ├→ 阶段B：结构清理重建（bug 清单逐项扫）
        ├→ 阶段C：套模板 preamble + 前置部分手工页
        ├→ 阶段D：图尺寸逐张实测重设 + 并排对合并
        ├→ 阶段E：脚注恢复（MinerU 必丢，从原书扫描找全）
        └→ 阶段F：验证闭环（日志→几何→视觉门）→ 成品
```

三本 NML 书同系列同开本：**6×9in、版心约 319×509pt、左右边距对称**，模板可直接复用；但每本仍要重测确认（见阶段 A）。

---

## 1. 资产清单（都在 `D:\work\note\数学\newmath\`）

| 资产 | 位置 | 说明 |
|---|---|---|
| 成品参考（金标准） | `polya_zh/科学中的数学方法.tex` + `.pdf` | 259 页，含全部修复；移植时对照抄 |
| MinerU 原始译稿 | `polya_zh/科学中的数学方法_mineru版备份.tex` | 各书对应 `*_zh/` 里的备份 |
| 原书 6×9 PDF | 根目录 `Mathematical Methods in Science (…).pdf` | **版式与脚注的唯一权威**；注意 `polya/` 里还有同名的 Letter 大开本 PDF，别搞混 |
| 静态字体 | `_fonts/SourceHanSerifSC-{Regular,Bold}.otf` | 思源宋体静态版，XeTeX 按文件路径加载 |
| 测量/构建脚本 | `_cmp/*.py` | 见 §4、§6 各脚本说明 |
| 对照包 | `对照包/*.png` | 原书页 vs 新版页并排图，验收用 |
| 问题台账 | `review待办.md` | 每轮修复与遗留全部留痕，移植前先读对应小节 |

---

## 2. 阶段 A：原书版式实测（每本必做，约 30 分钟）

用 PyMuPDF 对原书 PDF 采样，产出一份《版式参数表》。参考脚本：`_cmp/verify_geom.py`（含全部测量逻辑）。

要测的参数（Pólya 实测值作对照）：

| 参数 | 测法 | Pólya 值 |
|---|---|---|
| 页面尺寸 | `pg.rect`（注意全书是否一致） | 432×648pt (6×9in) |
| 版心左右边距 | 正文行 `bbox` x0/x1 中位数（区分奇偶页！原书基本对称） | 左 58 / 右 55（对称处理为 57） |
| 版心高/上边距 | 正文行 y 范围；书眉 y≈42-46，正文顶 y≈69 | textheight 509pt, top=42pt |
| 正文/书眉/图注/脚注字号 | `span['size']` | 11.2 / 9.8粗 / 9.3粗 / 8.5 |
| 书眉规则 | 偶页与奇页首行 span 的 x 分布 | 偶=页码外左+章题居中；奇=节题居中+页码外右 |
| 章扉 | 章号/章题 y 与字号 | 章号 y135 小号居中；章题 19pt 居中 |
| 节标题 | `SECTION` 行 y 分布 | 居中 ~9.5-10pt，**随文排不另起页** |
| 条目标题 | `1.1.1` 行 | 正文字号、缩进一格 |
| 前置页序 | 逐页 dump 首行 | 扉页→版权→丛书页→序→目录→引言 |
| 页码体系 | 目录所示起始页 | 前置罗马、引言=1、第一章=3 |

**关键鉴别**：原书目录（TOC 页）是结构权威——节数、条目数、图号、脚注引用都以目录为准（Pólya 案例：正文印 SECTION 5.4 而目录印 SECTION 4，按目录统一）。

---

## 3. 阶段 B：MinerU 产物清理与结构重建

MinerU 译稿是 `article` 文类 + pandoc 默认 preamble（letter 纸、2cm 边距、蓝链、parskip、裸图）。重建为 `book` 三级结构。**Pólya 全部踩过的坑，按清单扫一遍**：

### 3.1 结构类
- [ ] `\section{章题}` ×N → `\chapter{}`（ctex 自动「第X章」中文数词）；删除孤儿「第X章」明文行（MinerU 把章号行漏成正文，Pólya 有 5 处）
- [ ] `\subsection{第 X 节 …}` → `\section{}`（**去掉标题里的硬编码「第 X 节」前缀**，自动编号）；编号与原书目录核对（可能有 5.4 之类自相矛盾）
- [ ] `\subsection{N.N.N 标题}` → `\subsection*{}` + `\addcontentsline`（编号沿用原书硬编码，不自动编号）
- [ ] 章扉页上的 SECTION 标题会被 MinerU 吞掉（Pólya 第 1 章第 1 节），对照原书目录补 `\section{}`
- [ ] 对照原书目录查**丢失的条目**（Pólya 2.2.5 标题被转成 display 数学；内容其实还在，只丢标题）
- [ ] **伪标题识别**：display 数学被误判成 `\subsection{}`（Pólya 的「3, 3.1, 3.5, 3.1.」）、表格表头被误判成标题（Pólya「类比」= Analogy 表头）——一律以原书目录为准裁决
- [ ] 含数学的标题（`\texorpdfstring` 多行断行）会正则错切，逐个精确替换（Pólya 1.4.3/1.4.4/5.2.1）
- [ ] 手工翻译的静态目录块 → 删掉，换 `\tableofcontents`

### 3.2 文本伪迹类
- [ ] 孤立页码行（段落仅为 1-3 位数字）→ 删
- [ ] **表格转义垃圾**：`\$textbackslash frac\{1\}\{2\}\$` 这类字面文字（Pólya 19 处，会印在单元格里）→ 反转义回真数学
- [ ] 公式内字母间隔的英文（`4 t h a n d f o l l o w i n g t e r m s`）→ 检索 `grep 't h a n\|a n d\|w h e r e'` 补译
- [ ] ASCII 直引号 `"` 成对转「“”」（否则 xeCJK 排成两个右引号）
- [ ] 公式编号撇号：`\tag{20"}` → `\tag{20''}`（OCR 把 ″ 读成引号）
- [ ] `\end{zfigure}\\` 尾随 `\\` → 删（会报 no line to end）

### 3.3 脚注（MinerU 必丢，见 §5）

### 3.4 引号与标点
- 译者常把脚注锚点星号留在正文（`。*`）——正好是挂脚注的位置标记。

---

## 4. 阶段 C：模板 preamble（可直接粘贴）

Pólya 成品 preamble 全文在 `_cmp/_preamble_extract.tex`（或直接抄 `polya_zh/科学中的数学方法.tex` 开头到 `\begin{document}`）。移植时改三处：`\graphicspath`、字体 `Path`（相对路径按新书目录调）、注释里的书名。

**必须原样保留的关键行（每行都是踩坑换来的）**：

```latex
\documentclass[10pt,twoside,openany,onecolumn]{book}
% openany：NML 章起始不强制奇数页（Pólya 第3章起始于偶数页82）；openright 会造空白衬页

\usepackage[paperwidth=6in,paperheight=9in,
            textwidth=319pt,textheight=509pt,
            top=42pt,headheight=11pt,headsep=17pt,footskip=36pt,
            hmarginratio=1:1,marginparwidth=0pt,marginparsep=0pt]{geometry}
% ★ hmarginratio/marginpar 必须显式给：geometry 默认给边注留位，双面模式下
%   版心会整体偏移 ~11pt 且两侧不对称

\usepackage[UTF8,zihao=5,fontset=none,heading=true]{ctex}
% ★ heading=true 必须有，否则 \ctexset{chapter=…} 全部报 unknown key
\setCJKmainfont{SourceHanSerifSC-Regular.otf}[
  Path = ../_fonts/, BoldFont = SourceHanSerifSC-Bold.otf]
% ★ 系统装的思源宋体多半是 VF 变量字体，XeTeX 用不了；必须静态 OTF 按文件路径加载
%   （ghfast.top 等 GitHub 代理可下载 SourceHanSerifSC zip）

\setmainfont{TeX Gyre Termes}   % Times 系西文
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{newtxmath}          % ★ 必须在 ams* 之后加载（\Bbbk 冲突）
% ★ 不要 \usepackage{bbold}（正文用不到且与 amssymb 冲突）
\usepackage{stmaryrd}           % \updownarrow 等
\newcounter{none}               % ★ pandoc 表格 \LTcaptype 需要此计数器，缺了报 No counter 'none'

% 图环境：图随文走（不浮动！原书图就在文流中），图注小号粗体居中图下
\newenvironment{zfigure}{\par\addvspace{10pt plus 3pt minus 2pt}\noindent\begin{center}}{\end{center}\par\addvspace{10pt plus 3pt minus 2pt}}
\newcommand{\zfigcap}[1]{\par\nopagebreak\vspace{5pt}{\footnotesize\bfseries #1\par}}

% 星号脚注（原书样式）
\newcommand{\starfoot}[1]{\begingroup\renewcommand{\thefootnote}{*}\footnote{#1}\endgroup}
```

`\ctexset` 章节块、fancyhdr 书眉块、`\l@section` 目录宽度——全文照抄 preamble extract。

### 书眉/页面样式的顺序陷阱（★最大坑）
```
正文顺序必须是： \pagestyle{empty}（前置装饰页）→ …前置… → \pagestyle{fancy}（目录起）
preamble 里：   \pagestyle{fancy} 先声明 + \fancypagestyle{plain}{\fancyhf{}…}
```
- **不要在正文用 `\pagestyle{plain}` 再切回 fancy**：fancyhdr 重定义的 plain 会把 fancy 的表头状态清空，之后全书书眉消失（Pólya 排查一下午的坑）
- 前置装饰页（题词/扉页/版权/丛书页）用 `\pagestyle{empty}`；序言若要无书眉也用 empty

### 前置部分结构（对照原书页序手工写，不进结构命令）
```
题词页(\pagestyle{empty}) → 简题页 → 丛书委员会页 → 扉页(含社徽图) → 版权页
→ NML 书目页 → \pagenumbering{roman}+序言(\chapter*) → 修订版序言
→ \pagestyle{fancy}+\tableofcontents → \mainmatter+引言(\chapter*+\addcontentsline)
→ \chapter 各章正文
```
引言 = 阿拉伯页码第 1 页（Pólya 原书如此，第一章恰好第 3 页）。

---

## 5. 阶段 D：图尺寸与并排（核心方法论）

### 5.1 为什么不能信 MinerU 的宽度
MinerU 的 `width=0.99\linewidth` 是从 **Letter 大开本**量的、且量化粗糙、大量封顶全宽。必须以 6×9 原书实测为准。

### 5.2 实测方法（Pólya 四轮迭代后的终版）

**宽度 = 行带高度 × JPG 宽高比**（v5 法，最可靠）：
1. 渲染原书页 150dpi 灰度；把 OCR 文本行 bbox 膨胀 3px 作掩膜（**只遮长行 >70pt，短行是图内标注要保留为油墨**）；
2. 油墨按行聚带（行间空白 >10pt 分带）→ 行带高度 h（上下文本行天然定界，非常可靠）；
3. 图注 y 坐标定位（宽松 OCR 匹配 `Figure\d+\.\d+`，去空格扁平化，允许 1 字符误读如 `1.1%`）；
4. 取「图注正上方最近的行带」= 该图的带 → **w = h × (jpg宽/jpg高)**，上限 319pt。
   （JPG 宽高比是内容真实形状，裁图白边在比值中抵消。）

**行带检测不到的图**（细点线图，如速度-时间图）：
- 兜底 = 用可靠图的「v5/v1 收缩比」中位数折算；或
- 从扫描页按「上文行底→图注顶」整带 200dpi 裁剪替换原图（Pólya 图 5.9/5.17 就是这么救的，38dpi→240dpi）。

**失败教训（别重蹈）**：
- v1「图注上方油墨列游程」法：间隔容差过宽会把空白两侧吞进来，57 张图被误测成 ~310pt 全宽——**不要用**；
- v4「区域中心 x 锚定」：碎墨页会锚到标注碎片上（图 3.34 被缩到 1/5）——**宽度骤变 >60% 的要人工核**。

### 5.3 并排图对
**识别**（两法交叉验证）：
1. 同页同行图注扫描（宽松 OCR）：两条 Figure 图注 y 差 <6pt → 并排对（左右按 x 排序）；OCR 误读（`Figure 1.1%`=1.12）要人工认；
2. 行带内列段切分：一带两段且横向分离 → 并排。

**渲染**：两个 zfigure 合并为一个 minipage 行（**[b] 底线对齐**——原书两图坐在同一基线上，[c] 居中会让图注错行）：
```latex
\begin{zfigure}
\noindent\begin{minipage}[b]{<wa+4>pt}\centering
\includegraphics[keepaspectratio,width=<wa>pt]{…}
\zfigcap{图 a}
\end{minipage}\hfill
\begin{minipage}[b]{<wb+4>pt}…\end{minipage}
\end{zfigure}
```
- **总宽必须 ≤319pt**，超了按比例收缩两图——超 0.5pt 都会让 TeX 在 \hfill 处紧急断行、把对子竖着拆到两页（Pólya 实际发生过的 bug）；
- MinerU 把某些并排对**合成了一张 JPG**（Pólya 2.25/2.26、5.20/5.21）——拆不开，按行带总跨度整图设宽，视觉即并排原貌，缺分图注记录在案。

### 5.4 图块重写要点
- `\begin{center}\pandocbounded{…}\\图 N.M\end{center}` → zfigure 环境（图注模式多样：图注带描述文字、图注在图上、裸图无图注、`\\` 在图注后——正则要全覆盖）；
- 白边多的 MinerU 裁图：宽度按内容比例换算（本版用 JPG aspect 法已自动消化）；
- 有效分辨率检查：`px / (placed_pt/72)` < 90dpi 的图必须处理（缩宽或扫描裁剪替换），脚本 `_cmp/check_dpi.py`。

---

## 6. 阶段 E：脚注恢复（MinerU 100% 丢失）

1. **全量找脚注**：对原书每页，找底部小字号（<10.5pt）且以 `*`/`†`/`+`/`~` 开头的文本块（marker 会被 OCR 误读成各种符号，四种都要扫；y>350 全页扫，别只扫页底）；
2. OCR 严重损坏的脚注（法文诗、斜体引语）→ 渲染 PNG 给视觉 agent 逐词转录；
3. **锚点定位**：译稿里译者留的 `。*` 星号就是锚点；没有的用脚注正文关键词反查；
4. 译出后用 `\starfoot{}` 挂回，锚点残留星号删除；
5. Pólya 实测：预估 6 条实际 8 条——**用原书交叉引用自检**（如脚注里写"见 5.1.4 末尾的脚注"）。

---

## 7. 阶段 F：验证闭环

### 7.1 编译健康（每轮必查）
```bash
xelatex -interaction=nonstopmode xxx.tex   # 跑两遍（目录/引用稳定）
grep -c '^!' xxx.log                        # 必须为 0
grep -A1 'Overfull' xxx.log | grep 'too wide'   # 全部 <5pt
grep -c 'Missing character\|undefined' xxx.log  # 缺字=0；undefined 只允许字体形状类
```

### 7.2 几何验证（程序化）
- 版心：正文行 x0/x1 中位数 vs 目标（`verify_geom.py`）；
- 书眉：全书扫 y<25 的页首 span，有页码的页应 ≈ 全书页数 − 章扉数；
- 章扉：第X章行 y 值 vs 目标；
- 图宽：`verify_fig_sizes.py`——新 PDF 图 bbox vs 原书实测，中位偏差应 <3pt；
- 近空白页扫描（openany 后应为 0）。

### 7.3 视觉门（终审）
渲染 150dpi PNG → 派 `pdf:visual-judge` agent 判定。每轮抽不同样本：
- 必抽：章扉、图注页、脚注页、表格页、目录页、随机正文页；
- 判官反馈修复后**必须复检同批页**；
- 判官也会误报（如把并排图 x 匹配错），几何数据可复核其结论。

### 7.4 对照包
每轮给用户刷新 `对照包/`：原书页 vs 新版页并排 PNG（PIL 拼接，110dpi），覆盖本轮修改的类型页。

---

## 8. 坑速查表（出问题先查这里）

| 症状 | 原因 | 解法 |
|---|---|---|
| xelatex 秒崩、log 无错误、同内容换 ASCII 文件名能编译 | **PDF 被阅读器占用**写不进 | 关阅读器；或先编 ASCII 名再 mv |
| 全书书眉消失 | 正文用过 `\pagestyle{plain}` 后切 fancy，fancyhdr 的 plain 重定义清空了 fancy 状态 | 只用 empty→fancy 序列 |
| 版心左右不对称/偏 11pt | geometry 默认给边注留位 | `hmarginratio=1:1,marginparwidth=0pt,marginparsep=0pt` |
| `\Bbbk already defined` | bbold/amssymb 冲突或 newtxmath 顺序 | 删 bbold；newtxmath 放 ams* 后 |
| `No counter 'none' defined` | pandoc 表格 `\LTcaptype{none}` | `\newcounter{none}` |
| ctex 报 `key 'ctex/chapter' unknown` | ctex 没接管标题 | 加 `heading=true` |
| Source Han Serif 找不到 | 系统是 VF 变量字体 | 静态 OTF + `Path=` 文件路径加载 |
| 并排图对竖着拆到两页 | 对子总宽超版心哪怕 0.5pt | minipage 宽 = w+4，总宽收缩到 ≤319 |
| 目录里「第一节测量」无空隙 | l@section 编号盒宽不够 | `\renewcommand*\l@section{\@dottedtocline{1}{1.5em}{3.6em}}` |
| 图注显示成 `\updownarrow` 文字 | MinerU 转义垃圾 | 反转义（§3.2） |
| 表格溢出版心 | 同上（字面文字撑宽列） | 修转义；必要时 `\small` |
| 中文引号全是右引号 | ASCII `"` | 成对替换 U+201C/U+201D |
| bash 里 python -c 带反斜杠正则总出错 | Git Bash 转义 | **一律写 .py 脚本文件跑，别用 -c/heredoc** |

---

## 9. 移植 Checklist（Sawyer / Niven 及后续书）

1. **读台账**：`review待办.md` 里 Sawyer/Niven 小节有各自的已知遗留（Sawyer 的 l.1146 表格错位、OCR 笔误清单；Niven 的缺字/表格问题）；
2. **阶段 A 重测**该书的几何参数（同系列预计与 Pólya 一致，花 10 分钟确认；若开本不同则全套参数重算）；
3. 备份该书的 MinerU 译稿 → 复制 Pólya preamble（改 `\graphicspath`、字体路径、注释）；
4. 跑 §3 清单做结构重建（脚本 `_cmp/build_layout.py` + `assemble.py` 可作起点，**但产出必须人工逐项核**——Pólya 的最终 tex 含大量脚本外手工修复，脚本不是完整真相）；
5. 前置部分手工页照原书页序重写；
6. §5 图尺寸：改 `measure_figs_v5.py` 的 PDF 路径与图注语言跑起，`resize_figs.py` 重写图块；并排对两法交叉验证；
7. §6 脚注：`find_footnotes*.py` 四种 marker 全扫；
8. §7 验证闭环 + 对照包 + 台账留痕；
9. **验收满意后**，把该书 8-9 步中发现的新坑补回本文档。

> 通用新书（非 NML 系列）：先做阶段 A 完整实测（开本/版式可能完全不同，模板参数逐项重算），其余流程不变。

---

## 10. Niven 移植实录补充的新坑（2026-11-08，§9 验收回填）

1. **top 边距的 pt/bp 漂移校准**：XeTeX 按 TeX pt(72.27/in) 计纸宽而 PDF 按 bp(72/in) 落点，成品版心整体比 geometry 标称值上移 ~26pt（Pólya 版即如此：书眉落在 y≈14 而非 42）。若要逐点对齐原书，**实测漂移后加大 top**（Niven：top=66pt → 正文顶 66/底 554 与原书吻合）。
2. **书眉规则每本书要重读**：Niven 是「偶页=书名、奇页=章题」（Pólya 是偶章题/奇节题）。奇页要章题时须 `\renewcommand{\sectionmark}[1]{}`，否则 ctex 节题会覆盖 rightmark。
3. **\flushbottom 的稀胶水大空带**：正文页只有段间+显示式间隔可伸缩时，flushbottom 可把 \abovedisplayskip 拉到 80pt（除法竖式页 1/4 页高空带）。**中文译稿密度与原书不同，建议直接 \raggedbottom**（页底参差中位 ~0-4pt，可接受）。
   - 注意插入位置：\raggedbottom 加错进 \providecommand{\tightlist}{...} 定义内会静默失效（本案实际踩过）。
4. **MinerU 的清单塌缩三连**（比 Pólya 时代多见的形态）：① 空 enumerate（`\item` 后直接 `\end{enumerate}`，配合 labelenumi 渲染成孤立的 "(1)"/"(3)" 悬挂行）；② 星号题 `*N.` 以纯段落留在 enumerate 内/外（内外都要并成 `\item[*N.]`，注意 enumerate 提前 `\end` 把星号题挤到表外的情形）；③ 答案区嵌套 (a)(b)(c) 被拆成多个顶层列表（断在 `\end{enumerate}\end{enumerate} + begin(带 setcounter)` 处，需并回嵌套层）。
5. **一句被图拦腰截断**时先查原书页位：若原书该图正位于句子换页处（图上句尾/图下句头），保留位置即忠实；若原书文本连续（图在句旁/上方），要把句子缝合、图挪到句后（Niven 图 15、图 21 两种情形都有）。
6. **图缺失于底本印刷**（图 8 图注下方整块空白）：tex 内注释留痕 + 按文意 tikz 重绘，勿凭空裁别页图顶替。
7. **长除法竖式的重排套路**：MinerU 给 longtable/分式堆叠，重排为 `{l}` 数组逐行 `\hspace{Npt}` 错位（N 值按原书扫描该行 x0 − 竖式行 x0 逐行量出），行间即得原书阶梯。
8. **节标题挂脚注**（原书「6.1 Inequalities†」）：`\section[题]{题†}` + 紧随 `\begingroup\renewcommand\thefootnote{$\dagger$}\footnotetext{…}\endgroup`——题内†即锚，正文不再出†标记。
9. bash/python 交互转义坑在本书 Again 确认：`python -c` 内含 `\s`、`\d`、`\\(` 的字符串一律炸或静默错配；**所有正文批改必须走 .py 文件**（method §8 已有，重申）。
10. 移植效率参考：Niven 全流程（阶段A→F 四轮视觉门→正式 PDF 174 页）单人一天完成；图实测改用「图注上方紧致油墨 bbox」直接量宽（比 Pólya 的行带×aspect 更稳，中位偏差 0.7pt），并排对识别（两图注同 y<6pt）在本_book 无一对，实测 22 图全部单栏。

## 11. Sawyer 移植实录补充（2026-11-08，§9 验收回填）

1. **XeTeX pt/bp 漂移校准（★Pólya 版未做）**：geometry 的 top 与渲染 y 有 ~20–26pt 系统差（内容整体偏上）。校准：量新 PDF 书眉 folio 行 y 与原书目标（≈45–50）之差直接加大 `top`（Sawyer top=66 → 书眉 y≈46、正文顶≈62 逐点吻合）。Pólya 版书眉普遍偏高 ~28pt 即此因。
2. **章扉页脚页码贴正文块底**：NML 章扉页码与正文块底线同区 → `footskip=0` + textheight 按正文底反推（Sawyer 510pt）；负 footskip 不可用，宁可正文块略短。
3. **图注样式按书而变**：Pólya=小号粗体；Sawyer=与正文同号常规字重。`\zfigcap` 逐书调。
4. **目录无点线（Sawyer）**：自定义 `\l@chapter`（\hfill 右对齐页码 + \addvspace 11pt），复刻原书 CONTENTS。
5. **MinerU 章级降级**：Sawyer 5 章被降成 subsection——原书 TOC 为章清单权威，逐章 promote。
6. **拆分/合并图 → 扫描整图裁剪替换**（F6/F27/F54 拆碎、F9–F12 两行图各并成一张、F70 整图丢失）：300dpi 按框位裁剪最省事；框位可让视觉 agent 从扫描页直接量（±2pt）。
7. **表格内嵌图**（原书 p85 四类运动表）：单元格内换行用 `\newline`（**`\` 会终止表格行**）；列宽+\tabcolsep=3pt 控总宽 ≤ 版心。
8. **脚注段落错位缝合**：MinerU 把长脚注拆散混入下节段落（p17 3x² 脚注三段散落，含误拆尾段"因此当 x=10"）——按原书页位识别脚注全范围整块删、回填 `\dfoot{}`。含公式的脚注公式内联化。
9. **并排对几何规律**：左右图中心 ≈ 版心左右半版中点 → 两个半版宽（148pt）minipage 各自居中即精确复现；四联排用四个 76pt。
10. **答案章防坑**：MinerU 会把答案表格压成单字母乱码（"V"）、把答案序列重复两遍——对照原书答案页逐题核。
