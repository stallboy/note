# -*- coding: utf-8 -*-
"""生成 images/05-射影几何-交比-11.svg
唯一性的几何机制：完全四点形的传播。
左：原平面，完全四点形 P1..P4 六条边，R = P1P2∩P3P4，任意点 X 与两条割线；
右：像平面，由真实单应矩阵 H 映射得到的 Q、R'、U'V'、X'。
"""
import numpy as np

# ---------------- 几何计算 ----------------
def homography(P, Q):
    """4 对点求单应矩阵，P,Q 为 4x2 数组。"""
    A = []
    for (x, y), (u, v) in zip(P, Q):
        A.append([-x, -y, -1, 0, 0, 0, u * x, u * y, u])
        A.append([0, 0, 0, -x, -y, -1, v * x, v * y, v])
    _, _, Vt = np.linalg.svd(np.array(A))
    return Vt[-1].reshape(3, 3)

def apply(H, p):
    w = H @ np.array([p[0], p[1], 1.0])
    return w[:2] / w[2]

def line_inter(p1, p2, p3, p4):
    """直线 p1p2 与 p3p4 的交点。"""
    x1, y1 = p1; x2, y2 = p2; x3, y3 = p3; x4, y4 = p4
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d
    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d
    return np.array([px, py])

def clip_to_rect(p1, p2, rect):
    """无限直线 p1p2 裁剪到矩形 rect=(x0,y0,x1,y1)，返回两端点。"""
    x0, y0, x1, y1 = rect
    d = p2 - p1
    pts = []
    for t_edge, fixed, vert in ((0, x0, False), (0, x1, False),
                                (1, y0, True), (1, y1, True)):
        if abs(d[t_edge]) < 1e-12:
            continue
        t = (fixed - p1[t_edge]) / d[t_edge]
        q = p1 + t * d
        other = q[1 - t_edge]
        lo, hi = (y0, y1) if not vert else (x0, x1)
        if lo - 1e-9 <= other <= hi + 1e-9:
            pts.append(q)
    if len(pts) < 2:
        return p1, p2
    # 去重取相距最远的两个
    best = (pts[0], pts[1])
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            if np.linalg.norm(pts[i] - pts[j]) > np.linalg.norm(best[0] - best[1]):
                best = (pts[i], pts[j])
    return best

# 原平面四点（P4 在三角形内部，使 R 落在画面内且远离 P1）
P1 = np.array([70.0, 100.0]); P2 = np.array([300.0, 120.0])
P3 = np.array([240.0, 330.0]); P4 = np.array([190.0, 207.0])
P = np.array([P1, P2, P3, P4])

# 像平面四点（镜像的构型，使 R′ 也落在画面内）
Q1 = np.array([430.0, 155.0]); Q2 = np.array([680.0, 95.0])
Q3 = np.array([630.0, 330.0]); Q4 = np.array([568.0, 222.0])
Q = np.array([Q1, Q2, Q3, Q4])

H = homography(P, Q)

R = line_inter(P1, P2, P3, P4)
R2 = apply(H, R)

# 直接在边上取点，割线 = 两点的连线，X = 两条割线的交点
U = P1 + 0.80 * (P2 - P1)          # U 在边 P1P2 上
V = P3 + 0.50 * (P4 - P3)          # V 在边 P3P4 上
Uu = P2 + 0.45 * (P3 - P2)         # U₂ 在边 P2P3 上
Vv = P1 + 0.50 * (P4 - P1)         # V₂ 在边 P1P4 上
X = line_inter(U, V, Uu, Vv)

X2 = apply(H, X)
U2, V2 = apply(H, U), apply(H, V)
Uu2, Vv2 = apply(H, Uu), apply(H, Vv)

for name, pt in [("R", R), ("R'", R2), ("X'", X2), ("U", U), ("V", V),
                 ("U'", U2), ("V'", V2), ("U2", Uu), ("V2", Vv),
                 ("U2'", Uu2), ("V2'", Vv2)]:
    print(f"{name:4s} ({pt[0]:7.1f}, {pt[1]:7.1f})")

# ---------------- SVG 生成 ----------------
BLUE, GRAY, LGRAY = "#1f3a5f", "#6b7280", "#9aa7b8"
RED, ORANGE, DARK = "#8b2e2e", "#c05621", "#374151"

LRECT = (35, 55, 345, 395)   # 左面板裁剪框
RRECT = (390, 55, 705, 395)  # 右面板裁剪框

def fmt(p):
    return f"{p[0]:.1f},{p[1]:.1f}"

def edge(p1, p2, rect, color, w, dash=""):
    a, b = clip_to_rect(p1, p2, rect)
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
            f'stroke="{color}" stroke-width="{w}"{d}/>')

def dot(p, color, r=4):
    return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{color}"/>'

def text(p, s, color, size=14, anchor="start", dx=0, dy=0, weight="", halo=False):
    w = f' font-weight="{weight}"' if weight else ""
    h = ' stroke="#ffffff" stroke-width="4" paint-order="stroke"' if halo else ""
    return (f'<text x="{p[0]+dx:.1f}" y="{p[1]+dy:.1f}" text-anchor="{anchor}" '
            f'fill="{color}" font-size="{size}"{w}{h}>{s}</text>')

S = []
S.append('<?xml version="1.0" encoding="UTF-8"?>')
S.append('<!-- 手写 SVG：射影基本定理唯一性的几何机制——完全四点形的传播。\n'
         '     左：完全四点形 P1..P4（六条边），R=P1P2∩P3P4，任意点 X 与两条割线；\n'
         '     右：由真实单应矩阵算出的像——R\u2032、U\u2032V\u2032、X\u2032 全部被强制。\n'
         '     生成脚本：.svg-render/gen_05_11.py -->')
S.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 770 492" '
         'text-rendering="geometricPrecision" '
         'font-family="ui-sans-serif, system-ui, -apple-system, \'Segoe UI\', Roboto, '
         '\'PingFang SC\', \'Microsoft YaHei\', sans-serif">')
S.append('<defs><marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" '
         'markerHeight="7" orient="auto-start-reverse">'
         f'<path d="M0,0 L10,5 L0,10 z" fill="{BLUE}"/></marker></defs>')

# 标题
S.append(text((370, 30), "唯一性的几何机制：像沿连线关系「传播」到全平面", DARK, 16, "middle", weight="600"))

# ---- 左：原平面 ----
# 六条边：四条灰 + 两条红（P1P2、P3P4）
for a, b in ((P1, P3), (P2, P4), (P1, P4), (P2, P3)):
    S.append(edge(a, b, LRECT, LGRAY, 1.4))
S.append(edge(P1, P2, LRECT, RED, 2.2))
S.append(edge(P3, P4, LRECT, RED, 2.2))
# 割线（橙虚线）
S.append(edge(U, V, LRECT, ORANGE, 1.6, "6 4"))
S.append(edge(Uu, Vv, LRECT, ORANGE, 1.6, "6 4"))
# 点
for p, name, dx, dy in ((P1, "P₁", -14, -8), (P2, "P₂", 8, -8),
                        (P3, "P₃", 10, 14), (P4, "P₄", -16, 16)):
    S.append(dot(p, BLUE))
    S.append(text(p, name, BLUE, dx=dx, dy=dy, weight="600"))
S.append(dot(R, RED, 4.5))
S.append(text(R, "R", RED, dx=-14, dy=16, weight="600"))
for p, name, dx, dy in ((U, "U", 6, -8), (V, "V", -12, 4),
                        (Uu, "U₂", 4, 12), (Vv, "V₂", -14, 2)):
    S.append(dot(p, ORANGE, 3))
    S.append(text(p, name, ORANGE, 12, dx=dx, dy=dy))
S.append(dot(X, ORANGE, 4.5))
S.append(text(X, "X", ORANGE, dx=8, dy=-8, weight="600"))
S.append(text((190, 72), "原平面：完全四点形", DARK, 14, "middle", weight="600", halo=True))

# ---- 中央箭头 ----
S.append(f'<line x1="352" y1="225" x2="386" y2="225" stroke="{BLUE}" stroke-width="3" marker-end="url(#arr)"/>')
S.append(text((369, 208), "T", BLUE, 15, "middle", weight="600"))

# ---- 右：像平面（全部经 H 精确映射） ----
for a, b in ((Q1, Q3), (Q2, Q4), (Q1, Q4), (Q2, Q3)):
    S.append(edge(a, b, RRECT, LGRAY, 1.4))
S.append(edge(Q1, Q2, RRECT, RED, 2.2))
S.append(edge(Q3, Q4, RRECT, RED, 2.2))
S.append(edge(U2, V2, RRECT, ORANGE, 1.6, "6 4"))
S.append(edge(Uu2, Vv2, RRECT, ORANGE, 1.6, "6 4"))
for p, name, dx, dy in ((Q1, "Q₁", -14, 4), (Q2, "Q₂", 10, -6),
                        (Q3, "Q₃", 12, 12), (Q4, "Q₄", -16, 14)):
    S.append(dot(p, BLUE))
    S.append(text(p, name, BLUE, dx=dx, dy=dy, weight="600"))
S.append(dot(R2, RED, 4.5))
S.append(text(R2, "R′", RED, dx=8, dy=-8, weight="600"))
for p, name, dx, dy in ((U2, "U′", 6, -4), (V2, "V′", -14, 12),
                        (Uu2, "U₂′", 6, 12), (Vv2, "V₂′", -14, 0)):
    S.append(dot(p, ORANGE, 3))
    S.append(text(p, name, ORANGE, 12, dx=dx, dy=dy))
S.append(dot(X2, ORANGE, 4.5))
S.append(text(X2, "X′", ORANGE, dx=8, dy=-8, weight="600"))
S.append(text((548, 72), "像平面：全部被强制", DARK, 14, "middle", weight="600", halo=True))

# ---- 底部三步图例 ----
ly = 425
S.append(text((45, ly),      "①", RED, 15, weight="700"))
S.append(text((68, ly),      "R = P₁P₂∩P₃P₄，其像被强制：R′ = Q₁Q₂∩Q₃Q₄（结合关系保持）", DARK, 13))
S.append(text((45, ly + 24), "②", BLUE, 15, weight="700"))
S.append(text((68, ly + 24), "红边上有 3 对对应点 ⇒ 边上每一点的像被交比钉死（5.3 一维版本）", DARK, 13))
S.append(text((45, ly + 48), "③", ORANGE, 15, weight="700"))
S.append(text((68, ly + 48), "过 X 的割线交边于 U、V ⇒ X′ 落在 U′V′ 上；两条割线交出 X′", DARK, 13))

S.append('</svg>')

import os
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "images", "05-射影几何-交比-11.svg")
with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(S))
print("written:", out)
