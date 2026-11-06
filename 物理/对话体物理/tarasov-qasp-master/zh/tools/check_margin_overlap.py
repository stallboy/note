#!/usr/bin/env python3
"""边栏元素重叠自动检测（中文译注本工具）

用法:
    python check_margin_overlap.py <pdf> [--margin-x 0.63] [--first-page N] [--last-page N]

检测两类问题（只针对边栏区域，即版心右外侧）:
  1. 边栏元素两两重叠（【评注】marginnote 与 tufte 图题盒互不参与对方的
     自动堆叠，必须几何检测）;
  2. 边栏元素溢出页面底边。

对每个重叠对给出建议竖直偏移量（pt 与 baselineskip，边栏 \\baselineskip≈11.5pt）。
退出码: 0 = 干净, 1 = 有问题。编译后必跑本脚本（见 method.md 工作流）。
"""
import sys
import argparse

import fitz

BASELINE = 11.5  # 边栏 footnotesize 行距近似值（pt）
MIN_DX = 2.0     # 判定重叠的最小横向交叠 (pt)
MIN_DY = 2.0     # 判定重叠的最小纵向交叠 (pt)
BOTTOM_KEEP = 18.0  # 距页底的最小保留 (pt)


def blocks_in_margin(page, margin_x_pt):
    """返回完全位于边栏区域的文本块 [(bbox, text), ...]"""
    out = []
    for blk in page.get_text("blocks"):
        x0, y0, x1, y1, text = blk[0], blk[1], blk[2], blk[3], blk[4]
        text = " ".join(text.split())
        if not text:
            continue
        # 块基本整体在边栏（允许 2pt 伸入）
        if x0 >= margin_x_pt - 2.0:
            out.append(((x0, y0, x1, y1), text))
    return out


def overlap_dy(a, b):
    """两块纵向交叠量；横向必须同时交叠才算真重叠。"""
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    dx = min(ax1, bx1) - max(ax0, bx0)
    dy = min(ay1, by1) - max(ay0, by0)
    if dx > MIN_DX and dy > MIN_DY:
        return dy
    return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--margin-x", type=float, default=0.63,
                    help="边栏左边界（页宽比例，默认 0.63）")
    ap.add_argument("--first-page", type=int, default=1)
    ap.add_argument("--last-page", type=int, default=0)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    problems = []
    for pno in range(args.first_page - 1, doc.page_count):
        if args.last_page and pno + 1 > args.last_page:
            break
        page = doc[pno]
        w = page.rect.width
        h = page.rect.height
        blocks = blocks_in_margin(page, w * args.margin_x)
        # 底部溢出
        for bbox, text in blocks:
            if bbox[3] > h - BOTTOM_KEEP:
                problems.append(
                    f"[页 {pno+1}] 溢出底边: “{text[:18]}…” (y1={bbox[3]:.1f} > {h-BOTTOM_KEEP:.1f})")
        # 两两重叠
        for i in range(len(blocks)):
            for j in range(i + 1, len(blocks)):
                (ba, ta), (bb, tb) = blocks[i], blocks[j]
                dy = overlap_dy(ba, bb)
                if dy > 0:
                    need = dy + 6.0  # 交叠量 + 6pt 呼吸空隙
                    problems.append(
                        f"[页 {pno+1}] 重叠: “{ta[:14]}…” × “{tb[:14]}…” "
                        f"→ 建议将其中评注下移 ≥ {need:.1f}pt（约 {need/BASELINE:.1f} baselineskip）")
    if problems:
        print(f"发现 {len(problems)} 处问题：")
        for p in problems:
            print(" ", p)
        sys.exit(1)
    print("边栏检查通过：无重叠、无底边溢出。")


if __name__ == "__main__":
    main()
