# -*- coding: utf-8 -*-
"""
把 geometry/*.md 转成交互式 HTML（输出到 geometry/html/）。
定制解析：KaTeX 公式、分类提示框、定理盒、折叠证明/习题、SVG 图、交互组件注入。
"""
import re, html, os

HERE = os.path.dirname(os.path.abspath(__file__))
GEO = os.path.dirname(HERE)

CHAPTERS = [
    {"md": "01-引子-运动的眼光看几何.md",   "html": "01.html", "num": "01",
     "title": "引子：运动的眼光看几何", "short": "引子"},
    {"md": "02-刚体变换-等距.md",            "html": "02.html", "num": "02",
     "title": "刚体变换：等距", "short": "刚体变换"},
    {"md": "03-相似变换.md",                  "html": "03.html", "num": "03",
     "title": "相似变换：保形", "short": "相似变换"},
    {"md": "04-仿射变换.md",                  "html": "04.html", "num": "04",
     "title": "仿射变换：保平行", "short": "仿射变换"},
    {"md": "05-射影几何-交比.md",             "html": "05.html", "num": "05",
     "title": "射影几何：交比", "short": "射影几何"},
    {"md": "06-反演变换.md",                  "html": "06.html", "num": "06",
     "title": "反演变换：直线变圆", "short": "反演"},
    {"md": "07-爱尔兰根纲领-几何的统一.md",   "html": "07.html", "num": "07",
     "title": "爱尔兰根纲领：统一", "short": "爱尔兰根纲领"},
    {"md": "08-对称性与群.md",                "html": "08.html", "num": "08",
     "title": "对称性与群", "short": "对称性与群"},
    {"md": "09-影响与意义.md",                "html": "09.html", "num": "09",
     "title": "影响与意义", "short": "影响与意义"},
]
MD2HTML = {c["md"]: c["html"] for c in CHAPTERS}
MD2HTML["README.md"] = "index.html"

# 当前章节号（供注入用）
CUR = {"num": None}

# ----------------------------- 行内 -----------------------------
def md_link(text, url):
    base = url.split("#")[0]
    if base in MD2HTML:
        rest = url[len(base):]
        url = MD2HTML[base] + rest
        # 美化文件名形式的链接文字
        if re.match(r'^\d\d-.*\.md$', text.strip()):
            ch = next(c for c in CHAPTERS if c["md"] == base)
            text = f'第 {ch["num"]} 章 · {ch["short"]}'
    elif url.startswith("images/"):
        url = "../" + url
    return f'<a href="{html.escape(url)}">{text}</a>'

def inline_nomath(s):
    # 行内代码
    s = re.sub(r'`([^`]+)`', lambda m: '<code>' + html.escape(m.group(1)) + '</code>', s)
    # 粗体 **
    s = re.sub(r'\*\*([^*]+?)\*\*', r'<strong>\1</strong>', s, flags=re.S)
    # 斜体 *...*
    s = re.sub(r'(?<!\*)\*([^*\n]+?)\*(?!\*)', r'<em>\1</em>', s)
    # 链接
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: md_link(m.group(1), m.group(2)), s)
    return s

def inline(s):
    # 按公式分段，公式原样保留
    parts = re.split(r'(\$\$[\s\S]+?\$\$|\$[^\s$][^$\n]*?\$)', s)
    out = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            out.append(part)
        else:
            out.append(inline_nomath(part))
    return "".join(out)

# ----------------------------- 块级 -----------------------------
def parse_blocks(text):
    """解析不含 ## 的文本为 HTML 块串。"""
    lines = text.split("\n")
    out = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        # 空行
        if not stripped:
            i += 1; continue

        # 注释
        if stripped.startswith("<!--"):
            while i < n and "-->" not in lines[i]:
                i += 1
            i += 1; continue

        # h3 / h4
        m = re.match(r'^(#{3,4})\s+(.*)', line)
        if m:
            level = len(m.group(1))
            raw = m.group(2).strip()
            raw = raw.replace("⭐", "").strip()
            txt = inline(raw)
            hid = re.sub(r'[^\w一-鿿]+', '-', raw)[:40].strip('-')
            tag = "h3" if level == 3 else "h4"
            out.append(f'<{tag} id="{hid}">{txt}</{tag}>')
            # h3 注入
            for kw, comp in INJ_H3.get(CUR["num"], []):
                if kw in raw:
                    out.append(comp)
            i += 1; continue

        # 代码块 ```
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            code = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                code.append(lines[i]); i += 1
            i += 1  # 跳过结束 ```
            code_str = html.escape("\n".join(code))
            out.append(f'<pre><code class="language-{lang}">{code_str}</code></pre>')
            continue

        # HTML <details> 块
        if stripped.startswith("<details"):
            block, i = collect_html_block(lines, i, "</details>")
            out.append(render_details(block))
            continue
        # 单行 <img ...>
        if stripped.startswith("<img"):
            out.append(render_img_line(stripped)); i += 1; continue
        # 其他裸 HTML 标签行（如 </details> 残留）跳过
        if stripped.startswith("</"):
            i += 1; continue

        # 表格
        if "|" in line and i + 1 < n and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i+1]):
            tbl, i = parse_table(lines, i)
            out.append(tbl); continue

        # 引用块 >
        if line.lstrip().startswith(">"):
            sub, i = collect_blockquote(lines, i)
            out.append(render_blockquote(sub)); continue

        # 无序列表
        if re.match(r'^\s*[-]\s+', line):
            lst, i = parse_list(lines, i, ordered=False)
            out.append(lst); continue
        # 有序列表
        if re.match(r'^\s*\d+\.\s+', line):
            lst, i = parse_list(lines, i, ordered=True)
            out.append(lst); continue

        # 水平线
        if stripped in ("---", "***", "___"):
            out.append("<hr>"); i += 1; continue

        # 块公式（行以 $$ 开头）
        if stripped.startswith("$$"):
            block, i = collect_display_math(lines, i)
            out.append(block); continue

        # 普通段落：收集到空行/块开始
        para = [line]; i += 1
        while i < n:
            l = lines[i]; s2 = l.strip()
            if (not s2 or s2.startswith("#") or s2.startswith(">") or s2.startswith("```")
                or s2.startswith("<details") or s2.startswith("<img") or s2.startswith("$$")
                or s2 in ("---","***","___") or re.match(r'^\s*[-]\s+', l)
                or re.match(r'^\s*\d+\.\s+', l)
                or ("|" in l and i+1 < n and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i+1] if i+1<n else ""))):
                break
            para.append(l); i += 1
        para_text = "\n".join(para).strip()
        out.append(f'<p>{inline(para_text)}</p>')
    return "\n".join(out)

def collect_display_math(lines, i):
    """收集 $$...$$ 块（可能跨行），包进 div 以稳定渲染。"""
    first = lines[i].strip()
    if first.startswith("$$") and first.endswith("$$") and first != "$$":
        return f'<div class="eq-display">{first}</div>', i + 1
    buf = [first]; i += 1
    while i < len(lines):
        buf.append(lines[i])
        if lines[i].strip().endswith("$$"):
            i += 1; break
        i += 1
    return '<div class="eq-display">' + "\n".join(buf) + '</div>', i

def collect_html_block(lines, i, end_tag):
    buf = []
    while i < len(lines):
        buf.append(lines[i])
        if end_tag in lines[i]:
            i += 1; break
        i += 1
    return "\n".join(buf), i

def collect_blockquote(lines, i):
    buf = []
    while i < len(lines):
        l = lines[i]
        m = re.match(r'^\s*>\s?(.*)', l)
        if m:
            buf.append(m.group(1)); i += 1
        else:
            break
    return "\n".join(buf), i

def render_blockquote(sub):
    sub = sub.strip()
    # 分类
    first = sub.split("\n", 1)[0].strip()
    cls, tag = "tip", None
    if first.startswith("💡"): cls = "insight"
    elif first.startswith("✏️"): cls = "calc"
    elif first.startswith("🤔"): cls = "think"
    elif first.startswith("🎯"): cls = "def"
    elif first.startswith("📐") or first.startswith("🎓") or first.startswith("📖"): cls = "tip"
    tm = re.match(r'\*\*(定理|命题|引理|推论)', first)
    if tm:
        kind = tm.group(1)
        body = parse_blocks(sub)
        return (f'<div class="theorem-box"><div class="thm-head">'
                f'<span class="tag">{kind}</span></div>{body}</div>')
    body = parse_blocks(sub)
    return f'<div class="callout {cls}">{body}</div>'

def render_details(block):
    # block 含 <details><summary>...</summary> ... </details>
    m = re.search(r'<details[^>]*>(.*?)</details>', block, re.S)
    if not m:
        return block
    inner = m.group(1)
    sm = re.search(r'<summary>(.*?)</summary>', inner, re.S)
    summary = sm.group(1).strip() if sm else "展开"
    rest = inner[sm.end():] if sm else inner
    body = parse_blocks(rest.strip())
    summ = inline(summary)
    return (f'<details class="fold"><summary>{summ}</summary>'
            f'<div class="fold-body">{body}</div></details>')

def render_img_line(s):
    m = re.search(r'src="([^"]+)"', s)
    alt = re.search(r'alt="([^"]*)"', s)
    src = m.group(1) if m else ""
    if src.startswith("images/"):
        src = "../" + src
    alt_t = alt.group(1) if alt else ""
    style = ""
    sm = re.search(r'style="([^"]+)"', s)
    if sm: style = sm.group(1)
    w = ' style="max-width:560px"' if "560" in (sm.group(1) if sm else "") else ""
    return f'<div class="figure"><img src="{src}" alt="{alt_t}"{w}></div>'

def parse_table(lines, i):
    rows = []
    while i < len(lines):
        l = lines[i].strip()
        if not l or "|" not in l:
            break
        if re.match(r'^\|[\s:|-]+\|$', l):
            i += 1; continue
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        rows.append(cells); i += 1
    if not rows:
        return "", i
    head = rows[0]; body = rows[1:]
    def cell(c, is_head=False):
        t = inline(c)
        t = t.replace("✓", '<span class="check">✓</span>').replace("✗", '<span class="cross">✗</span>')
        return f"<th>{t}</th>" if is_head else f"<td>{t}</td>"
    h = "".join(cell(c, True) for c in head)
    b = "".join("<tr>" + "".join(cell(c) for c in r) + "</tr>" for r in body)
    return (f'<div class="table-wrap"><table><thead><tr>{h}</tr></thead>'
            f'<tbody>{b}</tbody></table></div>'), i

def parse_list(lines, i, ordered):
    items = []
    pat = re.compile(r'^(\s*)([-]|\d+\.)\s+(.*)')
    while i < len(lines):
        l = lines[i]
        m = pat.match(l)
        if m:
            items.append(m.group(3)); i += 1
        elif l.strip() == "":
            # 列表可能继续，看下一行
            if i+1 < len(lines) and pat.match(lines[i+1]):
                items.append(""); i += 1
            else:
                break
        else:
            break
    lis = "".join(f"<li>{inline(it)}</li>" for it in items if it != "" or True)
    lis = "".join(f"<li>{inline(it)}</li>" for it in items if it.strip() != "")
    tag = "ol" if ordered else "ul"
    return f'<{tag}>{lis}</{tag}>', i

# ----------------------------- 习题 -----------------------------
def parse_exercises(body):
    out = ['<div class="exercises">']
    # 按 **题 分割
    chunks = re.split(r'\n(?=\*\*题\s)', body.strip())
    for ch in chunks:
        ch = ch.strip()
        if not ch.startswith("**题"):
            continue
        out.append(render_exercise(ch))
    out.append("</div>")
    return "\n".join(out)

def render_exercise(ch):
    # 首行题号/类型/标题
    lines = ch.split("\n")
    first = lines[0]
    m = re.match(r'\*\*题\s+([\d.]+)（([^）]*)）\s*(.*?)\*\*\s*(.*)', first)
    if not m:
        return f'<div class="exercise"><p>{inline(first)}</p></div>'
    num, typ, title, rest = m.group(1), m.group(2), m.group(3).rstrip("。。"), m.group(4)
    cls = "calc"
    if "证明" in typ: cls = "prove"
    elif "进阶" in typ: cls = "adv"
    elif any(k in typ for k in ["思考","概念","开放","总结"]): cls = "think"
    # 题干 = rest + 后续到 *答*/*
    body_text = rest + "\n" + "\n".join(lines[1:])
    # 分出答案
    parts = re.split(r'\n(?=\*(?:答|提示|讨论)\*)', body_text)
    stem = parts[0]
    answer = "\n".join(parts[1:]) if len(parts) > 1 else ""
    stem_html = parse_blocks(stem.strip())
    # 题号标题行
    head = (f'<p class="q"><span class="tag {cls}">{typ}</span>'
            f'<strong>题 {num}</strong> '
            f'{inline(title)}</p>')
    stem_html = head + stem_html
    if answer.strip():
        ans_html = parse_blocks(answer.strip())
        fold = (f'<details class="fold"><summary>查看解答 / 提示</summary>'
                f'<div class="fold-body">{ans_html}</div></details>')
    else:
        fold = ""
    return f'<div class="exercise">{stem_html}{fold}</div>'

# ----------------------------- section / 文档 -----------------------------
def split_sections(md):
    """按 ## 二级标题切分。返回 [(title_or_None, body)]。"""
    md = re.sub(r'<!--\s*/?TIKZ:[^>]*-->', '', md)
    lines = md.split("\n")
    secs = []
    cur_title = None
    cur_body = []
    for l in lines:
        m = re.match(r'^##\s+(.*)', l)
        if m:
            secs.append((cur_title, "\n".join(cur_body)))
            cur_title = m.group(1).strip()
            cur_body = []
        else:
            cur_body.append(l)
    secs.append((cur_title, "\n".join(cur_body)))
    return secs

def h2_html(title):
    title = title.replace("⭐", "").strip()
    m = re.match(r'([\d.]+)\s+(.*)', title)
    if m:
        num, rest = m.group(1), m.group(2)
        rest = inline(rest)
        hid = "sec-" + num.replace(".", "-")
        return f'<h2 id="{hid}"><span class="hn">{num}</span>{rest}</h2>', num
    else:
        return f'<h2>{inline(title)}</h2>', None

def render_section(title, body):
    if title is None:
        return parse_blocks(body)
    title_clean = title.replace("⭐", "").strip()
    h2, num = h2_html(title)
    # 注入 H2 组件
    inj = ""
    for kw, comp in INJ_H2.get(CUR["num"], []):
        if kw in title_clean:
            inj += comp
    if "本章小结" in title or title_clean.endswith("本章小结") or "小结" in title and num:
        # 小结卡片
        inner = parse_blocks(body)
        return f'{h2}<div class="summary">{inner}</div>'
    if "习题" in title:
        return h2 + parse_exercises(body)
    return h2 + inj + parse_blocks(body)

def parse_document(md, chapter_num):
    CUR["num"] = chapter_num
    secs = split_sections(md)
    # 第一段（无标题）：含 # 章标题 + 引言
    head_title, head_body = secs[0]
    out = []
    # 提取 # 章标题
    hb = head_body
    cm = re.search(r'^#\s+(.*)', hb, re.M)
    chapter_full = ""
    if cm:
        chapter_full = cm.group(1).strip()
        hb = hb[:cm.start()] + hb[cm.end():]
    out.append(render_chapter_head(chapter_full, hb))
    for title, body in secs[1:]:
        out.append(render_section(title, body))
    return "\n".join(out)

def render_chapter_head(full, body):
    # full 形如 "第 2 章 · 刚体变换：把图形当一块"刚硬的铁板""
    m = re.match(r'第\s*([\d]+)\s*章\s*[·\-—]*\s*(.*)', full)
    if m:
        chnum = m.group(1); subtitle = m.group(2).strip()
    else:
        chnum = ""; subtitle = full
    # 引言块（首个 > 引用作为 lead）
    body = body.strip()
    lead = ""
    rest = body
    # 提取首个连续引用块作 lead
    bm = re.match(r'(>\s.*(?:\n>.*)*)', body, re.M)
    # 简单：按行取首个 > 段
    blines = body.split("\n")
    if blines and blines[0].lstrip().startswith(">"):
        lead_lines = []
        idx = 0
        while idx < len(blines) and blines[idx].lstrip().startswith(">"):
            mm = re.match(r'^\s*>\s?(.*)', blines[idx])
            lead_lines.append(mm.group(1) if mm else ""); idx += 1
        lead = " ".join(lead_lines).strip()
        rest = "\n".join(blines[idx:]).strip()
    lead_html = f'<div class="lead">{inline(lead)}</div>' if lead else ""
    rest_html = parse_blocks(rest) if rest else ""
    return (f'<div class="chapter-head"><div class="eyebrow">'
            f'<span class="pill">第 {chnum} 章</span> 从变换看几何</div>'
            f'<h1>{inline(subtitle)}</h1>{lead_html}</div>\n{rest_html}')

# ----------------------------- 注入的交互组件 -----------------------------
VIZ = {
    "transform_default": '<div class="viz" data-viz="transform-lab" data-title="变换实验台：动手感受平移 / 旋转 / 反射 / 拉伸"></div>',
    "transform_affine":  '<div class="viz" data-viz="transform-lab" data-title="仿射变换实验台：圆→椭圆，正方形→平行四边形" data-presets="identity,stretch,shear,squeeze,rot90,reflx"></div>',
    "mirror":   '<div class="viz" data-viz="mirror"></div>',
    "similarity":'<div class="viz" data-viz="similarity"></div>',
    "cross_ratio":'<div class="viz" data-viz="cross-ratio"></div>',
    "inversion":'<div class="viz" data-viz="inversion"></div>',
    "hierarchy":'<div class="viz" data-viz="hierarchy"></div>',
    "dihedral": '<div class="viz" data-viz="dihedral"></div>',
    "cayley":   '<div class="viz" data-viz="cayley"></div>',
    "bracelet": '<div class="viz" data-viz="bracelet"></div>',
}
INJ_H2 = {
    "01": [("一道小学", VIZ["transform_default"]), ("1872", VIZ["hierarchy"])],
    "02": [("三种基本等距", VIZ["transform_default"]), ("反射生成定理", VIZ["mirror"])],
    "03": [("用复数看清相似", VIZ["similarity"])],
    "04": [("三个经典仿射", VIZ["transform_affine"])],
    "05": [("一维上的故事", VIZ["cross_ratio"])],
    "06": [("什么是反演", VIZ["inversion"])],
    "07": [("几何的层级", VIZ["hierarchy"])],
    "08": [("等边三角形的对称群", VIZ["dihedral"] + VIZ["cayley"]), ("用群计数", VIZ["bracelet"])],
}
INJ_H3 = {}

# ----------------------------- 页面模板 -----------------------------
KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
KATEX_JS  = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
KATEX_AR  = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"

def chapter_nav(idx):
    prev = CHAPTERS[idx-1] if idx > 0 else None
    nxt = CHAPTERS[idx+1] if idx < len(CHAPTERS)-1 else None
    def card(c, label, cls):
        return (f'<a class="{cls}" href="{c["html"]}">'
                f'<span class="nav-label">{label}</span>'
                f'<span class="nav-title">{c["num"]} · {c["short"]}</span></a>')
    parts = ['<div class="chapter-nav">']
    if prev: parts.append(card(prev, "← 上一章", "prev"))
    else: parts.append('<span class="placeholder"></span>')
    if nxt: parts.append(card(nxt, "下一章 →", "next"))
    else: parts.append('<span class="placeholder"></span>')
    parts.append('</div>')
    return "".join(parts)

def build_page(ch, idx, body):
    nav = chapter_nav(idx)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>第 {ch["num"]} 章 · {ch["title"]} — 从变换看几何</title>
<link rel="stylesheet" href="{KATEX_CSS}">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="progress-bar"></div>
<div class="topbar">
  <button class="icon-btn menu-btn" data-act="menu" aria-label="菜单">☰</button>
  <a class="brand" href="index.html">从变换看几何 <small>· 交互式课件</small></a>
  <span class="spacer"></span>
  <span class="crumb"></span>
  <button class="icon-btn" data-act="theme" aria-label="切换主题" title="切换深 / 浅色">◐</button>
</div>
<div class="layout">
  <aside class="sidebar"></aside>
  <main class="content">
{body}
{nav}
  </main>
</div>
<button class="to-top" aria-label="回到顶部">↑</button>
<script src="{KATEX_JS}"></script>
<script src="{KATEX_AR}"></script>
<script src="assets/main.js"></script>
<script src="assets/viz.js"></script>
</body>
</html>
'''

# ----------------------------- 主流程 -----------------------------
def main():
    for idx, ch in enumerate(CHAPTERS):
        md_path = os.path.join(GEO, ch["md"])
        with open(md_path, encoding="utf-8") as f:
            md = f.read()
        body = parse_document(md, ch["num"])
        page = build_page(ch, idx, body)
        out_path = os.path.join(HERE, ch["html"])
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)
        print(f"  ✓ {ch['html']}  ({len(page)} bytes)")

if __name__ == "__main__":
    main()
