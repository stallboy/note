/* =========================================================================
   从变换看几何 · 交互式可视化组件库 viz.js
   组件：
     TransformLab     2D 仿射变换实验台（矩阵 a,b,c,d + 平移）
     MirrorComposer   两面镜子合成旋转/平移
     SimilarityPlay   复数相似 z → az + b
     CrossRatio       四点交比计算器 + 射影变换不变性验证
     Inversion        关于圆的反演（拖拽点 / 直线变圆）
     Hierarchy        五级几何层级互动
     Dihedral         正 n 边形对称群 + 凯莱表
     Bracelet         伯恩赛德引理手链计数
   用法：在 HTML 中放 <div data-viz="组件名" data-...="..."></div>
   ========================================================================= */

const REDRAWERS = [];
const _obs = new MutationObserver(() => REDRAWERS.forEach(fn => { try { fn(); } catch(e){} }));
_obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function COLORS() {
  return {
    bg: cssVar("--bg-elev"),
    grid: cssVar("--border"),
    axis: cssVar("--text-faint"),
    text: cssVar("--text"),
    soft: cssVar("--text-soft"),
    brand: cssVar("--brand"),
    accent: cssVar("--accent"),
    warn: cssVar("--warn"),
    gold: cssVar("--gold"),
    think: cssVar("--c-think"),
  };
}

/* 高 DPI canvas 工厂。返回 ctx、坐标变换、尺寸 */
function makeCanvas(canvas, size) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = size / 2, cy = size / 2;
  // 世界坐标 → 屏幕坐标（y 翻转，unit 为每单位像素数）
  return {
    ctx, size, cx, cy,
    toX: (x, unit) => cx + x * unit,
    toY: (y, unit) => cy - y * unit,
  };
}

/* 绘制坐标系网格 + 轴 */
function drawAxes(v, unit, opts = {}) {
  const { ctx, size, cx, cy } = v;
  const C = COLORS();
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, size, size);
  // 网格
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const step = unit;
  for (let x = cx % step; x < size; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, size); }
  for (let y = cy % step; y < size; y += step) { ctx.moveTo(0, y); ctx.lineTo(size, y); }
  ctx.stroke();
  // 轴
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(size, cy);
  ctx.moveTo(cx, 0); ctx.lineTo(cx, size);
  ctx.stroke();
  // 单位标记
  if (opts.unitLabel !== false) {
    ctx.fillStyle = C.soft;
    ctx.font = "11px " + cssVar("--font-mono");
    ctx.textAlign = "center";
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      ctx.fillText(i, cx + i * unit, cy + 14);
      ctx.fillText(i, cx - 14, cy - i * unit + 4);
    }
  }
}

/* 绘制多边形（世界坐标点数组） */
function strokePoly(v, unit, pts, color, w = 2.2, dash = []) {
  const { ctx } = v;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
  ctx.beginPath();
  pts.forEach((p, i) => {
    const X = v.toX(p[0], unit), Y = v.toY(p[1], unit);
    i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
  });
  ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
}
function fillPoly(v, unit, pts, color, alpha = 0.14) {
  const { ctx } = v;
  ctx.fillStyle = color; ctx.globalAlpha = alpha;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const X = v.toX(p[0], unit), Y = v.toY(p[1], unit);
    i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
  });
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
function drawCircle(v, unit, cxw, cyw, r, color, w = 2.2, dash = [], fill = null, fa = 0.12) {
  const { ctx } = v;
  const rpx = r * unit;
  if (rpx < 0.5) return;
  if (fill) { ctx.fillStyle = fill; ctx.globalAlpha = fa;
    ctx.beginPath(); ctx.arc(v.toX(cxw, unit), v.toY(cyw, unit), rpx, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
  ctx.beginPath(); ctx.arc(v.toX(cxw, unit), v.toY(cyw, unit), rpx, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
}
function drawPoint(v, unit, p, color, label, r = 4.5) {
  const { ctx } = v;
  const X = v.toX(p[0], unit), Y = v.toY(p[1], unit);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X, Y, r, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = COLORS().bg; ctx.lineWidth = 1.5; ctx.stroke();
  if (label) {
    ctx.fillStyle = color; ctx.font = "bold 13px " + cssVar("--font-sans");
    ctx.textAlign = "left"; ctx.fillText(label, X + 8, Y - 8);
  }
}
function drawLine(v, unit, p, dir, color, w = 2.2, dash = []) {
  // 过点 p、方向 dir（单位向量）的直线，画穿画布
  const { ctx, size } = v;
  const t = 4;
  const p1 = [p[0] + dir[0] * t, p[1] + dir[1] * t];
  const p2 = [p[0] - dir[0] * t, p[1] - dir[1] * t];
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(v.toX(p1[0], unit), v.toY(p1[1], unit));
  ctx.lineTo(v.toX(p2[0], unit), v.toY(p2[1], unit));
  ctx.stroke(); ctx.setLineDash([]);
}

const TRIANGLE = [[0.3, -0.3], [1.4, -0.3], [0.85, 0.8]]; // 一个示例三角形
const SQUARE = [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]];

/* 滑块构造辅助 */
function slider(labelHTML, min, max, step, val, onInput) {
  const wrap = document.createElement("div");
  wrap.className = "viz-ctrl";
  const lab = document.createElement("label");
  lab.innerHTML = labelHTML;
  const input = document.createElement("input");
  input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = val;
  const valSpan = lab.querySelector(".val");
  input.addEventListener("input", () => {
    if (valSpan) valSpan.textContent = input.value;
    onInput(parseFloat(input.value));
  });
  wrap.appendChild(lab); wrap.appendChild(input);
  return { wrap, input };
}

/* =========================================================================
   TransformLab：2D 仿射变换实验台
   ========================================================================= */
function TransformLab(root) {
  const opts = {
    showCircle: root.dataset.circle !== "false",
    showSquare: root.dataset.square !== "false",
    showTri: root.dataset.tri !== "false",
    presets: (root.dataset.presets || "identity,rot90,reflx,refleq,stretch,shear,squeeze").split(","),
    title: root.dataset.title || "仿射变换实验台",
  };
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">🧮</span>
        <span class="vtitle">${opts.title}</span>
        <span class="vsub">拖动滑块改矩阵，看图形如何变化</span></div>
      <div class="viz-body">
        <div class="viz-canvas-wrap"><canvas></canvas></div>
        <div class="viz-readout" data-rd></div>
        <div class="viz-controls" data-ct></div>
        <div class="viz-buttons" data-pres></div>
        <div class="viz-legend">
          <span><i style="background:var(--text-faint)"></i>原图</span>
          <span><i style="background:var(--brand)"></i>变换后</span>
          <span><i style="background:var(--accent)"></i>单位圆→</span>
        </div>
      </div>
    </div>`;
  const canvas = root.querySelector("canvas");
  const rd = root.querySelector("[data-rd]");
  const ct = root.querySelector("[data-ct]");
  const pres = root.querySelector("[data-pres]");
  const state = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  const v = makeCanvas(canvas, 380);
  function render() {
    const C = COLORS();
    drawAxes(v, 70);
    const T = ([x, y]) => [state.a * x + state.b * y + state.e, state.c * x + state.d * y + state.f];
    if (opts.showCircle) {
      const n = 80, pts = [];
      for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI; pts.push(T([Math.cos(t), Math.sin(t)])); }
      strokeLoop(pts);
      // 原单位圆
      ctxDashCircle(0, 0, 1, C.axis, [4, 4]);
    }
    if (opts.showSquare) {
      strokePoly(v, 70, SQUARE, C.soft, 1.6, [3, 4]);
      strokePoly(v, 70, SQUARE.map(T), C.brand, 2.6);
      fillPoly(v, 70, SQUARE.map(T), C.brand, 0.1);
    }
    if (opts.showTri) {
      strokePoly(v, 70, TRIANGLE, C.soft, 1.6, [3, 4]);
      strokePoly(v, 70, TRIANGLE.map(T), C.warn, 2.6);
      fillPoly(v, 70, TRIANGLE.map(T), C.warn, 0.1);
    }
    // 行列式平行四边形（列向量张成）
    drawColVecs(C.gold);
    updateReadout();
  }
  function strokeLoop(pts) {
    const { ctx } = v;
    ctx.beginPath();
    pts.forEach((p, i) => { const X = v.toX(p[0], 70), Y = v.toY(p[1], 70);
      i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
    ctx.closePath();
    ctx.strokeStyle = COLORS().accent; ctx.lineWidth = 2.6; ctx.stroke();
  }
  function ctxDashCircle(cxw, cyw, r, color, dash) {
    drawCircle(v, 70, cxw, cyw, r, color, 1.5, dash);
  }
  function drawColVecs(color) {
    const { ctx } = v, C = COLORS();
    const o = [state.e, state.f];
    const col1 = [state.a, state.c], col2 = [state.b, state.d];
    for (const [col, lbl] of [[col1, ""], [col2, ""]]) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(v.toX(o[0], 70), v.toY(o[1], 70));
      ctx.lineTo(v.toX(o[0] + col[0], 70), v.toY(o[1] + col[1], 70));
      ctx.stroke();
      drawPoint(v, 70, [o[0] + col[0], o[1] + col[1]], color);
    }
  }
  function classify() {
    const { a, b, c, d } = state;
    const det = a * d - b * c;
    const n1 = Math.hypot(a, c), n2 = Math.hypot(b, d), dot = a * b + c * d;
    const ortho = Math.abs(dot) < 0.02;
    if (Math.abs(n1 - 1) < 0.02 && Math.abs(n2 - 1) < 0.02 && ortho)
      return { type: "等距（刚体）", color: "ok", det, extra: orient() };
    if (Math.abs(n1 - n2) < 0.02 && ortho)
      return { type: "相似变换", color: "hl", det, extra: `相似比 k=${n1.toFixed(2)}，面积比 k²=${(n1*n1).toFixed(2)}` };
    return { type: "一般仿射变换", color: "hl", det, extra: "不再保角、不再保圆" };
  }
  function orient() {
    const det = state.a * state.d - state.b * state.c;
    return det > 0 ? "正向（保手性）" : "反向（翻面）";
  }
  function updateReadout() {
    const { a, b, c, d, e, f } = state;
    const det = a * d - b * c;
    const cls = classify();
    rd.innerHTML =
      `<span class="k">矩阵 M =</span>
       <span class="matrix-display"><span class="paren">⎡</span>
         <table><tr><td>${a.toFixed(2)}</td><td>${b.toFixed(2)}</td></tr>
               <tr><td>${c.toFixed(2)}</td><td>${d.toFixed(2)}</td></tr></table>
         <span class="paren">⎤</span></span>
       &nbsp;<span class="k">平移=</span>(${e.toFixed(1)}, ${f.toFixed(1)})<br>
       <span class="k">det M =</span> <span class="${det < 0 ? 'hl' : 'ok'}">${det.toFixed(3)}</span>
       &nbsp;<span class="k">| 面积缩放</span> ${Math.abs(det).toFixed(2)}×
       &nbsp;${det < 0 ? '<span class="hl">(反向)</span>' : ''}<br>
       <span class="k">类型：</span><span class="${cls.color}">${cls.type}</span>
       — ${cls.extra}`;
  }
  // 控件
  const mk = (key, name, min, max, step, val, fmt) => {
    const lab = `${name} <span class="val">${fmt(val)}</span>`;
    const s = slider(lab, min, max, step, val, x => { state[key] = x; render(); });
    s.fmt = fmt; ct.appendChild(s.wrap); return s;
  };
  const ctrls = {
    a: mk("a", "a (M₁₁)", -2, 2, 0.01, 1, x => (+x).toFixed(2)),
    b: mk("b", "b (M₁₂)", -2, 2, 0.01, 0, x => (+x).toFixed(2)),
    c: mk("c", "c (M₂₁)", -2, 2, 0.01, 0, x => (+x).toFixed(2)),
    d: mk("d", "d (M₂₂)", -2, 2, 0.01, 1, x => (+x).toFixed(2)),
    e: mk("e", "e (平移 x)", -2, 2, 0.1, 0, x => (+x).toFixed(1)),
    f: mk("f", "f (平移 y)", -2, 2, 0.1, 0, x => (+x).toFixed(1)),
  };
  // 预设
  const PRESET = {
    identity: { name: "恒等", a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    rot90: { name: "旋转 90°", a: 0, b: -1, c: 1, d: 0, e: 0, f: 0 },
    rot45: { name: "旋转 45°", a: .707, b: -.707, c: .707, d: .707, e: 0, f: 0 },
    reflx: { name: "反射(x轴)", a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 },
    refleq: { name: "反射(y=x)", a: 0, b: 1, c: 1, d: 0, e: 0, f: 0 },
    stretch: { name: "横向拉伸×2", a: 2, b: 0, c: 0, d: 1, e: 0, f: 0 },
    shear: { name: "剪切", a: 1, b: 1, c: 0, d: 1, e: 0, f: 0 },
    squeeze: { name: "挤压(det=1)", a: 1.5, b: 0, c: 0, d: .667, e: 0, f: 0 },
  };
  opts.presets.forEach(key => {
    const p = PRESET[key]; if (!p) return;
    const btn = document.createElement("button");
    btn.className = "viz-btn"; btn.textContent = p.name;
    btn.onclick = () => {
      Object.assign(state, { a: p.a, b: p.b, c: p.c, d: p.d, e: p.e, f: p.f });
      for (const k of ["a", "b", "c", "d", "e", "f"]) {
        ctrls[k].input.value = state[k];
        ctrls[k].input.parentElement.querySelector(".val").textContent = ctrls[k].fmt(state[k]);
      }
      render();
    };
    pres.appendChild(btn);
  });
  REDRAWERS.push(render);
  render();
}

/* =========================================================================
   MirrorComposer：两面镜子合成旋转 / 平移
   ========================================================================= */
function MirrorComposer(root) {
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">🪞</span>
        <span class="vtitle">反射生成定理：两面镜子造出旋转</span>
        <span class="vsub">调第二面镜子，看"两次反射 = 一次旋转 2α"</span></div>
      <div class="viz-body">
        <div class="viz-canvas-wrap"><canvas></canvas></div>
        <div class="viz-readout" data-rd></div>
        <div class="viz-controls" data-ct></div>
        <div class="viz-legend">
          <span><i style="background:var(--brand)"></i>镜面</span>
          <span><i style="background:var(--text-faint)"></i>原图 P</span>
          <span><i style="background:var(--soft)"></i>反射① S₁(P)</span>
          <span><i style="background:var(--accent)"></i>反射② S₂S₁(P) = 旋转 2α</span>
        </div>
        <p class="viz-hint">两镜面相交于原点、夹角 α；两次反射等价于绕原点旋转 2α。</p>
      </div>
    </div>`;
  const canvas = root.querySelector("canvas");
  const rd = root.querySelector("[data-rd]");
  const ct = root.querySelector("[data-ct]");
  const v = makeCanvas(canvas, 380);
  const state = { alpha: 45 }; // 镜面2 相对镜面1(x轴)的夹角，度
  // 镜面1 = x 轴（角度0）。镜面2 角度 = alpha。
  function reflect(P, ang) {
    // 关于过原点、角度 ang 的直线反射
    const c = Math.cos(-2 * ang), s = Math.sin(-2 * ang);
    return [c * P[0] - s * P[1], s * P[0] + c * P[1]];
  }
  function render() {
    const C = COLORS();
    drawAxes(v, 80);
    const a1 = 0, a2 = state.alpha * Math.PI / 180;
    const dir1 = [Math.cos(a1), Math.sin(a1)], dir2 = [Math.cos(a2), Math.sin(a2)];
    // 镜面
    drawLine(v, 80, [0, 0], dir1, C.brand, 2.4);
    drawLine(v, 80, [0, 0], dir2, C.brand, 2.4);
    // 标签
    ctxLabel(v, [1.7, 0.05], "镜面1 (x轴)", C.brand);
    ctxLabel(v, dir2.map(d => d * 1.7 + [.05, .05]), "镜面2", C.brand);
    // α 角弧
    drawArc(v, 80, [0, 0], 0.55, a1, a2, C.gold);
    ctxLabel(v, [0.6, 0.28], "α=" + state.alpha + "°", C.gold);
    // 点 P
    const P = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)]; // 30° 处
    const P1 = reflect(P, a1);
    const P2 = reflect(P1, a2);
    // 连线
    seg(v, 80, P, P1, C.soft, [4, 4]);
    seg(v, 80, P1, P2, C.accent, [4, 4]);
    drawPoint(v, 80, P, C.text, "P", 5);
    drawPoint(v, 80, P1, C.soft, "S₁(P)", 4.5);
    drawPoint(v, 80, P2, C.accent, "S₂S₁(P)", 5);
    // 旋转弧 P → P2
    const angP = Math.atan2(P[1], P[0]), angP2 = Math.atan2(P2[1], P2[0]);
    drawArc(v, 80, [0, 0], 1.2, angP, angP2, C.accent, true);
    drawPoint(v, 80, [0, 0], C.gold, "O", 4);
    rd.innerHTML = `<span class="k">两镜面夹角</span> α = <span class="ok">${state.alpha}°</span>
      &nbsp;→&nbsp; <span class="k">两次反射 = 绕 O 旋转</span>
      <span class="hl">2α = ${2 * state.alpha}°</span><br>
      <span class="k">点 P 在 ${Math.round(angP * 180 / Math.PI)}°</span>，
      S₁(P) 在 ${Math.round(Math.atan2(P1[1], P1[0]) * 180 / Math.PI)}°，
      S₂S₁(P) 在 ${Math.round(angP2 * 180 / Math.PI)}°。
      <span class="ok">${2 * state.alpha}° = 2 × ${state.alpha}° ✓</span>`;
  }
  const s = slider(`第二面镜面角度 α <span class="val">45</span>°`, -85, 85, 1, 45, x => {
    state.alpha = x; render();
  });
  ct.appendChild(s.wrap);
  REDRAWERS.push(render);
  render();
}
function ctxLabel(v, p, txt, color) {
  const { ctx } = v;
  ctx.fillStyle = color; ctx.font = "12.5px " + cssVar("--font-sans");
  ctx.textAlign = "left"; ctx.fillText(txt, v.toX(p[0], 80) + 6, v.toY(p[1], 80) - 4);
}
function seg(v, unit, a, b, color, dash = []) {
  const { ctx } = v; ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(v.toX(a[0], unit), v.toY(a[1], unit));
  ctx.lineTo(v.toX(b[0], unit), v.toY(b[1], unit)); ctx.stroke(); ctx.setLineDash([]);
}
function drawArc(v, unit, c, r, a0, a1, color, ccw = false) {
  const { ctx } = v;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  // canvas y 翻转 → 角度取负
  const s = -a0, e = -a1;
  ctx.arc(v.toX(c[0], unit), v.toY(c[1], unit), r * unit, Math.min(s, e), Math.max(s, e));
  ctx.stroke();
}

/* =========================================================================
   SimilarityPlay：复数相似 z → az + b
   ========================================================================= */
function SimilarityPlay(root) {
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">🔍</span>
        <span class="vtitle">相似变换 z → a·z + b</span>
        <span class="vsub">|a| 缩放 · arg a 旋转 · b 平移 —— 形状不变</span></div>
      <div class="viz-body">
        <div class="viz-canvas-wrap"><canvas></canvas></div>
        <div class="viz-readout" data-rd></div>
        <div class="viz-controls" data-ct></div>
        <div class="viz-legend">
          <span><i style="background:var(--text-faint)"></i>原图</span>
          <span><i style="background:var(--brand)"></i>相似像</span>
          <span><i style="background:var(--accent)"></i>边长×k，面积×k²</span>
        </div>
      </div>
    </div>`;
  const canvas = root.querySelector("canvas"), rd = root.querySelector("[data-rd]"), ct = root.querySelector("[data-ct]");
  const v = makeCanvas(canvas, 380);
  const state = { k: 1.4, theta: 30, bx: 0.5, by: 0.5 };
  function T([x, y]) {
    const a = state.k * Math.cos(state.theta * Math.PI / 180);
    const b = state.k * Math.sin(state.theta * Math.PI / 180);
    // (a+ib)(x+iy) = (ax-by)+i(ay+bx)
    return [a * x - b * y + state.bx, a * y + b * x + state.by];
  }
  function render() {
    drawAxes(v, 70);
    const C = COLORS();
    strokePoly(v, 70, TRIANGLE, C.soft, 1.6, [3, 4]);
    strokePoly(v, 70, TRIANGLE.map(T), C.brand, 2.6);
    fillPoly(v, 70, TRIANGLE.map(T), C.brand, 0.1);
    drawPoint(v, 70, T([0, 0]), C.accent, "b");
    rd.innerHTML = `<span class="k">复数 a =</span> k·e<sup>iθ</sup>，
      k = <span class="ok">${state.k.toFixed(2)}</span>，
      θ = <span class="ok">${state.theta}°</span><br>
      <span class="k">|</span> 相似比 <span class="hl">${state.k.toFixed(2)}</span>，
      面积比 <span class="hl">${(state.k * state.k).toFixed(2)}</span>，
      平移 b = (${state.bx.toFixed(1)}, ${state.by.toFixed(1)})`;
  }
  const m = (key, name, min, max, step, val, fmt) => {
    const s = slider(`${name} <span class="val">${fmt(val)}</span>`, min, max, step, val, x => {
      state[key] = x; render();
      s.input.parentElement.querySelector(".val").textContent = fmt(x);
    });
    ct.appendChild(s.wrap);
  };
  m("k", "相似比 |a| = k", 0.3, 2.5, 0.01, 1.4, x => (+x).toFixed(2));
  m("theta", "旋转角 arg a", -180, 180, 1, 30, x => x + "°");
  m("bx", "平移 b 实部", -2, 2, 0.1, 0.5, x => (+x).toFixed(1));
  m("by", "平移 b 虚部", -2, 2, 0.1, 0.5, x => (+x).toFixed(1));
  REDRAWERS.push(render);
  render();
}

/* =========================================================================
   CrossRatio：四点交比 + 射影不变性
   ========================================================================= */
function CrossRatio(root) {
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">⚖️</span>
        <span class="vtitle">交比 (A,B;C,D) —— 射影不变量</span>
        <span class="vsub">拖动数轴上的点，再施加射影变换看交比纹丝不动</span></div>
      <div class="viz-body">
        <div class="viz-canvas-wrap"><canvas></canvas></div>
        <div class="viz-readout" data-rd></div>
        <div class="viz-controls" data-ct></div>
        <div class="viz-buttons" data-pres></div>
        <p class="viz-hint">公式：(A,B;C,D) = (AC/BC) ÷ (AD/BD)。点可拖动。</p>
      </div>
    </div>`;
  const canvas = root.querySelector("canvas"), rd = root.querySelector("[data-rd]"),
        ct = root.querySelector("[data-ct]"), pres = root.querySelector("[data-pres]");
  const v = makeCanvas(canvas, 360);
  const pts = { A: 1, B: 2, C: 3, D: 4 };
  const labels = ["A", "B", "C", "D"];
  const colors = { A: "var(--brand)", B: "var(--brand)", C: "var(--warn)", D: "var(--warn)" };
  let transform = "none"; // 当前施加的射影变换（仅显示，不改变 pts）
  function f(x) {
    if (transform === "none") return x;
    if (transform === "inv") return 1 / x;
    if (transform === "aff") return x / (x + 1);
    return x;
  }
  function cr(a, b, c, d) {
    return ((c - a) / (c - b)) / ((d - a) / (d - b));
  }
  let dragging = null;
  function render() {
    const { ctx, size } = v;
    const C = COLORS();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, size, size);
    // 数轴
    const y = size / 2, left = 40, right = size - 40;
    const xMin = -0.5, xMax = 5.5, unit = (right - left) / (xMax - xMin);
    const X = val => left + (val - xMin) * unit;
    ctx.strokeStyle = C.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left - 8, y); ctx.lineTo(right + 8, y); ctx.stroke();
    // 刻度
    ctx.fillStyle = C.soft; ctx.font = "11px " + cssVar("--font-mono"); ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(X(i), y - 6); ctx.lineTo(X(i), y + 6); ctx.stroke();
      ctx.fillText(i, X(i), y + 20);
    }
    // 原始点（上排）
    for (const L of labels) {
      const x = X(pts[L]);
      ctx.fillStyle = cssVar(colors[L]); ctx.beginPath(); ctx.arc(x, y - 26, 6, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = C.text; ctx.font = "bold 13px " + cssVar("--font-sans"); ctx.textAlign = "center";
      ctx.fillText(L, x, y - 40);
    }
    // 变换后点（下排）
    if (transform !== "none") {
      for (const L of labels) {
        const val = f(pts[L]); const x = X(val);
        ctx.fillStyle = cssVar(colors[L]); ctx.globalAlpha = .6;
        ctx.beginPath(); ctx.arc(x, y + 26, 6, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = C.accent; ctx.font = "bold 11.5px " + cssVar("--font-sans"); ctx.textAlign = "center";
        ctx.fillText(L + "'", x, y + 44);
        // 连线
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(pts[L]), y - 20); ctx.lineTo(x, y + 20); ctx.stroke();
      }
    }
    const orig = cr(pts.A, pts.B, pts.C, pts.D);
    let trCr = orig, same = true;
    if (transform !== "none") {
      const a2 = f(pts.A), b2 = f(pts.B), c2 = f(pts.C), d2 = f(pts.D);
      trCr = cr(a2, b2, c2, d2);
      same = Math.abs(orig - trCr) < 1e-6;
    }
    rd.innerHTML = `<span class="k">原始四点</span> A=${pts.A}, B=${pts.B}, C=${pts.C}, D=${pts.D}
      &nbsp; <span class="k">交比 =</span> <span class="ok">${orig.toFixed(6)}</span>` +
      (transform !== "none" ? `<br><span class="k">施加变换 ${transformName()} 后：</span>
        A'=${f(pts.A).toFixed(3)}, B'=${f(pts.B).toFixed(3)}, C'=${f(pts.C).toFixed(3)}, D'=${f(pts.D).toFixed(3)}
        &nbsp; <span class="k">交比 =</span> <span class="ok">${trCr.toFixed(6)}</span>
        &nbsp; ${same ? '<span class="ok">✓ 不变！</span>' : '<span class="hl">变化</span>'}` : "");
    // 存交互所需
    v._axis = { y, X, left, right, xMin, xMax, unit };
  }
  function transformName() {
    return { inv: "x→1/x", aff: "x→x/(x+1)" }[transform] || transform;
  }
  // 拖动
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return px;
  }
  function down(e) {
    const px = pos(e); const { y, X } = v._axis;
    for (const L of labels) {
      if (Math.abs(X(pts[L]) - px) < 14) { dragging = L; render(); return; }
    }
  }
  function move(e) {
    if (!dragging) return;
    e.preventDefault();
    const px = pos(e); const { left, right, xMin, xMax, unit } = v._axis;
    let val = xMin + (px - left) / unit;
    val = Math.max(xMin + 0.1, Math.min(xMax - 0.1, val));
    // 避免重合
    const others = labels.filter(L => L !== dragging).map(L => pts[L]);
    if (others.every(o => Math.abs(o - val) > 0.15)) pts[dragging] = +val.toFixed(2);
    render();
  }
  function up() { dragging = null; }
  canvas.addEventListener("mousedown", down); window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  canvas.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", up);
  // 预设：四点 + 变换
  const tbtn = (key, name, primary) => {
    const b = document.createElement("button"); b.className = "viz-btn" + (primary ? " primary" : "");
    b.textContent = name; b.onclick = () => { transform = key; render(); };
    return b;
  };
  pres.appendChild(tbtn("none", "原始", true));
  pres.appendChild(tbtn("inv", "施加 x → 1/x"));
  pres.appendChild(tbtn("aff", "施加 x → x/(x+1)"));
  const reset = document.createElement("button"); reset.className = "viz-btn";
  reset.textContent = "重置为 1,2,3,4";
  reset.onclick = () => { pts.A = 1; pts.B = 2; pts.C = 3; pts.D = 4; render(); };
  pres.appendChild(reset);
  REDRAWERS.push(render);
  render();
}

/* =========================================================================
   Inversion：关于圆的反演
   ========================================================================= */
function Inversion(root) {
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">🔄</span>
        <span class="vtitle">反演 I(P)：OP · OP' = R²</span>
        <span class="vsub">拖动 P 看 P'；勾选"直线变圆"看招牌绝活</span></div>
      <div class="viz-body">
        <div class="viz-canvas-wrap"><canvas></canvas></div>
        <div class="viz-readout" data-rd></div>
        <div class="viz-controls" data-ct></div>
        <div class="viz-legend">
          <span><i style="background:var(--brand)"></i>反演圆 Γ (R=1)</span>
          <span><i style="background:var(--warn)"></i>P</span>
          <span><i style="background:var(--accent)"></i>P'（反演像）</span>
        </div>
      </div>
    </div>`;
  const canvas = root.querySelector("canvas"), rd = root.querySelector("[data-rd]"), ct = root.querySelector("[data-ct]");
  const v = makeCanvas(canvas, 380);
  const unit = 110;
  const state = { P: [1.6, 0.5], showLine: false, lineD: 1.4 }; // lineD：直线到原点距离
  function inv(p) {
    const r2 = p[0] * p[0] + p[1] * p[1];
    if (r2 < 1e-6) return null;
    return [p[0] / r2, p[1] / r2];
  }
  function render() {
    drawAxes(v, unit);
    const C = COLORS();
    // 反演圆
    drawCircle(v, unit, 0, 0, 1, C.brand, 2.4, [], C.brand, 0.06);
    ctxLabel(v, [0.78, 0.78], "Γ (R=1)", C.brand);
    drawPoint(v, unit, [0, 0], C.gold, "O", 4);
    // 射线 OP
    seg(v, unit, [0, 0], [state.P[0] * 3, state.P[1] * 3], C.grid, [3, 4]);
    const Pp = inv(state.P);
    if (Pp) {
      seg(v, unit, [0, 0], state.P, C.warn, 2);
      seg(v, unit, [0, 0], Pp, C.accent, 2);
      drawPoint(v, unit, state.P, C.warn, "P", 5);
      drawPoint(v, unit, Pp, C.accent, "P'", 5);
    }
    // 直线变圆
    if (state.showLine) {
      const d = state.lineD;
      // 直线 x = d（竖直，不过原点当 d≠0），到原点距离 |d|
      drawVertLine(v, unit, d, C.warn, 2.2);
      // 其反演像：圆心 (1/(2d),0)、半径 1/(2|d|)
      if (Math.abs(d) > 0.05) {
        const cx = 1 / (2 * d), r = 1 / (2 * Math.abs(d));
        drawCircle(v, unit, cx, 0, r, C.accent, 2.4, [6, 4], C.accent, 0.1);
        ctxLabel(v, [cx, r + 0.12], "像：过 O 的圆", C.accent);
      }
    }
    if (Pp) {
      const op = Math.hypot(state.P[0], state.P[1]);
      const opp = Math.hypot(Pp[0], Pp[1]);
      rd.innerHTML = `<span class="k">P =</span> (${state.P[0].toFixed(2)}, ${state.P[1].toFixed(2)})
        &nbsp; <span class="k">|OP| =</span> <span class="hl">${op.toFixed(3)}</span><br>
        <span class="k">P' =</span> (${Pp[0].toFixed(3)}, ${Pp[1].toFixed(3)})
        &nbsp; <span class="k">|OP'| =</span> <span class="hl">${opp.toFixed(3)}</span><br>
        <span class="k">OP · OP' =</span> <span class="ok">${(op * opp).toFixed(4)} = R² = 1 ✓</span>`;
    } else {
      rd.innerHTML = `<span class="hl">P 在原点，反演无定义（弹到无穷远）。</span>`;
    }
    v._w = state;
  }
  function drawVertLine(v, unit, xw, color, w) {
    const { ctx, size } = v;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(v.toX(xw, unit), 0); ctx.lineTo(v.toX(xw, unit), size); ctx.stroke();
  }
  let dragP = false;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return [(cx - v.cx) / unit, -(cy - v.cy) / unit];
  }
  canvas.addEventListener("mousedown", e => {
    const p = pos(e);
    if (Math.hypot(p[0] - state.P[0], p[1] - state.P[1]) < 0.25) dragP = true;
  });
  window.addEventListener("mousemove", e => {
    if (!dragP) return;
    const p = pos(e);
    if (Math.hypot(p[0], p[1]) > 0.08) state.P = [+p[0].toFixed(3), +p[1].toFixed(3)];
    render();
  });
  window.addEventListener("mouseup", () => dragP = false);
  canvas.addEventListener("touchstart", e => {
    const p = pos(e);
    if (Math.hypot(p[0] - state.P[0], p[1] - state.P[1]) < 0.3) dragP = true;
  }, { passive: true });
  window.addEventListener("touchmove", e => {
    if (!dragP) return; e.preventDefault();
    const p = pos(e);
    if (Math.hypot(p[0], p[1]) > 0.08) state.P = [+p[0].toFixed(3), +p[1].toFixed(3)];
    render();
  }, { passive: false });
  window.addEventListener("touchend", () => dragP = false);
  // 控件：复选框 + 滑块
  const cw = document.createElement("div"); cw.className = "viz-ctrl"; cw.style.minWidth = "220px";
  const clab = document.createElement("label");
  clab.style.cursor = "pointer"; clab.innerHTML = "显示「直线 x=d → 过 O 的圆」招牌演示";
  const cbox = document.createElement("input");
  cbox.type = "checkbox"; cbox.checked = state.showLine; cbox.style.width = "16px"; cbox.style.height = "16px"; cbox.style.accentColor = "var(--brand)";
  clab.prepend(cbox);
  cbox.onchange = () => { state.showLine = cbox.checked; render(); };
  cw.appendChild(clab);
  const dl = slider(`直线位置 d <span class="val">1.40</span>`, 0.5, 2.2, 0.05, 1.4, x => {
    state.lineD = x; render(); dl.input.parentElement.querySelector(".val").textContent = (+x).toFixed(2);
  });
  ct.appendChild(cw); ct.appendChild(dl.wrap);
  REDRAWERS.push(render);
  render();
}

/* =========================================================================
   Hierarchy：五级几何层级（纯 DOM）
   ========================================================================= */
function Hierarchy(root) {
  const levels = [
    { name: "欧氏几何", inv: "距离 · 角度 · 面积", g: "等距群 E(2)", circleTri: "不同" },
    { name: "相似几何", inv: "角度 · 长度比", g: "相似群 Sim(2)", circleTri: "不同" },
    { name: "仿射几何", inv: "平行 · 共线比例", g: "仿射群 Aff(2)", circleTri: "圆≠三角形（但圆=椭圆）" },
    { name: "射影几何", inv: "交比 · 共线共点", g: "射影群 PGL(3)", circleTri: "不同（圆可变抛物线）" },
    { name: "拓扑", inv: "连通性 · 亏格 · 欧拉示性数", g: "同胚群", circleTri: "相同！都是简单闭曲线" },
  ];
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">🏛️</span>
        <span class="vtitle">几何的层级：群越大，不变量越少</span>
        <span class="vsub">点击某一级，看它保住什么、丢掉什么</span></div>
      <div class="viz-body">
        <div class="hierarchy-flow" data-flow></div>
        <div class="viz-readout" data-rd style="border-left-color:var(--brand)"></div>
      </div>
    </div>`;
  const flow = root.querySelector("[data-flow]");
  const rd = root.querySelector("[data-rd]");
  levels.forEach((lv, i) => {
    const node = document.createElement("div");
    node.className = "hier-node"; node.innerHTML =
      `<div class="hn-name">${lv.name}</div><div class="hn-inv">${lv.inv}</div>`;
    node.onclick = () => {
      root.querySelectorAll(".hier-node").forEach(n => n.classList.remove("active"));
      node.classList.add("active");
      rd.innerHTML = `<span class="k">第 ${i + 1} 级 ·</span> <b>${lv.name}</b>
        &nbsp; <span class="k">变换群：</span><span class="ok">${lv.g}</span><br>
        <span class="k">不变量：</span>${lv.inv}<br>
        <span class="k">圆和三角形是同一个东西吗？</span>
        <span class="${lv.circleTri.includes('相同') ? 'ok' : 'hl'}">${lv.circleTri}</span>`;
    };
    flow.appendChild(node);
    if (i < levels.length - 1) {
      const ar = document.createElement("div"); ar.className = "hier-arrow";
      ar.innerHTML = "⊃"; flow.appendChild(ar);
    }
  });
  root.querySelector(".hier-node").classList.add("active");
  rd.innerHTML = `<span class="k">第 1 级 ·</span> <b>欧氏几何</b>
    &nbsp; <span class="k">变换群：</span><span class="ok">等距群 E(2)</span><br>
    <span class="k">不变量：</span>距离 · 角度 · 面积<br>
    <span class="k">圆和三角形是同一个东西吗？</span><span class="hl">不同</span>`;
}

/* =========================================================================
   Dihedral：正 n 边形对称群
   ========================================================================= */
function Dihedral(root) {
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">🔺</span>
        <span class="vtitle">二面体群 Dₙ：旋转 r 与反射 s</span>
        <span class="vsub">点击 r / s 施加对称变换，看顶点置换</span></div>
      <div class="viz-body">
        <div class="viz-controls" data-ct style="margin-top:0"></div>
        <div class="viz-canvas-wrap"><canvas></canvas></div>
        <div class="viz-readout" data-rd></div>
        <div class="viz-buttons" data-btns></div>
      </div>
    </div>`;
  const ct = root.querySelector("[data-ct]");
  const canvas = root.querySelector("canvas"), rd = root.querySelector("[data-rd]"), btns = root.querySelector("[data-btns]");
  const v = makeCanvas(canvas, 320);
  const state = { n: 3, perm: [0, 1, 2, 3, 4, 5, 6, 7], log: [] };
  function vertices(n) {
    const vs = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + i * 2 * Math.PI / n;
      vs.push([Math.cos(a), Math.sin(a)]);
    }
    return vs;
  }
  function render() {
    const { ctx, size } = v; const C = COLORS();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, size, size);
    const n = state.n, unit = 110;
    // 外接圆
    drawCircle(v, unit, 0, 0, 1, C.grid, 1.2, [3, 4]);
    const vs = vertices(n);
    // 当前置换后的多边形
    const cur = state.perm.slice(0, n).map(i => vs[i]);
    ctx.strokeStyle = C.brand; ctx.lineWidth = 2.6; ctx.beginPath();
    cur.forEach((p, i) => { const X = v.toX(p[0], unit), Y = v.toY(p[1], unit);
      i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
    ctx.closePath(); ctx.stroke();
    // 原始顶点位置（淡）+ 标号
    vs.forEach((p, i) => {
      drawPoint(v, unit, p, C.soft, null, 3.5);
      ctx.fillStyle = C.soft; ctx.font = "11px " + cssVar("--font-mono"); ctx.textAlign = "center";
      const a = Math.PI / 2 + i * 2 * Math.PI / n;
      ctx.fillText(i + 1, v.toX(1.22 * Math.cos(a), unit), v.toY(1.22 * Math.sin(a), unit));
    });
    // 当前各位置上站着的顶点号
    cur.forEach((p, i) => {
      const orig = state.perm[i];
      drawPoint(v, unit, p, C.accent, null, 5);
      ctx.fillStyle = C.text; ctx.font = "bold 12px " + cssVar("--font-sans"); ctx.textAlign = "center";
      ctx.fillText(orig + 1, v.toX(0.62 * p[0], unit) + (p[0] > 0.3 ? 10 : p[0] < -0.3 ? -10 : 0),
        v.toY(0.62 * p[1], unit) - (p[1] > 0.3 ? 0 : p[1] < -0.3 ? 0 : 14));
    });
    // 置换读数
    const cyc = toCycle(state.perm.slice(0, n));
    rd.innerHTML = `<span class="k">当前置换（顶点位置 → 原顶点号）：</span>
      [${state.perm.slice(0, n).map(i => i + 1).join(", ")}]<br>
      <span class="k">轮换记号：</span><span class="ok">${cyc}</span>
      &nbsp; <span class="k">操作序列：</span>${state.log.join(" · ") || "（恒等 e）"}`;
  }
  function toCycle(p) {
    const n = p.length; const visited = new Array(n).fill(false); const cycs = [];
    for (let i = 0; i < n; i++) {
      if (visited[i] || p[i] === i) continue;
      let j = i; const c = [];
      while (!visited[j]) { visited[j] = true; c.push(j + 1); j = p[j]; }
      if (c.length > 1) cycs.push("(" + c.join(" ") + ")");
    }
    return cycs.length ? cycs.join("") : "e（恒等）";
  }
  // r：旋转一步（位置 i 上的顶点 → 位置 i+1）即新 perm[i] = old perm[(i-1+n)%n]
  function applyR() {
    const n = state.n; const np = [];
    for (let i = 0; i < n; i++) np[i] = state.perm[(i - 1 + n) % n];
    state.perm = np; state.log.push("r");
  }
  // s：关于过顶点1的对称轴反射 —— 位置 i ↔ 位置 (n-i)%n？反射使位置 i 上的顶点变
  // 简单：反射把位置 i 的内容换到位置 (-i mod n)
  function applyS() {
    const n = state.n; const np = new Array(n);
    for (let i = 0; i < n; i++) np[(-i + n) % n] = state.perm[i];
    state.perm = np; state.log.push("s");
  }
  // 控件：n
  const sl = slider(`边数 n <span class="val">3</span>`, 3, 8, 1, 3, x => {
    state.n = x; state.perm = Array.from({ length: x }, (_, i) => i); state.log = [];
    sl.input.parentElement.querySelector(".val").textContent = x; render();
  });
  ct.appendChild(sl.wrap);
  const rb = document.createElement("button"); rb.className = "viz-btn primary"; rb.innerHTML = "旋转 r (360°/n)";
  rb.onclick = () => { applyR(); render(); };
  const sb = document.createElement("button"); sb.className = "viz-btn"; sb.innerHTML = "反射 s";
  sb.onclick = () => { applyS(); render(); };
  const eb = document.createElement("button"); eb.className = "viz-btn"; eb.textContent = "重置 e";
  eb.onclick = () => { state.perm = Array.from({ length: state.n }, (_, i) => i); state.log = []; render(); };
  btns.appendChild(rb); btns.appendChild(sb); btns.appendChild(eb);
  REDRAWERS.push(render); render();
}

/* 凯莱表 D3（静态） */
function CayleyD3(root) {
  const elems = ["e", "r", "r²", "s₁", "s₂", "s₃"];
  // 用置换运算。r=(123) 顶点(1,2,3)。以下标 0..5 表示。
  // 0=e,1=r,2=r2,3=s1,4=s2,5=s3 ；乘法表（行·列 = 先列后行）
  // D3 标准乘法：
  const M = [
    [0,1,2,3,4,5],
    [1,2,0,5,3,4],
    [2,0,1,4,5,3],
    [3,4,5,0,1,2],
    [4,5,3,2,0,1],
    [5,3,4,1,2,0],
  ];
  let html = `<div class="cayley-wrap"><table class="cayley"><thead><tr><th>·</th>`;
  elems.forEach(e => html += `<th>${e}</th>`);
  html += `</tr></thead><tbody>`;
  M.forEach((row, i) => {
    html += `<tr><th>${elems[i]}</th>`;
    row.forEach((v, j) => { html += `<td class="${v === 0 ? 'ident' : ''}">${elems[v]}</td>`; });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  html += `<p class="viz-hint">注意不对称的部分（如 r·s₁ ≠ s₁·r）——D₃ 是<b>非交换群</b>。这就是群比普通加法更丰富的地方。</p>`;
  root.innerHTML = html;
}

/* =========================================================================
   Bracelet：伯恩赛德手链计数
   ========================================================================= */
function Bracelet(root) {
  root.innerHTML = `
    <div class="viz-card">
      <div class="viz-head"><span class="vicon">📿</span>
        <span class="vtitle">伯恩赛德引理：本质不同的手链数</span>
        <span class="vsub">旋转翻转视为相同 —— 用群作用去重计数</span></div>
      <div class="viz-body">
        <div class="viz-controls" data-ct style="margin-top:0"></div>
        <div class="viz-readout" data-rd></div>
        <div data-orbits style="margin-top:14px"></div>
        <div class="viz-hint">公式：手链数 = (1/|G|) · Σ 被每个群元素固定的染色数</div>
      </div>
    </div>`;
  const ct = root.querySelector("[data-ct]");
  const rd = root.querySelector("[data-rd]");
  const orbs = root.querySelector("[data-orbits]");
  const state = { n: 3 };
  function compute(n) {
    // 生成 Dn 的所有置换（作用在 n 个位置上）
    const perms = [];
    for (let r = 0; r < n; r++) for (let s = 0; s < 2; s++) {
      const p = new Array(n);
      for (let i = 0; i < n; i++) {
        let k = (i + r) % n;
        if (s) k = ((-k) % n + n) % n;
        p[i] = k;
      }
      perms.push(p);
    }
    // 全部染色 2^n，对每个置换数固定染色（轨道相同）
    let sum = 0;
    for (const p of perms) {
      // 染色被 p 固定 ⟺ 每个循环同色 ⟺ 2^(循环数)
      const seen = new Array(n).fill(false); let cyc = 0;
      for (let i = 0; i < n; i++) { if (seen[i]) continue; let j = i; cyc++;
        while (!seen[j]) { seen[j] = true; j = p[j]; } }
      sum += Math.pow(2, cyc);
    }
    const N = sum / perms.length;
    // 枚举轨道代表
    const reps = enumOrbits(n, perms);
    return { N, perms: perms.length, reps };
  }
  function enumOrbits(n, perms) {
    const all = []; for (let m = 0; m < (1 << n); m++) all.push(m);
    const seen = new Set(); const reps = [];
    for (const m of all) {
      if (seen.has(m)) continue;
      reps.push(m);
      for (const p of perms) {
        let m2 = 0; for (let i = 0; i < n; i++) if ((m >> i) & 1) m2 |= (1 << p[i]);
        seen.add(m2);
      }
    }
    return reps;
  }
  function render() {
    const { N, perms, reps } = compute(state.n);
    rd.innerHTML = `<span class="k">珠数 n =</span> ${state.n}，色数 = 2，群 D<sub>${state.n}</sub> 有
      <span class="ok">${perms}</span> 个元素<br>
      <span class="k">朴素染色数</span> 2<sup>${state.n}</sup> = ${(1 << state.n)}
      &nbsp;<span class="k">→ 去重后本质不同</span>
      <span class="hl">${N}</span> 种`;
    orbs.innerHTML = `<div style="font-size:13px;color:var(--text-soft);margin-bottom:8px">
      ${N} 种代表（黑● / 白○，旋转翻转等价只列一个）：</div>` +
      reps.map(m => {
        const beads = Array.from({ length: state.n }, (_, i) => ((m >> i) & 1) ? "black" : "white");
        return `<span class="bracelet">${beads.map(b => `<span class="bead ${b}"></span>`).join("")}</span>`;
      }).join("");
  }
  const sl = slider(`珠数 n <span class="val">3</span>`, 3, 6, 1, 3, x => {
    state.n = x; sl.input.parentElement.querySelector(".val").textContent = x; render();
  });
  ct.appendChild(sl.wrap);
  render();
}

/* =========================================================================
   初始化
   ========================================================================= */
const REGISTRY = {
  "transform-lab": TransformLab,
  "mirror": MirrorComposer,
  "similarity": SimilarityPlay,
  "cross-ratio": CrossRatio,
  "inversion": Inversion,
  "hierarchy": Hierarchy,
  "dihedral": Dihedral,
  "cayley": CayleyD3,
  "bracelet": Bracelet,
};
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-viz]").forEach(el => {
    const fn = REGISTRY[el.dataset.viz];
    if (fn) try { fn(el); } catch (e) { console.error("viz error", el.dataset.viz, e); }
  });
});
