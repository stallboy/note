# 合册 PDF 构建

把全书 31 个 Markdown 文稿排版为一本 B5 合册 PDF：

```
bash build/book.sh        # 全流程：SVG→PDF、md→tex、xelatex 多遍编译
bash build/book.sh tex    # 跳过 SVG 转换（插图未改时更快）
```

产物：书籍根目录《欧拉刚体运动理论_现代汉语选编与重述.pdf》（约 260 页，2.9 MB）。

## 体例（与《中学物理问答》同族）

- B5 tufte-book：正文窄栏 + 右边栏；批注（含“批注：现代核对。”变体）排为边栏楷体小字，不编号，自动避让
- 正文宋体（Noto Serif SC）、标题黑体、批注楷体、西文 TeX Gyre Pagella
- 插图：SVG 经 Edge headless 转矢量 PDF；宽图（根宽 ≥800px）通栏居中，图题图下居中、全书连续编号
- 目录到节；PDF 书签由目录自动生成；章内交叉引用为可点击链接；章末“上一章/下一章”导航行删除
- 公式内中文（`\mathrm{外}`、句号）由 `xeCJK` 的 `CJKmath=true` 支持

## 文件

| 文件 | 作用 |
|---|---|
| `book.sh` | 构建入口（拼装、编译、拷贝产物） |
| `filter.lua` | pandoc 过滤器：章标题/批注→边栏/图题/链接/导航处理 |
| `preamble.tex` | 导言区：字体、标题体例、`\pnote`/`\figwide`/`\eulerchapter` 等宏 |
| `front.tex` | 扉页、版本与读法说明、目录 |
| `svg2pdf.sh` + `svg2pdf.html.tpl` | SVG→矢量 PDF（Edge headless 按图原始尺寸打印，幂等） |

中间产物（`figpdf/`、`tex/`、`book.*`）均已 gitignore，可随时删除重建。

## 已知边界

- 编译日志有 24 条 `Missing character: ^^?`（Pagella-Bold）警告，页面渲染经视觉审校未见可见缺陷
- PDF 中文复制/检索不可用（xeCJK 子字体未带 ToUnicode），阅读不受影响
- 图内个别标注与线条的叠压来自 SVG 原图画法，如需修改请改 `images/` 源文件后重跑
- 改文稿后只需重跑 `book.sh`；图变了会自动重转对应 SVG
