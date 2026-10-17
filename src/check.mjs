// 원고 검사: MDX 컴파일 + 형식 규칙 점검.
//   bun src/check.mjs                       # 존재하는 모든 원고
//   bun src/check.mjs content/ch05-classes.mdx content/answers/ch05.mdx
//   bun src/check.mjs --book=<설정 파일> [원고...]   # 다른 책. --book= 없이 원고만 주면 원고 위 폴더에서 가장 가까운 book.config.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { compileMdx, KNOWN_LANGS, ROOT } from './mdx.mjs';
import { loadBook, bookArg, DEFAULT_CONFIG, imageInfo, unescapeAttr, PX_PER_MM, BODY_MM } from './book.mjs';
import { COMPONENT_NAMES } from './components.mjs';

const argv = process.argv.slice(2);
const args = argv.filter((a) => !a.startsWith('--book=')).map((a) => path.resolve(process.cwd(), a));
const rel = (f) => path.relative(ROOT, f).replaceAll('\\', '/');

function nearestConfig(file) {
  for (let dir = path.dirname(file); ; dir = path.dirname(dir)) {
    const f = path.join(dir, 'book.config.mjs');
    if (fs.existsSync(f)) return f;
    if (path.dirname(dir) === dir) return DEFAULT_CONFIG;
  }
}
let configFile = bookArg(argv);
if (!configFile && args.length) {
  const found = [...new Set(args.map(nearestConfig))];
  if (found.length > 1) {
    console.log(`  ERROR  서로 다른 책의 원고를 함께 검사할 수 없습니다: ${found.map(rel).join(', ')}`);
    process.exit(1);
  }
  configFile = found[0];
}
const { docs, figures, configFile: bookFile } = await loadBook(configFile);
const configName = rel(bookFile);
const targets = docs.filter((d) => d.file && d.exists && (args.length === 0 || args.includes(path.resolve(d.file))));
const unknownArgs = args.filter((a) => !docs.some((d) => d.file && path.resolve(d.file) === a));

let errors = 0;
let warnings = 0;
const err = (rel, line, msg) => { errors += 1; console.log(`  ERROR ${rel}${line ? `:${line}` : ''}  ${msg}`); };
const warn = (rel, line, msg) => { warnings += 1; console.log(`  warn  ${rel}${line ? `:${line}` : ''}  ${msg}`); };

for (const a of unknownArgs) err(path.relative(ROOT, a), 0, `${configName}에 등록되지 않은 파일입니다 (파일명 확인)`);

function lint(doc) {
  const src = fs.readFileSync(doc.file, 'utf8');
  const lines = src.split(/\r?\n/);
  let fence = null;
  const open = [];
  let longLines = 0;
  lines.forEach((line, i) => {
    const ln = i + 1;
    const f = line.match(/^(\s*)(```+|~~~+)(.*)$/);
    if (f) {
      if (!fence) {
        fence = f[2];
        const lang = f[3].trim().split(/\s+/)[0];
        if (!lang) warn(doc.rel, ln, '코드 블록 언어가 없습니다 (예: ```enforce, 일반 텍스트는 ```text)');
        else if (!KNOWN_LANGS.has(lang)) warn(doc.rel, ln, `알 수 없는 코드 언어 "${lang}"`);
      } else if (f[2].startsWith(fence[0]) && f[2].length >= fence.length && !f[3].trim()) {
        fence = null;
      }
      return;
    }
    if (fence) {
      if (line.length > 100) longLines += 1;
      return;
    }
    if (line.includes('<!--')) err(doc.rel, ln, 'HTML 주석은 MDX에서 쓸 수 없습니다. {/* ... */} 를 쓰세요');
    if (/^#\s/.test(line)) err(doc.rel, ln, '# (H1)은 쓰지 마세요. 장 제목은 frontmatter title로 자동 생성됩니다');
    if (/^#{2,6}\s+(\d+(\.\d+)*|[A-Z]\.\d+)[.)]?\s/.test(line)) warn(doc.rel, ln, '제목에 번호를 직접 쓰지 마세요 (자동 번호)');
    if (/^#{2,6}\s/.test(line) && open.length) warn(doc.rel, ln, `<${open.at(-1)}> 안에 제목을 두지 마세요`);
    const o = line.match(/^\s*<([A-Z][A-Za-z]*)(\s[^>]*)?>\s*$/);
    if (o && !line.trim().endsWith('/>')) {
      if (!COMPONENT_NAMES.includes(o[1])) err(doc.rel, ln, `알 수 없는 컴포넌트 <${o[1]}>`);
      open.push(o[1]);
    }
    const c = line.match(/^\s*<\/([A-Z][A-Za-z]*)>\s*$/);
    if (c) {
      if (open.at(-1) === c[1]) open.pop();
      else warn(doc.rel, ln, `닫는 태그 </${c[1]}> 짝이 맞지 않습니다`);
    }
  });
  if (fence) err(doc.rel, lines.length, '닫히지 않은 코드 블록');
  if (open.length) warn(doc.rel, lines.length, `닫히지 않은 컴포넌트: ${open.join(', ')}`);
  if (longLines) warn(doc.rel, 0, `100자를 넘는 코드 줄 ${longLines}개 (PDF에서 줄바꿈됨)`);
  if (doc.kind !== 'answers' && !doc.frontmatter.title) err(doc.rel, 1, 'frontmatter에 title이 없습니다');
  return src;
}

function exerciseIds(src, tag) {
  return [...src.matchAll(new RegExp(`<${tag}\\s+[^>]*id="([^"]+)"`, 'g'))].map((m) => m[1]);
}

// 그림(<Figure>) 점검. 한도는 그림 하나가 PDF에 들어갈 크기 어림(바이트, 1 KB = 1000 B).
const FIGURE_LIMIT = 150 * 1000;
function lintFigure(doc, size, src, noCaption) {
  if (!src) return err(doc.rel, 0, '그림에 src가 없습니다');
  const file = path.resolve(figures, src);
  if (!['auto', 'full', 'half'].includes(size)) warn(doc.rel, 0, `그림 ${src}: size는 auto, full, half 가운데 하나여야 합니다`);
  if (noCaption) warn(doc.rel, 0, `그림 ${src}: 캡션이 없습니다`);
  if (!fs.existsSync(file)) return err(doc.rel, 0, `그림 파일이 없습니다: ${rel(file)}`);
  const info = imageInfo(file);
  if (!info) return warn(doc.rel, 0, `그림 ${src}: PNG나 JPEG가 아닙니다`);
  if (info.type === 'png' && (info.colorType === 4 || info.colorType === 6)) warn(doc.rel, 0, `그림 ${src}: 알파 채널이 있습니다 (RGB로 저장하세요)`);
  if (size === 'auto' && info.width > BODY_MM * PX_PER_MM) warn(doc.rel, 0, `그림 ${src}: 폭 ${info.width}px이 본문 폭 ${BODY_MM * PX_PER_MM}px보다 넓어 줄어듭니다`);
  const bytes = pdfImageBytes(file, info);
  if (bytes > FIGURE_LIMIT) warn(doc.rel, 0, `그림 ${src}: PDF에 들어갈 크기 어림 ${Math.round(bytes / 1000)} KB가 한도 ${FIGURE_LIMIT / 1000} KB를 넘습니다`);
}

// Chromium은 PNG를 픽셀로 풀어 Flate(RGB)로 다시 넣으므로, RGB를 줄마다 필터 0으로 deflate(6)한 크기로 어림한다.
// Bun의 zlib는 같은 수준에서 덜 줄여 어림이 실제보다 크게 나온다(경고가 일찍 남). JPEG와 8비트 비인터레이스가 아닌 PNG는 파일 크기.
function pdfImageBytes(file, info) {
  const buf = fs.readFileSync(file);
  if (info.type !== 'png' || info.bitDepth !== 8 || info.interlace) return buf.length;
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[info.colorType];
  const idat = [];
  let plte = null;
  for (let i = 8; i + 8 <= buf.length; i += 12 + buf.readUInt32BE(i)) {
    const type = buf.toString('latin1', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + buf.readUInt32BE(i));
    if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = data;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width: w, height: hgt } = info;
  const stride = w * ch;
  const rgb = Buffer.alloc(hgt * (1 + w * 3));
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < hgt; y++) {
    const ft = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let p = 0;
      if (ft === 1) p = a;
      else if (ft === 2) p = b;
      else if (ft === 3) p = (a + b) >> 1;
      else if (ft === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x] + p) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 3) + 1 + x * 3;
      for (let k = 0; k < 3; k++) rgb[o + k] = info.colorType === 3 ? plte[line[x] * 3 + k] : line[x * ch + (ch >= 3 ? k : 0)];
    }
    prev = line;
  }
  return zlib.deflateSync(rgb, { level: 6 }).length;
}

for (const doc of targets) {
  console.log(`- ${doc.rel}`);
  const src = lint(doc);
  if (doc.kind === 'chapter') {
    const ids = exerciseIds(src, 'Exercise');
    for (const id of ids) if (!new RegExp(`^${doc.number}-\\d+$`).test(id)) warn(doc.rel, 0, `연습문제 id "${id}"는 "${doc.number}-번호" 형식이어야 합니다`);
    if (new Set(ids).size !== ids.length) err(doc.rel, 0, '연습문제 id 중복');
    const af = doc.answersFile;
    if (ids.length && !fs.existsSync(af)) warn(doc.rel, 0, `해답 파일 ${rel(af)} 가 없습니다`);
    if (fs.existsSync(af)) {
      const ans = exerciseIds(fs.readFileSync(af, 'utf8'), 'Answer');
      for (const id of ids) if (!ans.includes(id)) warn(doc.rel, 0, `연습문제 ${id}의 해답이 없습니다`);
      for (const id of ans) if (!ids.includes(id)) warn(rel(af), 0, `해답 ${id}에 해당하는 연습문제가 없습니다`);
    }
  }
  try {
    const { html } = await compileMdx(doc.file, { key: doc.key, number: doc.number, shift: doc.shift });
    if (html.length < 50) warn(doc.rel, 0, '내용이 거의 없습니다');
    // 굵게(**)가 적용되지 않고 별표가 그대로 남은 곳: 닫는 ** 앞이 문장부호/코드이고 뒤에 한글이 바로 붙는 경우 등
    const text = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '`code`');
    for (const m of text.matchAll(/\*\*/g)) {
      const ctx = text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
      warn(doc.rel, 0, `굵게 표시가 적용되지 않음: "…${ctx}…" → **…** 대신 <strong>…</strong>을 쓰거나 띄어 쓰세요`);
    }
    for (const m of html.matchAll(/<figure class="fig fig-([^"]*)"(?: id="[^"]*")? data-src="([^"]*)">[\s\S]*?<\/figure>/g)) {
      lintFigure(doc, m[1], unescapeAttr(m[2]), m[0].includes('<span class="fig-no"></span></figcaption>'));
    }
  } catch (e) {
    const line = e.line ?? e.place?.line ?? e.place?.start?.line;
    err(doc.rel, line, (e.reason ?? e.message ?? String(e)).split('\n')[0]);
  }
}

const missing = docs.filter((d) => d.file && !d.exists && d.kind !== 'answers').map((d) => d.rel);
if (args.length === 0 && missing.length) console.log(`\n(아직 없는 원고 ${missing.length}개: ${missing.join(', ')})`);
console.log(`\n검사 ${targets.length}개 파일 — 오류 ${errors}, 경고 ${warnings}`);
process.exit(errors ? 1 : 0);
