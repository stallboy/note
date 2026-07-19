/* =========================================================================
   从变换看几何(严格版)· 主脚本
   职责:主题切换(浅/深,记忆)、KaTeX 自动渲染、平滑锚点、测验组件挂载。
   ========================================================================= */
(function () {
  "use strict";

  var THEME_KEY = "geo_rig_theme";

  /* ---------- 主题 ---------- */
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var prefersDark = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.querySelector("[data-act=theme]");
    if (btn) btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") || "light";
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  /* ---------- 平滑锚点 ---------- */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        if (!id) return;
        var el = document.getElementById(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", "#" + id);
        }
      });
    });
  }

  /* ---------- KaTeX ---------- */
  function renderMath() {
    if (typeof renderMathInElement !== "function") {
      // 离线 / CDN 未加载:公式以可读 LaTeX 源码显示
      if (window.console) console.warn("KaTeX 未加载,公式以源码显示。");
      return;
    }
    var root = document.querySelector(".content") || document.body;
    renderMathInElement(root, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$",  right: "$",  display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false,
      strict: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      ignoredClasses: ["no-math"]
    });
  }

  /* ---------- 测验组件(可复用) ----------
     结构:
       <div class="quiz" data-qid="q1">
         <div class="quiz-q"><span class="qid">Q1</span> 问题</div>
         <div class="quiz-opts">
           <button class="quiz-opt" data-correct="true">对</button>
           <button class="quiz-opt">错</button>
         </div>
         <div class="quiz-fb" data-kind="correct">答对的反馈…</div>
         <div class="quiz-fb" data-kind="wrong">答错的反馈…</div>
       </div>
  ---------- */
  function initQuiz() {
    document.querySelectorAll(".quiz").forEach(function (quiz) {
      var opts = quiz.querySelectorAll(".quiz-opt");
      var fbOk = quiz.querySelector('.quiz-fb[data-kind="correct"]');
      var fbNo = quiz.querySelector('.quiz-fb[data-kind="wrong"]');
      opts.forEach(function (opt) {
        opt.addEventListener("click", function () {
          var isCorrect = opt.getAttribute("data-correct") === "true";
          opts.forEach(function (o) { o.disabled = true; });
          if (isCorrect) {
            opt.classList.add("correct");
            opt.insertAdjacentHTML("beforeend", ' <span class="mark">✓</span>');
            if (fbOk) fbOk.classList.add("show");
          } else {
            opt.classList.add("wrong");
            opt.insertAdjacentHTML("beforeend", ' <span class="mark">✕</span>');
            // 顺便标出正确项
            opts.forEach(function (o) {
              if (o.getAttribute("data-correct") === "true") o.classList.add("correct");
            });
            if (fbNo) fbNo.classList.add("show");
          }
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initSmoothAnchors();
    initQuiz();
    renderMath();
  });
})();
