/* =========================================================================
   从变换看几何 · 交互式课件 —— 主脚本
   负责：侧边栏导航、主题切换、阅读进度、KaTeX 渲染、折叠记忆、回到顶部
   ========================================================================= */

/* ---------- 章节元数据（所有页面共享，保证导航一致） ---------- */
const CHAPTERS = [
  { id: "00", file: "index.html", num: "封", title: "封面 · 目录", short: "首页", tags: [] },
  { id: "01", file: "01.html", num: "01", title: "引子：运动的眼光看几何", short: "引子",
    tags: ["克莱因", "变换群"] },
  { id: "02", file: "02.html", num: "02", title: "刚体变换：等距", short: "刚体变换",
    tags: ["反射", "E(2)"] },
  { id: "03", file: "03.html", num: "03", title: "相似变换：保形", short: "相似变换",
    tags: ["位似", "分形"] },
  { id: "04", file: "04.html", num: "04", title: "仿射变换：保平行", short: "仿射变换",
    tags: ["椭圆", "剪切"] },
  { id: "05", file: "05.html", num: "05", title: "射影几何：交比", short: "射影几何",
    tags: ["交比", "灭点"] },
  { id: "06", file: "06.html", num: "06", title: "反演变换：直线变圆", short: "反演",
    tags: ["保角", "广义圆"] },
  { id: "07", file: "07.html", num: "07", title: "爱尔兰根纲领：统一", short: "爱尔兰根纲领",
    tags: ["群 + 不变量", "层级"] },
  { id: "08", file: "08.html", num: "08", title: "对称性与群", short: "对称性与群",
    tags: ["二面体群", "伽罗瓦"] },
  { id: "09", file: "09.html", num: "09", title: "影响与意义", short: "影响与意义",
    tags: ["诺特定理", "规范场"] },
];

const STORE = {
  theme: "geo_theme",
  read: "geo_read_chapters",   // 已阅读章节 id 数组
};

/* ---------- DOM 就绪 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  buildTopbar();
  buildSidebar();
  buildToTop();
  initProgress();
  markCurrentRead();
  enhanceDetails();
  renderMath();
  initSmoothAnchors();
});

/* ============================ 主题 ============================ */
function initTheme() {
  const saved = localStorage.getItem(STORE.theme);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(STORE.theme, next);
}

/* ============================ 顶栏 ============================ */
function buildTopbar() {
  const here = currentChapter();
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  // 顶栏由各页静态提供结构，这里只注入动态部分
  const themeBtn = topbar.querySelector("[data-act=theme]");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  const menuBtn = topbar.querySelector("[data-act=menu]");
  if (menuBtn) menuBtn.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("open");
  });
  const crumb = topbar.querySelector(".crumb");
  if (crumb && here) {
    crumb.innerHTML = `第 <b>${here.num}</b> 章 · ${here.short}`;
  }
}

/* ============================ 侧边栏 ============================ */
function currentChapter() {
  const path = location.pathname.split("/").pop() || "index.html";
  return CHAPTERS.find(c => c.file === path);
}

function buildSidebar() {
  const sb = document.querySelector(".sidebar");
  if (!sb) return;
  const here = currentChapter();
  const read = getReadSet();

  const parts = [];
  parts.push(`<div class="side-title">导航</div>`);
  for (const c of CHAPTERS) {
    const active = here && c.id === here.id ? "active" : "";
    const done = read.has(c.id) && c.id !== "00" ? "done" : "";
    parts.push(
      `<a class="side-link ${active} ${done}" href="${c.file}">
        <span class="num">${c.num}</span>
        <span>${c.short}</span>
      </a>`);
  }
  parts.push(`<div class="side-section" style="margin-top:18px">全书精神</div>`);
  parts.push(`<div style="padding:6px 14px;font-size:12.5px;color:var(--text-faint);line-height:1.6">
    <b style="color:var(--brand-deep)">几何 = 变换群 + 不变量。</b><br>
    每一种几何，对应一种"允许的运动"。
  </div>`);
  sb.innerHTML = parts.join("");
}

function getReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(STORE.read) || "[]")); }
  catch { return new Set(); }
}
function markCurrentRead() {
  const here = currentChapter();
  if (!here || here.id === "00") return;
  const s = getReadSet();
  s.add(here.id);
  localStorage.setItem(STORE.read, JSON.stringify([...s]));
}

/* ============================ 阅读进度条 ============================ */
function initProgress() {
  const bar = document.querySelector(".progress-bar");
  const toTop = document.querySelector(".to-top");
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const total = h.scrollHeight - h.clientHeight;
    const pct = total > 0 ? (scrolled / total) * 100 : 0;
    bar.style.width = pct + "%";
    if (toTop) toTop.classList.toggle("show", scrolled > 500);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function buildToTop() {
  const btn = document.querySelector(".to-top");
  if (btn) btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ============================ KaTeX 渲染 ============================ */
function renderMath() {
  if (typeof renderMathInElement !== "function") {
    // KaTeX 未加载（离线），保留原始可读文本
    console.warn("KaTeX 未加载，公式以源码显示。");
    return;
  }
  const root = document.querySelector(".content") || document.body;
  renderMathInElement(root, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
    throwOnError: false,
    strict: false,
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    ignoredClasses: ["no-math"],
  });
  // 盒装公式
  document.querySelectorAll(".eq-box").forEach(el => {
    el.classList.add("katex-rendered");
  });
}

/* ============================ 折叠记忆 ============================ */
function enhanceDetails() {
  document.querySelectorAll("details.fold").forEach((d, i) => {
    const key = (currentChapter()?.id || "x") + "_fold_" + i;
    const saved = localStorage.getItem(key);
    if (saved === "1") d.open = true;
    d.addEventListener("toggle", () => {
      localStorage.setItem(key, d.open ? "1" : "0");
    });
  });
}

/* ============================ 平滑锚点 ============================ */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href").slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + id);
      }
    });
  });
}

/* 暴露给 viz.js */
window.GEO = { CHAPTERS, toggleTheme };
