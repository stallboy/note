# Skill：Markdown 转 PDF（Markdown Preview Enhanced 渲染）

将一组 Markdown 文件合并为一份完整 PDF，包含封面、目录、图片（含 width 属性）、标准 PDF 书签大纲。使用 Markdown Preview Enhanced 引擎渲染，确保 MPE 扩展语法正确处理。

## 技术栈

| 依赖 | 用途 |
|------|------|
| `@shd101wyy/mume` | MPE 核心引擎，MD → HTML 转换 |
| `puppeteer` | Chrome 无头浏览器，HTML → PDF 渲染 |
| `pdf-lib` | PDF 后处理，添加书签大纲和元数据 |

## 完整流程

### 1. 安装依赖

```bash
npm init -y
# package.json 需设置 "type": "module"
npm install @shd101wyy/mume puppeteer pdf-lib
```

### 2. MPE 渲染 Markdown → HTML

```javascript
import * as mume from '@shd101wyy/mume';

await mume.init();

const engine = new mume.MarkdownEngine({
  filePath: tempMdFile,           // 必须是一个实际存在的文件路径
  projectDirectoryPath: projectRoot, // 项目根目录
  config: {
    usePandocParser: false,
    breakOnSingleNewLine: true,
    enableTypographer: true,
  },
});

const { html } = await engine.parseMD(markdownContent, {
  useRelativeFilePath: true,
  isForPreview: false,
  hideFrontMatter: true,
});
```

### 3. 后处理 HTML

#### 3a. 处理 `{: width="300px"}` 属性语法

**问题**：mume 的 `parseMD` 不处理 MPE 属性语法，原样输出 `{: width="300px"}` 文本。

```javascript
html = html.replace(
  /(<img\s[^>]*?)(\/?>)\{:\s*width="([^"]+)"\s*\}/g,
  '$1 width="$3"$2'
);
// 清理其他残留的 {: ...} 标记
html = html.replace(/\{:\s*[^}]+\}/g, '');
```

#### 3b. 章节锚点和分页

```javascript
chapters.forEach((ch, i) => {
  const anchor = `chapter-${i}`;
  // 正则匹配 h1 标题，插入锚点和分页
  html = html.replace(h1Pattern, (match, attrs) => {
    if (i === 0) return `<a id="${anchor}"></a><h1${attrs}>${ch.title}</h1>`;
    return `<div class="page-break"></div><a id="${anchor}"></a><h1${attrs}>${ch.title}</h1>`;
  });
});
```

#### 3c. 封面和目录

手动生成 HTML 封面页和目录页，用 CSS `page-break-after: always` 独占页面。

### 4. Puppeteer 渲染 PDF

#### ⚠️ 关键：图片加载方式

**必须**使用临时 HTML 文件 + `file://` 协议，否则本地图片无法加载：

```javascript
const tempHtml = path.join(projectRoot, '_temp.html');
fs.writeFileSync(tempHtml, fullHtml, 'utf-8');
await page.goto(`file://${tempHtml}`, { waitUntil: 'networkidle0' });
```

**不要**使用 `page.setContent()`，它无法加载本地图片资源。

#### 输出到 buffer（后续用 pdf-lib 后处理）

```javascript
const pdfBuffer = await page.pdf({
  format: 'A4',
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  printBackground: true,
  displayHeaderFooter: false,
});
```

### 5. pdf-lib 添加书签和元数据

#### ⚠️ 关键：中文书签编码

**必须**使用 UTF-16BE 编码的十六进制字符串，`PDFString.of()` 只支持 ASCII/PDFDocEncoding，中文会乱码：

```javascript
import { PDFHexString } from 'pdf-lib';

function toUnicodePdfString(text) {
  const bytes = [0xfe, 0xff]; // UTF-16BE BOM
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes.push((code >> 8) & 0xff);
    bytes.push(code & 0xff);
  }
  const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  return PDFHexString.of(hex);
}
```

#### 构建书签大纲树

```javascript
function addPdfOutlines(pdfDoc, items) {
  const context = pdfDoc.context;
  const itemRefs = items.map(() => context.nextRef());
  const rootRef = context.nextRef();

  items.forEach((item, i) => {
    const page = pdfDoc.getPage(item.pageIndex);

    // 跳转目标：[页引用, /XYZ, null, Y坐标, null]
    const destArray = PDFArray.withContext(context);
    destArray.push(page.ref);
    destArray.push(PDFName.of('XYZ'));
    destArray.push(PDFNull);
    destArray.push(PDFNumber.of(page.getHeight() - topMarginPt));
    destArray.push(PDFNull);

    const itemDict = PDFDict.withContext(context);
    itemDict.set(PDFName.of('Title'), toUnicodePdfString(item.title));
    itemDict.set(PDFName.of('Parent'), rootRef);
    itemDict.set(PDFName.of('Dest'), destArray);
    if (i > 0) itemDict.set(PDFName.of('Prev'), itemRefs[i - 1]);
    if (i < items.length - 1) itemDict.set(PDFName.of('Next'), itemRefs[i + 1]);

    context.assign(itemRefs[i], itemDict);
  });

  // 大纲根节点
  const rootDict = PDFDict.withContext(context);
  rootDict.set(PDFName.of('Type'), PDFName.of('Outlines'));
  rootDict.set(PDFName.of('First'), itemRefs[0]);
  rootDict.set(PDFName.of('Last'), itemRefs[items.length - 1]);
  rootDict.set(PDFName.of('Count'), PDFNumber.of(items.length));
  context.assign(rootRef, rootDict);

  // 挂载到文档目录
  pdfDoc.catalog.set(PDFName.of('Outlines'), rootRef);
  pdfDoc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}
```

#### 修正 PDF 元数据

```javascript
pdfDoc.setTitle('文档标题');
pdfDoc.setAuthor('作者');
```

### 6. 计算章节页码

通过 Puppeteer 获取锚点 Y 坐标，结合文档高度和总页数推算：

```javascript
const chapterYPositions = await page.evaluate((anchors) => {
  return anchors.map(anchor => {
    const el = document.getElementById(anchor);
    if (el) return el.getBoundingClientRect().top + window.scrollY;
    return -1;
  });
}, anchorList);

const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
// ... page.pdf() 后获取 totalPages ...
const pixelsPerPage = docHeight / totalPages;
const pageIndex = Math.floor(y / pixelsPerPage);
```

## 坑点汇总

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `engine.generateHTML is not a function` | mume API 方法名是 `parseMD` 不是 `generateHTML` | 使用 `engine.parseMD(md, options)` |
| 构造函数报错 | 缺少 `projectDirectoryPath` 参数 | 必须传入项目根目录 |
| `{: width="300px"}` 未生效 | mume 的 `parseMD` 不处理属性语法 | 正则后处理，将属性移入 `<img>` 标签 |
| 并排图片变成上下排列 | CSS 设置了 `img { display: block }` | 只对 `p > img:only-child` 设 block，多图保持 inline |
| PDF 标题显示 `_temp.html` | Puppeteer 用 `file://temp.html` 加载，HTML 缺少 `<title>` | 添加 `<title>` 标签 + pdf-lib `setTitle()` |
| 中文书签乱码 | `PDFString.of()` 不支持 Unicode | 用 `PDFHexString` + UTF-16BE 编码 |
| 本地图片不显示 | `page.setContent()` 无 baseURL | 写临时 HTML 文件，用 `page.goto('file://...')` |
| Puppeteer 找不到 Chrome | 自带 Chrome 未下载 | 指定 `executablePath` 指向系统 Chrome |
| PDF 文件被锁 EBUSY | PDF 阅读器占用了文件 | 先关闭阅读器，或输出到新文件名 |
| package.json 中文目录名 | npm init 不支持中文目录 | 手动创建 `package.json`，设置 `"name"` 为英文 |
