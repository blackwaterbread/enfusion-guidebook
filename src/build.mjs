// MDX → HTML → PDF
//   bun src/build.mjs                 # 전체 PDF
//   bun src/build.mjs --html-only     # HTML만
//   bun src/build.mjs --only=ch05,ap-c   # 일부 장만 미리보기 (dist/preview.pdf)
//   bun src/build.mjs --book=<설정 파일>  # 다른 책 (기본 book.config.mjs). 다른 인자와 함께 써도 됨
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileMdx, ROOT } from './mdx.mjs';
import { loadBook, bookArg, imageInfo, PX_PER_MM, BODY_MM, chapterLabel, addCodeBreaks, numberFigures, renderCover, CLAUDE_LOGO } from './book.mjs';

const argv = process.argv.slice(2);
const htmlOnly = argv.includes('--html-only');
const only = argv.find((a) => a.startsWith('--only='))?.slice(7).split(',').filter(Boolean) ?? null;

const { config, docs, figures } = await loadBook(bookArg(argv));
const preview = `dist/preview${config.previewSuffix ?? ''}`;
const htmlPath = path.resolve(ROOT, only ? `${preview}.html` : config.html);
const appendixTitle = config.appendixTitle ?? '레퍼런스와 해답';
const t0 = Date.now();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cssStr = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const included = (d) => !only || only.includes(d.key) || (d.kind === 'answers' && only.includes(d.chapter.key));

// ---------------------------------------------------------------- 1. 컴파일
for (const d of docs) {
  if (!d.file) continue;
  if (!d.exists) {
    if (d.kind !== 'answers') console.warn(`  (원고 없음) ${d.rel}`);
    continue;
  }
  if (!included(d) && d.kind !== 'front') continue;
  Object.assign(d, await compileMdx(d.file, { key: d.key, number: d.number, shift: d.shift }));
}
const ready = (d) => d.html != null;

for (const d of docs) if (ready(d)) d.html = addCodeBreaks(d.html);

// 그림(<Figure>): 번호를 넣고(book.mjs numberFigures), src를 출력 HTML 기준 경로로 바꾸며,
// size="auto"는 그림 폭(1px = 0.2mm, 본문 폭까지)으로 인쇄 폭을 정한다.
numberFigures(docs, figures, {
  url(file) {
    const rel = path.relative(path.dirname(htmlPath), file);
    return path.isAbsolute(rel) ? pathToFileURL(file).href : rel.split(path.sep).map(encodeURIComponent).join('/');
  },
  attrs({ file, size }) {
    if (size !== 'auto') return '';
    const info = imageInfo(file);
    return info ? ` style="width:${Math.min(info.width / PX_PER_MM, BODY_MM)}mm"` : '';
  },
});

// ---------------------------------------------------------------- 2. 문서 조립
const pageRules = [];
const expected = []; // 차례에 쪽 번호를 넣을 제목들 (문서 순서)
const runningHead = (key, text) => {
  pageRules.push(`.page-${key} { page: ${key}; }\n@page ${key} { @top-right { content: ${cssStr(text)}; } }`);
};

function renderChapter(d) {
  const label = chapterLabel(d);
  runningHead(d.key, `${label} · ${d.title}`);
  expected.push({ id: d.key, label: `${label} ${d.title}` });
  for (const h of d.headings) if (h.level <= 2) expected.push({ id: h.id, label: h.label });
  const lead = d.frontmatter.description ? `<p class="chapter-lead">${esc(d.frontmatter.description)}</p>` : '';
  let extra = '';
  if (d.key === docs.find((x) => x.kind === 'appendix' && x.rel.endsWith(config.answersAppendix))?.key) {
    extra = docs
      .filter((a) => a.kind === 'answers' && ready(a))
      .map(
        (a) =>
          `<section class="answers-chapter" id="${a.key}"><h3 class="answers-title"><span class="answers-num">${a.chapter.number}장</span> ${esc(a.chapter.title)}</h3>\n${a.html}\n</section>`,
      )
      .join('\n');
  }
  const mark = d.kind === 'appendix' ? d.letter : String(d.number).padStart(2, '0');
  return `<article class="chapter ${d.kind} page-${d.key}" id="${d.key}">
<header class="chapter-head" data-mark="${mark}">
<h2 class="chapter-title"><span class="chapter-num">${label}</span> <span class="chapter-name">${esc(d.title)}</span></h2>
${lead}
</header>
<div class="chapter-body">
${d.html}
${extra}
</div>
</article>`;
}

function renderPart(p) {
  const chs = p.chapters.filter(ready);
  if (!chs.length) return '';
  const num = p.kind === 'appendix-part' ? '부록' : `${p.index}부`;
  const name = p.kind === 'appendix-part' ? appendixTitle : p.title;
  expected.push({ id: p.key, label: `${num} ${name}` });
  const list = chs
    .map((c) => `<li><span class="pl-num">${chapterLabel(c)}</span><span class="pl-title">${esc(c.title)}</span></li>`)
    .join('');
  return `<section class="part-page page-part" id="${p.key}">
<div class="part-inner">
<h1 class="part-title"><span class="part-num">${num}</span> <span class="part-name">${esc(name)}</span></h1>
<ul class="part-list">${list}</ul>
</div>
</section>`;
}

function renderFront(d) {
  // 차례 앞 글(저자 인사말)은 짧은 글 지면: 머리글·쪽 번호 없이
  if (d.beforeToc) {
    return `<article class="front front-note page-plain" id="${d.key}">
<header class="front-head"><h1 class="front-title">${esc(d.title)}</h1></header>
${d.html}
</article>`;
  }
  runningHead(d.key, d.title);
  expected.push({ id: d.key, label: d.title });
  return `<article class="front page-${d.key}" id="${d.key}">
<header class="front-head"><h1 class="front-title">${esc(d.title)}</h1></header>
${d.html}
</article>`;
}

const preToc = [];
const body = [];
for (const d of docs) {
  if (d.kind === 'front' && ready(d)) (d.beforeToc ? preToc : body).push(renderFront(d));
  else if ((d.kind === 'part' || d.kind === 'appendix-part') && (!only || d.chapters.some((c) => only.includes(c.key)))) body.push(renderPart(d));
  else if ((d.kind === 'chapter' || d.kind === 'appendix') && ready(d)) body.push(renderChapter(d));
}

// 차례
function tocItem(cls, id, inner, children = '') {
  return `<li class="${cls}"><a href="#${id}"><span class="t">${inner}</span><span class="leader"></span><span class="p" data-target="${id}">000</span></a>${children}</li>`;
}
const tocParts = [];
for (const d of docs) {
  if (d.kind === 'front' && ready(d) && !d.beforeToc) tocParts.push(tocItem('toc-front', d.key, esc(d.title)));
  if (d.kind === 'part' || d.kind === 'appendix-part') {
    const chs = d.chapters.filter(ready);
    if (!chs.length) continue;
    const num = d.kind === 'appendix-part' ? '부록' : `${d.index}부`;
    const name = d.kind === 'appendix-part' ? appendixTitle : d.title;
    const chItems = chs
      .map((c) => {
        const secs = c.headings
          .filter((h) => h.level <= 2)
          .map((h) => tocItem('toc-section', h.id, `<span class="n">${esc(h.num ?? '')}</span>${esc(h.text)}`))
          .join('');
        return tocItem('toc-chapter', c.key, `<span class="n">${chapterLabel(c)}</span>${esc(c.title)}`, secs ? `<ul>${secs}</ul>` : '');
      })
      .join('');
    tocParts.push(tocItem('toc-part', d.key, `<span class="n">${num}</span>${esc(name)}`, `<ul>${chItems}</ul>`));
  }
}

const cover = renderCover(config);

// 판권(책 맨 끝 쪽). 발행 이력은 설정 colophon.editions의 순서대로 [{ label, date, note? }]
const editions = config.colophon?.editions ?? [];
const editionList = editions.length
  ? `<dl class="colophon-editions">\n${editions.map((e) => `<dt>${esc(e.label)}</dt><dd>${esc(e.date)}${e.note ? ` · ${esc(e.note)}` : ''}</dd>`).join('\n')}\n</dl>\n`
  : '';
const colophon = `<section class="colophon page-plain">
<div class="colophon-body">
<p class="colophon-title">${esc(config.title)}</p>
<p class="colophon-sub">${esc(config.subtitle)}</p>
${editionList}<dl>
${config.colophon?.basis ? `<dt>기준 버전</dt><dd>${esc(config.colophon.basis)}</dd>\n` : ''}<dt>지은이</dt><dd>${esc(config.author)}</dd>
<dt>도움</dt><dd>Claude Opus 5.5${CLAUDE_LOGO}</dd>
${config.colophon?.sources ? `<dt>근거 자료</dt><dd>${esc(config.colophon.sources)}</dd>\n` : ''}<dt>글꼴</dt><dd>Pretendard, D2Coding (SIL Open Font License 1.1)</dd>
${config.colophon?.license ? `<dt>라이선스</dt><dd>${esc(config.colophon.license)}</dd>\n` : ''}</dl>
${config.colophon?.note ? `<p class="colophon-note">${esc(config.colophon.note)}</p>\n` : ''}</div>
</section>`;

const css = (config.css ?? ['styles/book.css']).map((f) => fs.readFileSync(path.resolve(ROOT, f), 'utf8')).join('\n');
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(config.title)}</title>
<style>
${[
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'SemiBold'],
  [700, 'Bold'],
  [800, 'ExtraBold'],
  [900, 'Black'],
]
  .map(
    ([w, n]) =>
      `@font-face { font-family: 'Pretendard'; src: url('../node_modules/pretendard/dist/web/static/woff2/Pretendard-${n}.woff2') format('woff2'); font-weight: ${w}; font-style: normal; }`,
  )
  .join('\n')}
@font-face { font-family: 'D2Coding'; src: url('../node_modules/d2coding/fonts/d2coding-full.woff2') format('woff2'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'D2Coding'; src: url('../node_modules/d2coding/fonts/d2coding-bold-full.woff2') format('woff2'); font-weight: 700; font-style: normal; }
${css}
/* ---- 장별 머리글 (자동 생성) ---- */
.page-toc { page: toc; }
@page toc { @top-right { content: "차례"; } }
${pageRules.join('\n')}
</style>
</head>
<body>
${cover}
${preToc.join('\n')}
<nav class="toc page-toc" id="toc">
<h1 class="toc-heading">차례</h1>
<ul class="toc-list">${tocParts.join('\n')}</ul>
</nav>
${body.join('\n')}
${colophon}
</body>
</html>`;

fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, html);
console.log(`HTML: ${path.relative(ROOT, htmlPath)} (${(html.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (htmlOnly) process.exit(0);

// ---------------------------------------------------------------- 3. PDF (2단계: 쪽 번호 수집 → 차례 채우기)
const { chromium } = await import('playwright-core');
async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel });
    } catch {}
  }
  throw new Error('Chrome 또는 Edge를 찾지 못했습니다');
}

async function readOutline(buf) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(buf), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const pdf = await task.promise;
  const flat = [];
  async function walk(items) {
    for (const it of items ?? []) {
      const dest = typeof it.dest === 'string' ? await pdf.getDestination(it.dest) : it.dest;
      flat.push({ title: it.title, page: dest ? (await pdf.getPageIndex(dest[0])) + 1 : null });
      await walk(it.items);
    }
  }
  await walk(await pdf.getOutline());
  const pages = pdf.numPages;
  await task.destroy();
  return { flat, pages };
}

const norm = (s) => String(s).replace(/\s+/g, '').normalize('NFC');
function pageMap(flat) {
  const map = {};
  const missing = [];
  let j = 0;
  for (const e of expected) {
    const k = norm(e.label);
    let found = -1;
    for (let t = j; t < flat.length; t++) {
      if (norm(flat[t].title) === k) {
        found = t;
        break;
      }
    }
    if (found < 0) {
      missing.push(e.label);
      continue;
    }
    map[e.id] = flat[found].page;
    j = found + 1;
  }
  return { map, missing };
}

const pdfOptions = { preferCSSPageSize: true, printBackground: true, outline: true, tagged: true };
const browser = await launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  let pdf = await page.pdf(pdfOptions);
  let { flat, pages } = await readOutline(pdf);
  let { map, missing } = pageMap(flat);
  for (let pass = 2; pass <= 3; pass++) {
    await page.evaluate((m) => {
      for (const el of document.querySelectorAll('[data-target]')) el.textContent = m[el.dataset.target] ?? '';
    }, map);
    pdf = await page.pdf(pdfOptions);
    ({ flat, pages } = await readOutline(pdf));
    const next = pageMap(flat);
    const changed = Object.keys(next.map).filter((k) => next.map[k] !== map[k]);
    map = next.map;
    missing = next.missing;
    if (!changed.length) break;
    console.log(`  쪽 번호 ${changed.length}곳 재조정 (pass ${pass})`);
  }
  if (missing.length) console.warn(`  차례 쪽 번호를 찾지 못한 항목 ${missing.length}개: ${missing.slice(0, 5).join(' | ')}`);

  // 후처리: 객체 스트림으로 다시 저장해 크기를 줄이고(태그 구조·책갈피는 그대로), 문서 정보와 보기 설정을 넣는다.
  const { PDFDocument, PDFName } = await import('pdf-lib');
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  doc.setTitle(config.title, { showInWindowTitleBar: true });
  doc.setSubject(config.subtitle);
  doc.setAuthor(config.author);
  if (config.keywords) doc.setKeywords(config.keywords);
  doc.setLanguage('ko');
  doc.setCreator('enfusion-guidebook (MDX → Chromium)');
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
  pdf = await doc.save({ useObjectStreams: true });

  const out = path.resolve(ROOT, only ? `${preview}.pdf` : config.output);
  fs.writeFileSync(out, pdf);
  console.log(`PDF: ${path.relative(ROOT, out)} — ${pages}쪽, ${(pdf.length / 1024 / 1024).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} finally {
  await browser.close();
}
