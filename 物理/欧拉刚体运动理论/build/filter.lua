-- 欧拉《刚体运动理论》 md → LaTeX 过滤器
-- 职责：章标题改排、英文副题作章铭、批注→边栏 pnote、选编说明框、
--       插图→通栏/正文栏图（图题图下居中）、内部链接→\hyperref、删章末导航与分隔线。
-- 约定：本过滤器按“每个 md 文件一次 pandoc 调用”运行，工作目录为书籍根目录。

local stringify = pandoc.utils.stringify

-- 本地 LaTeX 转义（pandoc.utils.escape_latex 在 3.1.10 不可用）
-- 图题/标题中的 Unicode 上下标 → \textsubscript / \textsuperscript
-- （Lua 字符类按字节解释，须显式按 utf8 码点遍历）
local SUB = { [0x2080]='0',[0x2081]='1',[0x2082]='2',[0x2083]='3',[0x2084]='4',
  [0x2085]='5',[0x2086]='6',[0x2087]='7',[0x2088]='8',[0x2089]='9',
  [0x1D63]='r',[0x209C]='t',[0x2099]='n',[0x2098]='m',[0x2096]='k',
  [0x1D62]='i',[0x209A]='p',[0x209B]='s',[0x1D65]='v',[0x2093]='x' }
local SUP = { [0x2070]='0',[0x00B9]='1',[0x00B2]='2',[0x00B3]='3',[0x2074]='4',
  [0x2075]='5',[0x2076]='6',[0x2077]='7',[0x2078]='8',[0x2079]='9',
  [0x207F]='n',[0x2071]='i' }
local function map_subsup(s)
  local out = {}
  for _, cp in utf8.codes(s) do
    if SUB[cp] then out[#out + 1] = '\\textsubscript{' .. SUB[cp] .. '}'
    elseif SUP[cp] then out[#out + 1] = '\\textsuperscript{' .. SUP[cp] .. '}'
    else out[#out + 1] = utf8.char(cp) end
  end
  return table.concat(out)
end
local function esc_latex(s)
  -- 先转义原字符，再注入上下标宏（否则宏里的反斜杠会被二次转义）
  s = (s:gsub('[\\&%$#_{}^~]', {
    ['\\'] = '\\textbackslash{}', ['&'] = '\\&', ['%'] = '\\%',
    ['$'] = '\\$', ['#'] = '\\#', ['_'] = '\\_',
    ['{'] = '\\{', ['}'] = '\\}', ['^'] = '\\textasciicircum{}',
    ['~'] = '\\textasciitilde{}',
  }))
  return map_subsup(s)
end

-- 块级内容 → LaTeX 字符串（用于拼进宏参数；pandoc 输出的括号天然配平）
local function tex(blocks)
  local s = pandoc.write(pandoc.Pandoc(blocks), 'latex')
  return (s:gsub('%s+$', ''))
end

-- 链接目标 → 本册内部 label（Lua pattern 无交替语法，逐前缀尝试）
local PARTS = { '引言', '正文', '附录' }
local PART_ASCII = { ['引言'] = 'intro', ['正文'] = 'body', ['附录'] = 'appx' }
local function label_for(target)
  local base = target:gsub('#.*$', ''):gsub('%.[^%/%.]*$', '')
  for _, p in ipairs(PARTS) do
    local num = base:match('_' .. p .. '_第(%d+)章$')
    if num then return ('ch:' .. PART_ASCII[p] .. '-' .. num) end
  end
  if base:match('_00_总览$') then return 'ch:overview' end
  return nil
end

-- 读取 SVG 根元素宽度，决定通栏还是正文栏
local function svg_root_width(src)
  local ok, f = pcall(io.open, src, 'r')
  if not ok or not f then return 0 end
  local head = f:read('l') or ''   -- 根 <svg ...> 在首行
  f:close()
  return tonumber(head:match('width="(%d+)"')) or 0
end

-- ---------- 内联遍历：链接改写 ----------
local link_filter = {
  Link = function(l)
    local target = l.target
    if target:match('^https?://') then return nil end          -- 外链交给 pandoc
    local lab = label_for(target)
    if lab then                                                 -- 本册章节跳转
      local text = tex({pandoc.Plain(l.content)})
      return pandoc.RawInline('latex', '\\hyperref[' .. lab .. ']{' .. text .. '}')
    end
    -- 本地文件（english_translation 等）→ 纯文本路径，不留死链
    return pandoc.RawInline('latex',
      '\\allowbreak\\texttt{' .. esc_latex(target) .. '}')
  end
}

local function map_inlines(block)
  return pandoc.walk_block(block, link_filter)
end

-- 判断段落是否只由 上一章/下一章 链接构成（章末导航行，合册中删除）
local function is_nav_link_text(t)
  return t:sub(1, 9) == '上一章' or t:sub(1, 9) == '下一章'
end
local function is_nav_para(para)
  local nav = false
  for _, il in ipairs(para.content) do
    if il.t == 'Link' then
      if is_nav_link_text(stringify(il)) then nav = true end
    elseif il.t ~= 'Space' and il.t ~= 'SoftBreak' and il.t ~= 'LineBreak' then
      return false
    end
  end
  return nav
end

-- 整段是否全为斜体（H1 后的英文原章题）
local function is_all_emph(para)
  if #para.content == 0 or para.content[1].t ~= 'Emph' then return false end
  for _, il in ipairs(para.content) do
    if il.t ~= 'Emph' and il.t ~= 'Space' and il.t ~= 'SoftBreak' then
      return false
    end
  end
  return true
end

-- ---------- 单块处理：返回 Blocks 列表 ----------
local function process_block(b, ctx)
  if b.t == 'Para' then
    if is_nav_para(b) then return {} end

    -- 单图段落 → 图
    if #b.content == 1 and b.content[1].t == 'Image' then
      local img = b.content[1]
      local cap = stringify(img.caption)
      if cap == '' then cap = img.title or '' end
      local name = img.src:match('images/([^%/]+)%.svg$')
      if name then
        local w = svg_root_width(img.src)
        local macro = (w >= 800) and 'figwide' or 'fignorm'
        local cap_tex = esc_latex(cap)
        return { pandoc.RawBlock('latex',
          '\\' .. macro .. '{figpdf/' .. name .. '.pdf}{' .. cap_tex .. '}') }
      end
    end

    -- H1 后首段全斜体 → 章铭
    if ctx.after_h1 and is_all_emph(b) then
      ctx.after_h1 = false
      return { pandoc.RawBlock('latex',
        '\\eulerepigraph{' .. esc_latex(stringify(b)) .. '}') }
    end
    ctx.after_h1 = false
    return { map_inlines(b) }
  end

  if b.t == 'Header' then
    local text = stringify(b.content)
    if b.level == 1 then
      ctx.after_h1 = true
      ctx.secn = 0
      local part, num, title
      for _, p in ipairs(PARTS) do
        local n, t = text:match('^' .. p .. '第(%d+)章：(.+)$')
        if n then part, num, title = p, n, t break end
      end
      if part then
        ctx.label = ('ch:' .. PART_ASCII[part] .. '-' .. num)
        return { pandoc.RawBlock('latex',
          string.format('\\eulerchapter{%s}{%s}{%s}{%s}', part, num,
            esc_latex(title), ctx.label)) }
      end
      ctx.label = 'ch:overview'
      return { pandoc.RawBlock('latex',
        '\\eulerfrontchapter{' .. esc_latex(text) .. '}{ch:overview}') }
    elseif b.level == 2 then
      ctx.secn = ctx.secn + 1
      local anchor = (ctx.label or 'x') .. '-' .. ctx.secn
      return { pandoc.RawBlock('latex',
        string.format('\\esection{%s}{%s}', esc_latex(text), anchor)) }
    elseif b.level == 3 then
      return { pandoc.RawBlock('latex',
        '\\esubsection{' .. esc_latex(text) .. '}') }
    end
    return { map_inlines(b) }
  end

  if b.t == 'HorizontalRule' then return {} end

  if b.t == 'BlockQuote' then
    local first = b.content[1]
    if first and first.t == 'Para' and first.content[1]
       and first.content[1].t == 'Strong' then
      local label = stringify(first.content[1])
      -- 批注及其变体（如“批注：现代核对。”）→ 边栏；选编说明 → 章前框
      local is_pnote = label == '批注' or label:match('^批注[：:]')
      if is_pnote or label == '选编说明' then
        -- 去掉开头 Strong 标签与紧随其后的冒号
        local rest = {}
        for i = 2, #first.content do rest[#rest + 1] = first.content[i] end
        if rest[1] and rest[1].t == 'Str' then
          local t = rest[1].text
          -- 全角/半角冒号整字剥离（不可用字符类：按字节只删一字节会产生孤儿字节）
          t = t:gsub('^：', ''):gsub('^:', '')
          if t == '' then table.remove(rest, 1)
          else rest[1] = pandoc.Str(t) end
        end
        local blocks = { pandoc.Para(rest) }
        for i = 2, #b.content do blocks[#blocks + 1] = b.content[i] end
        local body = tex(blocks):gsub('\n\n+', ' ')   -- 边栏宏参数不分行
        if is_pnote then
          -- 边栏是窄栏小字：行间公式降为行内，参数内不留 \\[ \\]
          body = body:gsub('\\%[%s*(.-)%s*\\%]', function(m)
            return '\\(' .. m .. '\\)' end)
          -- 变体标签（“现代核对”等）保留在边栏标签位
          local tag = label:match('^批注[：:](.+)$')
          local tag_tex = tag and ('[' .. esc_latex(tag:gsub('。$', '')) .. ']') or ''
          return { pandoc.RawBlock('latex',
            '\\pnote' .. tag_tex .. '{' .. body .. '}') }
        else
          return { pandoc.RawBlock('latex',
            '\\begin{xuanbian}' .. body .. '\\end{xuanbian}') }
        end
      end
    end
    return { map_inlines(b) }
  end

  return { map_inlines(b) }
end

-- ---------- 总控 ----------
function Pandoc(doc)
  local ctx = { label = nil, secn = 0, after_h1 = false }
  local out = pandoc.List()
  local skipping = false   -- 总览“分章阅读导航”与目录重复，整节删去
  for _, b in ipairs(doc.blocks) do
    if skipping then
      if b.t == 'Header' and b.level == 2 then skipping = false else b = nil end
    elseif b.t == 'Header' and b.level == 2
           and stringify(b.content):match('^分章阅读导航') then
      skipping = true
      b = nil
    end
    if b then out:extend(process_block(b, ctx)) end
  end
  return pandoc.Pandoc(out, doc.meta)
end
