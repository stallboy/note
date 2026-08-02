# -*- coding: utf-8 -*-
"""重新生成 images/02-习题-04.svg（费马点）与 images/02-习题-05.svg（法格纳诺）。
改用明显不等边的三角形；所有关键点数值验证后写入 SVG 注释与图形。"""
import math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- 基本工具 ----------
def sub(a, b): return (a[0]-b[0], a[1]-b[1])
def add(a, b): return (a[0]+b[0], a[1]+b[1])
def mul(a, k): return (a[0]*k, a[1]*k)
def dot(a, b): return a[0]*b[0]+a[1]*b[1]
def cross(a, b): return a[0]*b[1]-a[1]*b[0]
def norm(a): return math.hypot(a[0], a[1])
def dist(a, b): return norm(sub(a, b))
def rot(v, deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    return (v[0]*c - v[1]*s, v[0]*s + v[1]*c)
def angle_between(u, v):
    return math.degrees(math.acos(max(-1, min(1, dot(u, v)/norm(u)/norm(v)))))
def side(q, p1, p2):
    """q 在直线 p1p2 的哪一侧（cross 符号）"""
    return cross(sub(p2, p1), sub(q, p1))
def line_isect(p1, p2, p3, p4):
    d1, d2 = sub(p2, p1), sub(p4, p3)
    den = cross(d1, d2)
    t = cross(sub(p3, p1), d2)/den
    return add(p1, mul(d1, t))
def foot(p, u, v):
    d = sub(v, u)
    return add(u, mul(d, dot(sub(p, u), d)/dot(d, d)))
def reflect(p, u, v):
    f = foot(p, u, v)
    return sub(mul(f, 2), p)
def fmt(x):
    s = f"{x:.1f}"
    return s[:-2] if s.endswith(".0") else s
def P(p): return f"{fmt(p[0])},{fmt(p[1])}"

FONT = ("ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, "
        "'PingFang SC', 'Microsoft YaHei', sans-serif")

# ============================================================
# 图 04 · 费马点
# ============================================================
A = (60, 50); B = (460, 230); C = (190, 430)

def external_apex(p1, p2, opp):
    """边 p1p2 上、与 opp 异侧的正三角形顶点"""
    for s in (+60, -60):
        q = add(p1, rot(sub(p2, p1), s))
        if side(q, p1, p2) * side(opp, p1, p2) < 0:
            return q, s
    raise RuntimeError

Ap, _ = external_apex(B, C, A)   # BC 边上，与 A 异侧
Bp, _ = external_apex(C, A, B)   # CA 边上，与 B 异侧
Cp, _ = external_apex(A, B, C)   # AB 边上，与 C 异侧

F = line_isect(A, Ap, B, Bp)

# 绕 B 的旋转：C -> A'
sgn = None
for s in (+60, -60):
    if dist(add(B, rot(sub(C, B), s)), Ap) < 1e-6:
        sgn = s
Fp = add(B, rot(sub(F, B), sgn))  # F' = F 绕 B 转 60°

# ---- 数值验证 ----
ang_AFB = angle_between(sub(A, F), sub(B, F))
ang_BFC = angle_between(sub(B, F), sub(C, F))
ang_CFA = angle_between(sub(C, F), sub(A, F))
assert abs(ang_AFB-120) < 1e-6 and abs(ang_BFC-120) < 1e-6 and abs(ang_CFA-120) < 1e-6
# F 在三角形内
s1 = side(F, A, B)*side(C, A, B); s2 = side(F, B, C)*side(A, B, C); s3 = side(F, C, A)*side(B, C, A)
assert s1 > 0 and s2 > 0 and s3 > 0
# 三连线等长 = 距离和
L = dist(A, Ap)
assert abs(L - dist(B, Bp)) < 1e-6 and abs(L - dist(C, Cp)) < 1e-6
S = dist(F, A)+dist(F, B)+dist(F, C)
assert abs(L - S) < 1e-6
# A, F, F', A' 依次共线
d = sub(Ap, A)
for X in (F, Fp):
    assert abs(cross(d, sub(X, A))) < 1e-6
tF  = dot(sub(F, A), d)/dot(d, d)
tFp = dot(sub(Fp, A), d)/dot(d, d)
assert 0 < tF < tFp < 1
# F 在线段 BB' 内部
d2 = sub(Bp, B)
tF2 = dot(sub(F, B), d2)/dot(d2, d2)
assert 0 < tF2 < 1
# 三角形三边明显不等
a04, b04, c04 = dist(B, C), dist(C, A), dist(A, B)
assert max(a04, b04, c04)/min(a04, b04, c04) > 1.25

# ---- 组装 SVG ----
el = []
el.append("""<defs>
    <marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#6b7280"/>
    </marker>
  </defs>""")

# 另两个外向正三角形（极淡）
el.append(f'<polyline points="{P(C)} {P(Bp)} {P(A)}" fill="none" stroke="#d3dae3" stroke-width="1.4" stroke-dasharray="4 4"/>')
el.append(f'<polyline points="{P(A)} {P(Cp)} {P(B)}" fill="none" stroke="#d3dae3" stroke-width="1.4" stroke-dasharray="4 4"/>')
# BC 边的外向正三角形（本次旋转的舞台，稍明显）
el.append(f'<polyline points="{P(B)} {P(Ap)} {P(C)}" fill="none" stroke="#9aa7b8" stroke-width="1.8" stroke-dasharray="5 4" stroke-linejoin="round"/>')
# 三条连线：BB'、CC' 灰虚线；AA' 灰虚线（红折线覆盖其上）
el.append(f'<line x1="{fmt(B[0])}" y1="{fmt(B[1])}" x2="{fmt(Bp[0])}" y2="{fmt(Bp[1])}" stroke="#9aa7b8" stroke-width="1.6" stroke-dasharray="6 4"/>')
el.append(f'<line x1="{fmt(C[0])}" y1="{fmt(C[1])}" x2="{fmt(Cp[0])}" y2="{fmt(Cp[1])}" stroke="#d3dae3" stroke-width="1.4" stroke-dasharray="6 4"/>')
el.append(f'<line x1="{fmt(A[0])}" y1="{fmt(A[1])}" x2="{fmt(Ap[0])}" y2="{fmt(Ap[1])}" stroke="#9aa7b8" stroke-width="1.6" stroke-dasharray="6 4"/>')
# ΔABC
el.append(f'<polygon points="{P(A)} {P(B)} {P(C)}" fill="#dbe9fb" stroke="#1f3a5f" stroke-width="2.5" stroke-linejoin="round"/>')
# FA, FB, FC
for X in (A, B, C):
    el.append(f'<line x1="{fmt(F[0])}" y1="{fmt(F[1])}" x2="{fmt(X[0])}" y2="{fmt(X[1])}" stroke="#1f3a5f" stroke-width="2"/>')
# 红色拉直折线 A->F->F'->A'
el.append(f'<polyline points="{P(A)} {P(F)} {P(Fp)} {P(Ap)}" fill="none" stroke="#c0463a" stroke-width="2.6" stroke-linejoin="round"/>')
# 等边 △BFF'（淡黄）
el.append(f'<polygon points="{P(B)} {P(F)} {P(Fp)}" fill="#fdf3d8" fill-opacity="0.75" stroke="#b58900" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round"/>')
# 旋转弧 C->A'（绕 B，60°）
r = dist(B, C)
sweep = 1 if cross(sub(C, B), sub(Ap, B)) < 0 else 0  # y 向下
el.append(f'<path d="M{P(C)} A{fmt(r)},{fmt(r)} 0 0 {sweep} {P(Ap)}" fill="none" stroke="#6b7280" stroke-width="2" marker-end="url(#arr)"/>')
arc_mid = add(B, rot(sub(C, B), sgn/2))
lbl = add(B, mul(sub(arc_mid, B), 1 + 26/r))
el.append(f'<text x="{fmt(lbl[0])}" y="{fmt(lbl[1])}" fill="#6b7280" font-size="13">旋转 60°</text>')
# F 处三个 120° 弧（沿相邻两射线，半径 26）
rays = [sub(A, F), sub(B, F), sub(C, F)]
rays.sort(key=lambda v: math.atan2(v[1], v[0]))
for i in range(3):
    u, v = rays[i], rays[(i+1) % 3]
    p1 = add(F, mul(u, 26/norm(u))); p2 = add(F, mul(v, 26/norm(v)))
    sw = 1 if cross(u, v) > 0 else 0  # y 向下，cross>0 为顺时针
    el.append(f'<path d="M{P(p1)} A26,26 0 0 {sw} {P(p2)}" fill="none" stroke="#c0463a" stroke-width="1.6"/>')
    bis = add(mul(u, 1/norm(u)), mul(v, 1/norm(v)))
    lp = add(F, mul(bis, 42/norm(bis)))
    el.append(f'<text x="{fmt(lp[0])}" y="{fmt(lp[1])}" text-anchor="middle" fill="#c0463a" font-size="12">120°</text>')
# 顶点与标签
def dot_label(p, color, label, dx, dy, anchor=None, size=16, italic=True):
    a = f' text-anchor="{anchor}"' if anchor else ''
    st = ' font-style="italic"' if italic else ''
    el.append(f'<circle cx="{fmt(p[0])}" cy="{fmt(p[1])}" r="4.5" fill="{color}"/>')
    el.append(f'<text x="{fmt(p[0]+dx)}" y="{fmt(p[1]+dy)}"{a} fill="{color}" font-size="{size}"{st}>{label}</text>')

dot_label(A, "#1f3a5f", "A", -14, -2, "end")
dot_label(B, "#1f3a5f", "B", 14, 4)
dot_label(C, "#1f3a5f", "C", -14, 16, "end")
dot_label(F, "#c0463a", "F", -12, -6, "end")
dot_label(Fp, "#6b7280", "F′", 12, -4, None, 15, False)
dot_label(Ap, "#6b7280", "A′", 14, 6, None, 16, False)
dot_label(Bp, "#9aa7b8", "B′", -14, 4, "end", 15, False)
dot_label(Cp, "#9aa7b8", "C′", 12, -6, None, 15, False)
# 标注
el.append(f'<text x="{fmt(Ap[0]+55)}" y="{fmt(Ap[1]+48)}" text-anchor="end" fill="#c0463a" font-size="13">拉直成 AA′（= BB′ = CC′ = 最小值）</text>')
el.append(f'<text x="{fmt(Fp[0]-8)}" y="{fmt(Fp[1]-100)}" fill="#6b7280" font-size="12">AA′、BB′、CC′ 共点于 F</text>')

# viewBox
allpts = [A, B, C, Ap, Bp, Cp, F, Fp, arc_mid]
xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
x0, x1 = min(xs)-70, max(xs)+70
y0, y1 = min(ys)-70, max(ys)+70

svg04 = f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- 脚本生成 SVG（.svg-render/gen_02_0405.py）：费马点（题4），几何精确（数值验证）。
     ΔABC：A{P(A)} B{P(B)} C{P(C)}（边长 {a04:.0f} / {b04:.0f} / {c04:.0f}，明显不等边）；
     费马点 F{P(F)}，∠AFB=∠BFC=∠CFA=120°；
     外向正三角形顶点 A′{P(Ap)}（BC 边）、B′{P(Bp)}（CA 边）、C′{P(Cp)}（AB 边）；
     F′ = F 绕 B 转 60° = {P(Fp)}，A→F→F′→A′ 恰好共线：折线被拉直成 AA′；
     AA′、BB′、CC′ 共点于 F，且 AA′=BB′=CC′=FA+FB+FC≈{L:.1f}（均已数值验证）。 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(x0)} {fmt(y0)} {fmt(x1-x0)} {fmt(y1-y0)}" text-rendering="geometricPrecision"
     font-family="{FONT}">
  ''' + "\n  ".join(el) + "\n</svg>\n"

with open(os.path.join(ROOT, "images", "02-习题-04.svg"), "w", encoding="utf-8", newline="\n") as f:
    f.write(svg04)

# ============================================================
# 图 05 · 法格纳诺
# ============================================================
A5 = (210, 50); B5 = (50, 340); C5 = (450, 320)
D = foot(A5, B5, C5)   # A -> BC
E = foot(B5, C5, A5)   # B -> CA
G = foot(C5, A5, B5)   # C -> AB（题中叫 F，此处避免与费马点混淆，标记仍为 F）
D1 = reflect(D, A5, B5)
D2 = reflect(D, A5, C5)

# ---- 数值验证 ----
# 三个直角
assert abs(dot(sub(A5, D), sub(C5, B5))) < 1e-6
assert abs(dot(sub(B5, E), sub(A5, C5))) < 1e-6
assert abs(dot(sub(C5, G), sub(B5, A5))) < 1e-6
# 垂足落在边的内部（锐角三角形）
for X, U, V in ((D, B5, C5), (E, C5, A5), (G, A5, B5)):
    d = sub(V, U); t = dot(sub(X, U), d)/dot(d, d)
    assert 0 < t < 1
# 三角形锐角且明显不等边
a5, b5, c5 = dist(B5, C5), dist(C5, A5), dist(A5, B5)
assert max(a5, b5, c5)/min(a5, b5, c5) > 1.15
for (p, q, r_) in ((A5, B5, C5), (B5, C5, A5), (C5, A5, B5)):
    assert angle_between(sub(p, q), sub(r_, q)) < 90
# D1, G, E, D2 共线
d = sub(D2, D1)
for X in (G, E):
    assert abs(cross(d, sub(X, D1))) / norm(d) < 1e-6
# 等长
assert abs(dist(D1, G) - dist(D, G)) < 1e-6
assert abs(dist(D2, E) - dist(D, E)) < 1e-6
# 周长 = D1D2
peri = dist(D, G) + dist(G, E) + dist(E, D)
assert abs(peri - dist(D1, D2)) < 1e-6

el = []
# ΔABC
el.append(f'<polygon points="{P(A5)} {P(B5)} {P(C5)}" fill="#dbe9fb" stroke="#1f3a5f" stroke-width="2.5" stroke-linejoin="round"/>')
# 三条高
el.append(f'<line x1="{fmt(A5[0])}" y1="{fmt(A5[1])}" x2="{fmt(D[0])}" y2="{fmt(D[1])}" stroke="#9aa7b8" stroke-width="1.6" stroke-dasharray="5 4"/>')
el.append(f'<line x1="{fmt(B5[0])}" y1="{fmt(B5[1])}" x2="{fmt(E[0])}" y2="{fmt(E[1])}" stroke="#9aa7b8" stroke-width="1.6" stroke-dasharray="5 4"/>')
el.append(f'<line x1="{fmt(C5[0])}" y1="{fmt(C5[1])}" x2="{fmt(G[0])}" y2="{fmt(G[1])}" stroke="#9aa7b8" stroke-width="1.6" stroke-dasharray="5 4"/>')
# D 与两个对称点的连线
el.append(f'<line x1="{fmt(D1[0])}" y1="{fmt(D1[1])}" x2="{fmt(D[0])}" y2="{fmt(D[1])}" stroke="#c9d2dc" stroke-width="1.4" stroke-dasharray="4 4"/>')
el.append(f'<line x1="{fmt(D2[0])}" y1="{fmt(D2[1])}" x2="{fmt(D[0])}" y2="{fmt(D[1])}" stroke="#c9d2dc" stroke-width="1.4" stroke-dasharray="4 4"/>')
# 展开直线 D1D2
el.append(f'<line x1="{fmt(D1[0])}" y1="{fmt(D1[1])}" x2="{fmt(D2[0])}" y2="{fmt(D2[1])}" stroke="#6b7280" stroke-width="1.6" stroke-dasharray="6 4"/>')
# 垂足三角形（红）
el.append(f'<polygon points="{P(D)} {P(E)} {P(G)}" fill="none" stroke="#c0463a" stroke-width="2.4" stroke-linejoin="round"/>')
# 等长刻度：D1G = DG、D2E = DE（中点处垂直小刻线）
def tick(p, q, t=7):
    m = mul(add(p, q), 0.5)
    d = sub(q, p); n = (-d[1]/norm(d), d[0]/norm(d))
    p1 = add(m, mul(n, t)); p2 = add(m, mul(n, -t))
    el.append(f'<line x1="{fmt(p1[0])}" y1="{fmt(p1[1])}" x2="{fmt(p2[0])}" y2="{fmt(p2[1])}" stroke="#c0463a" stroke-width="2"/>')
tick(D1, G); tick(D, G); tick(D2, E); tick(D, E)
# 直角符号
def right_angle(vtx, u, v, s=12):
    uu = mul(sub(u, vtx), 1/dist(u, vtx)); vv = mul(sub(v, vtx), 1/dist(v, vtx))
    p1 = add(vtx, mul(uu, s)); p2 = add(vtx, add(mul(uu, s), mul(vv, s))); p3 = add(vtx, mul(vv, s))
    el.append(f'<path d="M{P(p1)} L{P(p2)} L{P(p3)}" fill="none" stroke="#374151" stroke-width="1.4"/>')
right_angle(D, B5, A5)
right_angle(E, A5, B5)
right_angle(G, B5, C5)
# 顶点与标签
el2 = el
def dot_label5(p, color, label, dx, dy, anchor=None, size=16, italic=True, r=4.5):
    a = f' text-anchor="{anchor}"' if anchor else ''
    st = ' font-style="italic"' if italic else ''
    el2.append(f'<circle cx="{fmt(p[0])}" cy="{fmt(p[1])}" r="{r}" fill="{color}"/>')
    el2.append(f'<text x="{fmt(p[0]+dx)}" y="{fmt(p[1]+dy)}"{a} fill="{color}" font-size="{size}"{st}>{label}</text>')

dot_label5(A5, "#1f3a5f", "A", 0, -14, "middle")
dot_label5(B5, "#1f3a5f", "B", -14, 16, "end")
dot_label5(C5, "#1f3a5f", "C", 14, 16)
dot_label5(D, "#c0463a", "D", 10, 20, None, 15, True, 4)
dot_label5(E, "#c0463a", "E", 14, -4, None, 15, True, 4)
dot_label5(G, "#c0463a", "F", -14, -4, "end", 15, True, 4)
dot_label5(D1, "#6b7280", "D₁", -12, -8, "end", 15, False, 4)
dot_label5(D2, "#6b7280", "D₂", 12, -8, None, 15, False, 4)
# 标注
el.append(f'<text x="{fmt(A5[0])}" y="{fmt(A5[1]-62)}" text-anchor="middle" fill="#c0463a" font-size="12">周长 = D₁F + FE + ED₂ = D₁D₂（拉直）</text>')
el.append(f'<text x="{fmt(D[0])}" y="{fmt(D[1]+40)}" text-anchor="middle" fill="#c0463a" font-size="12">垂足三角形周长最短</text>')

allpts = [A5, B5, C5, D, E, G, D1, D2]
xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
x0, x1 = min(xs)-55, max(xs)+55
y0, y1 = min(ys)-85, max(ys)+65

svg05 = f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- 脚本生成 SVG（.svg-render/gen_02_0405.py）：法格纳诺定理（题5），几何精确（数值验证）。
     锐角不等边 ΔABC：A{P(A5)} B{P(B5)} C{P(C5)}（边长 {a5:.0f} / {b5:.0f} / {c5:.0f}）；
     垂足 D{P(D)}(A→BC), E{P(E)}(B→CA), F{P(G)}(C→AB)，三者精确垂直且落在边内部；
     D 关于 AB、AC 的对称点 D₁{P(D1)}、D₂{P(D2)}——反射展开后 D₁,F,E,D₂ 恰好共线，
     周长 = D₁F+FE+ED₂ = D₁D₂≈{dist(D1, D2):.1f}（直线），故垂足三角形周长最短。 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(x0)} {fmt(y0)} {fmt(x1-x0)} {fmt(y1-y0)}" text-rendering="geometricPrecision"
     font-family="{FONT}">
  ''' + "\n  ".join(el) + "\n</svg>\n"

with open(os.path.join(ROOT, "images", "02-习题-05.svg"), "w", encoding="utf-8", newline="\n") as f:
    f.write(svg05)

print("OK")
print(f"04: F={F}, F'={Fp}, A'={Ap}")
print(f"    边长 {a04:.1f}/{b04:.1f}/{c04:.1f}, AA'=BB'=CC'={L:.1f}")
print(f"05: D={D}, E={E}, F={G}")
print(f"    边长 {a5:.1f}/{b5:.1f}/{c5:.1f}, 周长=D1D2={dist(D1, D2):.1f}")
