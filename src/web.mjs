// MDX → 웹판(정적 사이트) dist/web/. PDF(build.mjs)와 같은 원고·컴포넌트·제목 번호·그림 번호를 쓰고, 화면용 틀만 다르다.
//   bun src/web.mjs                     # 두 책 + 첫 화면 + 검색 색인(Pagefind)
//   bun src/web.mjs --book=<설정 파일>   # 그 책만 다시 만든다(첫 화면과 검색 색인도 다시 만듦)
//   bun src/web.mjs --serve[=포트]       # dist/web를 로컬 서버로 연다(기본 4173, 빌드하지 않음)
import fs from 'node:fs';
import path from 'node:path';
import { compileMdx, ROOT } from './mdx.mjs';
import { loadBook, bookArg, imageInfo, unescapeAttr, chapterLabel, addCodeBreaks, numberFigures, renderCover, pad, CLAUDE_LOGO } from './book.mjs';

const OUT = path.join(ROOT, 'dist', 'web');
const SITE_TITLE = 'Enfusion 가이드북';
const SITE_URL = 'https://blackwaterbread.github.io/enfusion-guidebook/'; // GitHub Pages(.github/workflows/pages.yml). 첫 화면의 canonical·og:url
const THEMES = { light: 'github-light', dark: 'github-dark' };
// 웹판에 싣는 책. slug는 dist/web 아래 폴더 이름이자 web.css 배색(data-book)
const BOOKS = [
  { slug: 'script', config: path.join(ROOT, 'book.config.mjs') },
  { slug: 'workbench', config: path.join(ROOT, 'guide', 'book.config.mjs') },
];

const argv = process.argv.slice(2);

// ---------------------------------------------------------------- 로컬 서버
function serve(port) {
  if (!fs.existsSync(OUT)) throw new Error('dist/web가 없습니다. 먼저 bun run build:web');
  Bun.serve({
    port,
    fetch(req) {
      const { pathname } = new URL(req.url);
      let file = path.join(OUT, decodeURIComponent(pathname));
      if (file !== OUT && !file.startsWith(OUT + path.sep)) return new Response('Forbidden', { status: 403 });
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        if (!pathname.endsWith('/')) return Response.redirect(`${pathname}/`, 301);
        file = path.join(file, 'index.html');
      }
      if (!fs.existsSync(file)) return new Response('404 Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      return new Response(Bun.file(file));
    },
  });
  console.log(`웹판: http://localhost:${port}/  (Ctrl+C로 끝냄)`);
}

// ---------------------------------------------------------------- 공용
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const encPath = (p) => p.split(/[\\/]/).map(encodeURIComponent).join('/');
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const ICON = {
  menu: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  search: '<svg class="i-search" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  moon: '<svg class="i-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  sun: '<svg class="i-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230f1418'/%3E%3Crect width='4' height='32' fill='%23c2410c'/%3E%3Cpath d='M11 9h11M11 16h8M11 23h11M11 9v14' stroke='%23fff' stroke-width='3' fill='none'/%3E%3C/svg%3E";

// 테마(어두운 화면) 초기값: 저장한 선택이 있으면 그리기 전에 적용한다
const THEME_INIT = `<script>try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script>`;

function head({ root, title, description, book, extra = '' }) {
  return `<!doctype html>
<html lang="ko"${book ? ` data-book="${book}"` : ''} data-root="${root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">\n` : ''}<meta name="color-scheme" content="light dark">
<link rel="icon" href="${FAVICON}">
${extra}<link rel="stylesheet" href="${root}assets/fonts.css">
<link rel="stylesheet" href="${root}assets/site.css">
${THEME_INIT}
<script src="${root}assets/site.js" defer></script>
</head>`;
}

function topbar({ root, book, pdf }) {
  return `<header class="topbar">
${book ? `<button class="icon-btn menu-btn" type="button" aria-label="차례 열기" aria-controls="sidebar" aria-expanded="false">${ICON.menu}</button>\n` : ''}<div class="brand">
<a class="brand-site" href="${root}index.html">${SITE_TITLE}</a>${book ? `<span class="brand-sep" aria-hidden="true">/</span><a class="brand-book" href="index.html">${esc(book.title)}</a>` : ''}
</div>
<div class="top-actions">
<div class="search" role="search">
${ICON.search}<input type="search" placeholder="두 책에서 검색" aria-label="두 책에서 검색" autocomplete="off" spellcheck="false"><kbd class="search-key" aria-hidden="true">/</kbd>
<div class="search-panel" hidden></div>
</div>
<button class="icon-btn search-btn" type="button" aria-label="검색 열기">${ICON.search}</button>
${pdf ? `<a class="top-pdf" href="${pdf.href}" download title="PDF 내려받기 (${pdf.size})">${ICON.download}<span>PDF</span></a>\n` : ''}<button class="icon-btn theme-btn" type="button" aria-label="어두운 화면으로 바꾸기">${ICON.moon}${ICON.sun}</button>
</div>
</header>`;
}

/**
 * 표지: PDF와 같은 마크업(renderCover)과 같은 스타일(설정 css = book.css, guide.css)을 책 폴더의 cover.html에 두고
 * iframe으로 210×297mm 그대로 그린 뒤 화면 폭에 맞게 줄인다(site.js가 --s를 정함). iframe이라 표지 규칙이 쪽에 새지 않는다.
 * 설정 css와 그 안의 상대 url(guide-cover.svg 등)은 저장소와 같은 경로(dist/web/styles/…)에 복사해 그대로 풀리게 한다.
 */
function writeCover(slug, config) {
  const css = config.css ?? ['styles/book.css'];
  for (const f of css) {
    const src = path.resolve(ROOT, f);
    copy(src, path.join(OUT, f));
    for (const m of fs.readFileSync(src, 'utf8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (/^(data:|https?:|#)/.test(m[1])) continue;
      const asset = path.resolve(path.dirname(src), m[1]);
      if (fs.existsSync(asset)) copy(asset, path.join(OUT, path.relative(ROOT, asset)));
      else console.warn(`  표지 스타일의 파일 없음: ${f} → ${m[1]}`);
    }
  }
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(config.title)} 표지</title>
<link rel="stylesheet" href="../assets/fonts.css">
${css.map((f) => `<link rel="stylesheet" href="../${f}">`).join('\n')}
<style>html, body { margin: 0; overflow: hidden; }</style>
</head>
<body>
${renderCover(config)}
</body>
</html>
`;
  fs.mkdirSync(path.join(OUT, slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, slug, 'cover.html'), html);
}

/** 표지 iframe 틀. href가 있으면 표지 전체가 그 링크(첫 화면). */
function coverFrame(slug, config, { root, href }) {
  const frame = `<div class="cover-frame"><iframe src="${root}${slug}/cover.html" title="${esc(config.title)} 표지"${href ? ' tabindex="-1" aria-hidden="true"' : ''}></iframe></div>`;
  return href ? `<a class="cover-link" href="${href}" aria-label="${esc(config.title)} 읽기">${frame}</a>` : frame;
}

async function pdfInfo(b, config) {
  const src = path.resolve(ROOT, config.output);
  if (!fs.existsSync(src)) return null;
  const buf = fs.readFileSync(src);
  let pages = null;
  try {
    const { PDFDocument } = await import('pdf-lib');
    pages = (await PDFDocument.load(buf, { updateMetadata: false })).getPageCount();
  } catch {}
  const name = path.basename(src);
  return { src, name, bytes: buf.length, size: mb(buf.length), pages, href: encodeURIComponent(name) };
}

// ---------------------------------------------------------------- 빌드
async function build() {
  const t0 = Date.now();
  const chosen = bookArg(argv);
  const targets = chosen ? BOOKS.filter((b) => path.resolve(b.config) === chosen) : BOOKS;
  if (chosen && !targets.length) throw new Error(`웹판 목록(src/web.mjs BOOKS)에 없는 설정입니다: ${chosen}`);
  if (!chosen) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  writeAssets();

  const metas = [];
  for (const b of BOOKS) {
    const { config } = await loadBook(b.config);
    metas.push({ ...b, configFile: b.config, config, pdf: await pdfInfo(b, config) });
  }
  // 표지는 첫 화면에도 쓰므로 한 책만 다시 만들 때도 두 책 모두 쓴다(buildBook이 책 폴더를 지우므로 그 뒤에)
  const broken = [];
  const stats = [];
  for (const b of targets) stats.push(await buildBook(metas.find((m) => m.slug === b.slug), broken));
  for (const m of metas) writeCover(m.slug, m.config);
  writeLanding(metas);

  for (const s of stats) console.log(`  ${s.slug}/: 쪽 ${s.pages}개, 그림 ${s.figures}개${s.pdf ? `, PDF ${s.pdf}` : ', PDF 없음(dist/에서 찾지 못함)'}`);
  if (broken.length) {
    console.warn(`  찾지 못한 내부 링크 ${broken.length}개:`);
    for (const x of broken.slice(0, 20)) console.warn(`    ${x}`);
  }

  const indexed = await writeSearchIndex();

  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        files += 1;
        bytes += fs.statSync(p).size;
      }
    }
  };
  walk(OUT);
  console.log(`웹판: ${path.relative(ROOT, OUT)} — 파일 ${files}개, ${mb(bytes)}, 검색 색인 ${indexed}쪽, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (broken.length) process.exitCode = 1;
}

// 검색 색인(Pagefind). 본문(data-pagefind-body)만 색인하고, 쪽 HTML은 그대로 둔 채 색인용 사본에서만
// 코드 낱말 사이에 공백을 넣는다(`GetGame().GetCallqueue()`가 한 낱말로 묶이면 GetCallqueue로 찾을 수 없음).
async function writeSearchIndex() {
  const pagefind = await import('pagefind');
  const { index, errors } = await pagefind.createIndex({});
  if (errors.length) throw new Error(errors.join('\n'));
  const forIndex = (html) => html.replace(/<wbr>/g, ' ').replace(/<pre\b[\s\S]*?<\/pre>/g, (pre) => pre.replace(/<\/span><span/g, '</span> <span'));
  let count = 0;
  const walk = async (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'pagefind') await walk(p);
      } else if (e.name.endsWith('.html')) {
        const html = fs.readFileSync(p, 'utf8');
        if (!html.includes('data-pagefind-body')) continue;
        const url = `/${path.relative(OUT, p).split(path.sep).map(encodeURIComponent).join('/')}`;
        const r = await index.addHTMLFile({ url, content: forIndex(html) });
        if (r.errors.length) console.warn(`  색인 오류 ${url}: ${r.errors.join(' ')}`);
        else count += 1;
      }
    }
  };
  await walk(OUT);
  const written = await index.writeFiles({ outputPath: path.join(OUT, 'pagefind') });
  if (written.errors.length) console.warn(written.errors.join('\n'));
  await pagefind.close();
  return count;
}

// 글꼴(Pretendard 동적 서브셋 400–900, D2Coding), site.css, site.js, 표지 그림
function writeAssets() {
  const assets = path.join(OUT, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  const pdir = path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'web', 'static');
  const css = fs.readFileSync(path.join(pdir, 'pretendard-dynamic-subset.css'), 'utf8');
  const header = css.slice(0, css.indexOf('*/') + 2);
  const weights = new Set(['400', '500', '600', '700', '800', '900']);
  const rules = [];
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g)) {
    const weight = /font-weight:\s*(\d+)/.exec(block)[1];
    if (!weights.has(weight)) continue;
    const file = /url\(\.\/woff2-dynamic-subset\/([^)]+)\)/.exec(block)[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)[1];
    copy(path.join(pdir, 'woff2-dynamic-subset', file), path.join(assets, 'fonts', 'pretendard', file));
    rules.push(`@font-face{font-family:'Pretendard';font-style:normal;font-display:swap;font-weight:${weight};src:url(fonts/pretendard/${file}) format('woff2');unicode-range:${range}}`);
  }
  const d2 = path.join(ROOT, 'node_modules', 'd2coding', 'fonts');
  copy(path.join(d2, 'd2coding-full.woff2'), path.join(assets, 'fonts', 'd2coding-full.woff2'));
  copy(path.join(d2, 'd2coding-bold-full.woff2'), path.join(assets, 'fonts', 'd2coding-bold-full.woff2'));
  // OFL 1.1은 글꼴을 함께 배포할 때 저작권 표기와 라이선스 원문을 같이 두도록 한다(licenses/에 공식 저장소의 원문)
  copy(path.join(ROOT, 'licenses', 'OFL-Pretendard.txt'), path.join(assets, 'fonts', 'OFL-Pretendard.txt'));
  copy(path.join(ROOT, 'licenses', 'OFL-D2Coding.txt'), path.join(assets, 'fonts', 'OFL-D2Coding.txt'));
  rules.push(
    "@font-face{font-family:'D2Coding';font-style:normal;font-display:swap;font-weight:400;src:url(fonts/d2coding-full.woff2) format('woff2')}",
    "@font-face{font-family:'D2Coding';font-style:normal;font-display:swap;font-weight:700;src:url(fonts/d2coding-bold-full.woff2) format('woff2')}",
  );
  fs.writeFileSync(path.join(assets, 'fonts.css'), `${header}\n/* D2Coding: Copyright (c) NAVER Corp., SIL Open Font License 1.1 */\n${rules.join('\n')}\n`);
  copy(path.join(ROOT, 'styles', 'web.css'), path.join(assets, 'site.css'));
  copy(path.join(ROOT, 'src', 'web-client.js'), path.join(assets, 'site.js'));
}

// ---------------------------------------------------------------- 책 한 권
async function buildBook(meta, broken) {
  const { slug, config, pdf } = meta;
  const { docs, figures } = await loadBook(meta.configFile);
  const dir = path.join(OUT, slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const appendixTitle = config.appendixTitle ?? '레퍼런스와 해답';

  // 1. 컴파일: 웹판은 장 제목이 h1이므로 ## → h2(shift 0), 코드는 밝은·어두운 두 테마
  for (const d of docs) {
    if (!d.file) continue;
    if (!d.exists) {
      if (d.kind !== 'answers') console.warn(`  (원고 없음) ${d.rel}`);
      continue;
    }
    Object.assign(d, await compileMdx(d.file, { key: d.key, number: d.number, shift: 0, themes: THEMES }));
  }
  const ready = (d) => d.html != null;
  for (const d of docs) if (ready(d)) d.html = addCodeBreaks(d.html);

  // 2. 그림: 번호는 PDF와 같은 함수(numberFigures). 화면에서는 size="auto"를 그림의 픽셀 폭(본문 폭까지)으로 보인다
  const usedFigs = new Set();
  numberFigures(docs, figures, {
    url: (file) => `figures/${encPath(path.relative(figures, file))}`,
    attrs({ file, size }) {
      usedFigs.add(file);
      if (size !== 'auto') return '';
      const info = imageInfo(file);
      return info ? ` style="width:${info.width}px"` : '';
    },
  });
  for (const f of usedFigs) copy(f, path.join(dir, 'figures', path.relative(figures, f)));

  // 3. 쪽 목록(PDF와 같은 문서 순서). 부 표지는 쪽을 만들지 않고 차례의 묶음 이름으로만 쓴다
  const pages = docs.filter((d) => ready(d) && ['front', 'chapter', 'appendix', 'answers'].includes(d.kind));
  const answersDoc = docs.find((d) => d.kind === 'appendix' && config.answersAppendix && d.rel.endsWith(config.answersAppendix));
  const answerPages = pages.filter((d) => d.kind === 'answers');
  for (const d of pages) {
    d.page = d.kind === 'answers' ? `answers-ch${pad(d.chapter.number)}.html` : `${path.basename(d.file, '.mdx')}.html`;
    d.nav = d.kind === 'front' ? { n: '', t: d.title } : d.kind === 'answers' ? { n: `${d.chapter.number}장 해답`, t: d.chapter.title } : { n: chapterLabel(d), t: d.title };
  }
  const groups = docs.filter((d) => (d.kind === 'part' || d.kind === 'appendix-part') && d.chapters.some(ready));
  const groupName = (g) => (g.kind === 'appendix-part' ? { n: '부록', t: appendixTitle } : { n: `${g.index}부`, t: g.title });

  // 4. 본문 다듬기: 코드 상자, 표 가로 스크롤, 제목 링크, 그림 크기, 검색 제외 표시
  for (const d of pages) d.body = webify(d.html, figures);

  // 5. 쪽 본문(article)
  const bookMeta = `data-pagefind-body data-pagefind-meta="book:${esc(config.title)}"`;
  for (const d of pages) {
    if (d.kind === 'front') {
      d.article = `<article class="doc front${d.beforeToc ? ' front-note' : ''}" id="${d.key}" ${bookMeta}>
<header class="front-head"><h1 class="front-title">${esc(d.title)}</h1></header>
<div class="front-body">
${d.body}
</div>
</article>`;
      continue;
    }
    const isAns = d.kind === 'answers';
    const label = isAns ? '연습문제 해답' : chapterLabel(d);
    const name = isAns ? `${d.chapter.number}장 ${d.chapter.title}` : d.title;
    const mark = d.kind === 'appendix' ? d.letter : d.kind === 'chapter' ? pad(d.number) : '';
    const lead = !isAns && d.frontmatter.description ? `<p class="chapter-lead">${esc(d.frontmatter.description)}</p>\n` : '';
    let extra = '';
    if (d === answersDoc && answerPages.length) {
      extra = `\n<section class="answers-index"><h2 id="${d.key}-answers">장별 해답</h2>
<ul>${answerPages.map((a) => `<li><a href="#${a.key}"><span class="n">${a.chapter.number}장</span><span class="t">${esc(a.chapter.title)}</span></a></li>`).join('')}</ul>
</section>`;
    }
    d.article = `<article class="doc chapter ${d.kind}" id="${d.key}" ${bookMeta}>
<header class="chapter-head"${mark ? ` data-mark="${mark}"` : ''}>
<h1 class="chapter-title"><span class="chapter-num">${label}</span> <span class="chapter-name">${esc(name)}</span></h1>
${lead}</header>
<div class="chapter-body">
${d.body}${extra}
</div>
</article>`;
  }

  // 6. id → 쪽 지도로 # 링크를 쪽 사이 링크로 바꾼다(그림 참조, 연습문제 ↔ 해답, 장·절 링크)
  const idPage = new Map();
  const dups = new Set();
  const addId = (id, page) => {
    if (idPage.has(id) && idPage.get(id) !== page) dups.add(id);
    idPage.set(id, page);
  };
  const pageKeys = new Map();
  for (const d of pages) {
    pageKeys.set(d.key, d.page);
    d.ids = new Set([...d.article.matchAll(/\sid="([^"]+)"/g)].map((m) => unescapeAttr(m[1])));
    for (const id of d.ids) addId(id, d.page);
  }
  if (dups.size) console.warn(`  ${slug}: 여러 쪽에 같은 id ${dups.size}개: ${[...dups].slice(0, 5).join(', ')}`);
  for (const d of pages) {
    d.article = d.article.replace(/href="#([^"]*)"/g, (m, raw) => {
      const id = unescapeAttr(raw);
      if (d.ids.has(id)) return m;
      const target = idPage.get(id);
      if (!target) {
        broken.push(`${slug}/${d.page} → #${id}`);
        return m;
      }
      return pageKeys.get(id) === target ? `href="${target}"` : `href="${target}#${raw}"`;
    });
  }

  // 7. 틀: 머리 막대, 왼쪽 차례, 오른쪽 "이 쪽의 내용", 이전·다음
  const sideItem = (d, current, n, t, children = '') =>
    `<li><a href="${d.page}"${d === current ? ' aria-current="page"' : ''}>${n ? `<span class="n">${esc(n)}</span>` : ''}<span class="t">${esc(t)}</span></a>${children}</li>`;
  const secList = (d, hrefPrefix = '') =>
    d.headings
      .filter((h) => h.level <= 2)
      .map((h) => `<li><a href="${hrefPrefix}#${h.id}">${h.num ? `<span class="n">${esc(h.num)}</span>` : ''}<span class="t">${esc(h.text)}</span></a></li>`)
      .join('');
  function sidebar(current) {
    const items = [];
    for (const d of pages.filter((x) => x.kind === 'front')) {
      const secs = d === current ? secList(d) : '';
      items.push(sideItem(d, current, '', d.title, secs ? `<ul class="side-secs">${secs}</ul>` : ''));
    }
    for (const g of groups) {
      const { n, t } = groupName(g);
      const chs = g.chapters
        .filter(ready)
        .map((c) => {
          let sub = c === current ? secList(c) : '';
          if (c === answersDoc && (current === c || current?.kind === 'answers')) {
            sub += answerPages.map((a) => sideItem(a, current, `${a.chapter.number}장`, a.chapter.title)).join('');
          }
          return sideItem(c, current, chapterLabel(c), c.title, sub ? `<ul class="side-secs">${sub}</ul>` : '');
        })
        .join('');
      items.push(`<li class="side-group"><div class="side-group-label"><span class="n">${n}</span>${esc(t)}</div><ul>${chs}</ul></li>`);
    }
    return `<nav class="sidebar" id="sidebar" aria-label="차례">
<div class="side-head"><a class="side-book" href="index.html"${current == null ? ' aria-current="page"' : ''}>${esc(config.title)}</a><a class="side-home" href="../index.html">← 두 책 목록</a></div>
<ul class="side-toc">${items.join('')}</ul>
</nav>
<div class="scrim" hidden></div>`;
  }
  function onpage(d) {
    let items = d.headings
      .filter((h) => h.level <= 3)
      .map((h) => `<li class="lv${h.level}"><a href="#${h.id}">${h.num ? `${esc(h.num)} ` : ''}${esc(h.text)}</a></li>`);
    if (d.kind === 'answers') {
      items = [...d.body.matchAll(/<section class="answer" id="ans-([^"]+)"/g)].map((m) => `<li class="lv2"><a href="#ans-${m[1]}">연습문제 ${esc(unescapeAttr(m[1]))}</a></li>`);
    }
    if (d === answersDoc && answerPages.length) items.push(`<li class="lv2"><a href="#${d.key}-answers">장별 해답</a></li>`);
    if (!items.length) return '<aside class="onpage" aria-hidden="true"></aside>';
    return `<aside class="onpage" aria-label="이 쪽의 내용"><div class="onpage-head">이 쪽의 내용</div><ul>${items.join('')}</ul></aside>`;
  }
  const seq = [null, ...pages]; // null = 책 첫 쪽(index.html)
  const navText = (d) => (d == null ? { n: '', t: '표지와 차례' } : d.nav);
  function pager(d) {
    const i = seq.indexOf(d);
    const link = (x, dir, cls) => {
      if (x === undefined) return '';
      const { n, t } = navText(x);
      return `<a class="${cls}" href="${x == null ? 'index.html' : x.page}"><span class="pager-dir">${dir}</span><span class="pager-title">${n ? `${esc(n)} ` : ''}${esc(t)}</span></a>`;
    };
    return `<nav class="pager" aria-label="이전·다음 쪽">${link(i > 0 ? seq[i - 1] : undefined, '이전', 'pager-prev')}${link(i < seq.length - 1 ? seq[i + 1] : undefined, '다음', 'pager-next')}</nav>`;
  }
  const footer = `<footer class="site-foot"><p>${esc(config.title)} · ${esc(config.basis)} · 마지막 수정 ${esc(config.date)}${pdf ? ` · <a href="${pdf.href}" download>PDF 내려받기</a>` : ''}</p><p>${esc((config.colophon?.note ?? '').split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.'))}</p></footer>`;
  const frame = ({ title, description, current, main, aside, wide = false }) => `${head({ root: '../', title, description, book: slug })}
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
${topbar({ root: '../', book: config, pdf })}
<div class="layout${wide ? ' layout-wide' : ''}">
${sidebar(current)}
<main id="main" class="page">
${main}
</main>
${aside}
</div>
</body>
</html>
`;

  for (const d of pages) {
    const { n, t } = d.nav;
    const html = frame({
      title: `${n ? `${n} ` : ''}${t} · ${config.title}`,
      description: d.frontmatter.description ?? config.subtitle,
      current: d,
      main: `${d.article}\n${pager(d)}\n${footer}`,
      aside: onpage(d),
    });
    fs.writeFileSync(path.join(dir, d.page), html);
  }

  // 8. 책 첫 쪽: PDF와 같은 표지(PDF 보기의 폭 맞춤처럼 본문 칸 폭), 읽기·내려받기 단추, 짧은 책 정보, 판권. 차례는 왼쪽 차례에만 둔다
  const first = pages[0];
  const col = config.colophon ?? {};
  const editions = (col.editions ?? []).map((e) => `<dt>${esc(e.label)}</dt><dd>${esc(e.date)}${e.note ? ` · ${esc(e.note)}` : ''}</dd>`).join('');
  const home = `<article class="doc book-home">
<h1 class="vh">${esc(config.title)}</h1>
<div class="home-cover">${coverFrame(slug, config, { root: '../' })}</div>
<div class="actions home-actions"><a class="btn btn-primary" href="${first.page}">처음부터 읽기</a>${pdf ? `<a class="btn" href="${pdf.href}" download>${ICON.download}PDF 내려받기<span class="btn-note">${pdf.size}${pdf.pages ? ` · ${pdf.pages}쪽` : ''}</span></a>` : ''}</div>
<dl class="home-meta"><div><dt>기준</dt><dd>${esc(config.basis)}</dd></div><div><dt>마지막 수정</dt><dd>${esc(config.date)}</dd></div><div><dt>저자</dt><dd>${esc(config.author)} · <a href="${esc(config.github)}">${esc(config.github.replace(/^https:\/\//, ''))}</a></dd></div></dl>
<section class="colophon" id="colophon"><h2>판권</h2>
${editions ? `<dl class="colophon-editions">${editions}</dl>\n` : ''}<dl>${col.basis ? `<dt>기준 버전</dt><dd>${esc(col.basis)}</dd>` : ''}<dt>지은이</dt><dd>${esc(config.author)}</dd><dt>도움</dt><dd>Claude Opus 5.5${CLAUDE_LOGO}</dd>${col.sources ? `<dt>근거 자료</dt><dd>${esc(col.sources)}</dd>` : ''}<dt>글꼴</dt><dd>Pretendard, D2Coding (SIL Open Font License 1.1)</dd>${col.license ? `<dt>라이선스</dt><dd>${esc(col.license)}</dd>` : ''}</dl>
${col.note ? `<p class="colophon-note">${esc(col.note)}</p>\n` : ''}</section>
</article>`;
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    frame({ title: config.title, description: config.subtitle, current: null, main: `${home}\n${pager(null)}\n${footer}`, aside: '', wide: true }),
  );

  if (pdf) copy(pdf.src, path.join(dir, pdf.name));
  return { slug, pages: pages.length + 1, figures: usedFigs.size, pdf: pdf ? `${pdf.size}${pdf.pages ? `, ${pdf.pages}쪽` : ''}` : null };
}

/** 컴파일된 본문을 화면용으로 다듬는다(PDF에는 쓰지 않음). */
function webify(html, figures) {
  return (
    html
      // React가 그림마다 넣는 미리 읽기 link(경로가 원고 기준이라 화면에서는 404)
      .replace(/<link rel="preload" as="image"[^>]*>/g, '')
      // 코드 블록: 파일 이름 막대와 언어 이름표를 pre 밖으로 빼서 코드만 가로로 스크롤되게
      .replace(/<pre class="(shiki[^"]*)"([^>]*)>([\s\S]*?)<\/pre>/g, (_, cls, attrs, inner) => {
        const title = /\sdata-title="([^"]*)"/.exec(attrs)?.[1];
        const lang = /\sdata-lang="([^"]*)"/.exec(attrs)?.[1];
        const rest = attrs.replace(/\sdata-(?:title|lang)="[^"]*"/g, '');
        return `<div class="code${title ? ' has-title' : ''}">${title ? `<div class="code-title">${title}</div>` : ''}${lang ? `<span class="code-lang" data-pagefind-ignore>${lang}</span>` : ''}<pre class="${cls}"${rest}>${inner}</pre></div>`;
      })
      .replace(/<table>/g, '<div class="table-wrap"><table>')
      .replace(/<\/table>/g, '</table></div>')
      .replace(/<h([2-4]) id="([^"]+)">([\s\S]*?)<\/h\1>/g, (_, n, id, inner) => `<h${n} id="${id}">${inner}<a class="hanchor" href="#${id}" aria-label="이 제목의 링크" data-pagefind-ignore>#</a></h${n}>`)
      .replace(/<img src="(figures\/[^"]*)"/g, (m, src) => {
        const file = path.join(figures, ...src.slice('figures/'.length).split('/').map(decodeURIComponent));
        const info = fs.existsSync(file) ? imageInfo(file) : null;
        return `${m}${info ? ` width="${info.width}" height="${info.height}"` : ''} loading="lazy" decoding="async"`;
      })
      .replace(/<span class="fig-mark"/g, '<span class="fig-mark" data-pagefind-ignore')
      .replace(/<a class="xref"/g, '<a class="xref" data-pagefind-ignore')
  );
}

// ---------------------------------------------------------------- 첫 화면
function writeLanding(metas) {
  const books = metas
    .map((m) => {
      const { config, pdf, slug } = m;
      return `<section class="book book-${slug}">
<div class="book-cover">${coverFrame(slug, config, { root: '', href: `${slug}/index.html` })}</div>
<div class="book-info">
${config.cover?.kicker ? `<p class="book-kicker">${esc(config.cover.kicker)}</p>\n` : ''}<h2><a href="${slug}/index.html">${esc(config.title)}</a></h2>
<p class="book-sub">${esc(config.subtitle)}</p>
<div class="actions"><a class="btn btn-primary" href="${slug}/index.html">온라인으로 읽기</a>${pdf ? `<a class="btn" href="${slug}/${pdf.href}" download>${ICON.download}PDF 내려받기<span class="btn-note">${pdf.size}${pdf.pages ? ` · ${pdf.pages}쪽` : ''}</span></a>` : ''}</div>
</div>
</section>`;
    })
    .join('\n');
  const note = metas[0].config.colophon?.note ?? '';
  const description = 'Arma Reforger(Enfusion 엔진) 모딩을 한국어로 설명하는 두 권의 책: Enforce Script 가이드, Enfusion Workbench 가이드';
  const social = [
    `<link rel="canonical" href="${SITE_URL}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${SITE_URL}">`,
    `<meta property="og:title" content="${esc(SITE_TITLE)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    '<meta property="og:locale" content="ko_KR">',
  ];
  const html = `${head({ root: '', title: SITE_TITLE, description, extra: `${social.join('\n')}\n` })}
<body class="landing-page">
<a class="skip" href="#main">본문으로 건너뛰기</a>
${topbar({ root: '' })}
<main id="main" class="landing">
<header class="landing-head">
<h1>${SITE_TITLE}</h1>
<p>Arma Reforger(Enfusion 엔진)의 스크립트 언어와 모딩 도구를 한국어로 설명하는 책 두 권입니다. 웹에서 바로 읽거나 PDF로 내려받을 수 있습니다.</p>
</header>
<div class="books">
${books}
</div>
<footer class="site-foot"><p>${esc(note.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.'))}</p></footer>
</main>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
}

// ---------------------------------------------------------------- 실행(위의 상수가 모두 정해진 뒤)
const serveArg = argv.find((a) => a === '--serve' || a.startsWith('--serve='));
if (serveArg) serve(Number(serveArg.split('=')[1] ?? 4173));
else await build();
