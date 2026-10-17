// 책 설정(기본 book.config.mjs)을 읽어 문서 목록(순서·번호·id)을 만든다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readFrontmatter } from './mdx.mjs';

export const DEFAULT_CONFIG = path.join(ROOT, 'book.config.mjs');
const pad = (n) => String(n).padStart(2, '0');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 그림 인쇄 배율: 5px = 1mm(1px = 0.2mm). 본문 폭 170mm = 850px.
export const PX_PER_MM = 5;
export const BODY_MM = 170;

/** 명령줄의 --book=<설정 파일>(현재 폴더 기준 경로). 없으면 undefined(loadBook 기본값). */
export function bookArg(argv) {
  const a = argv.find((x) => x.startsWith('--book='));
  return a ? path.resolve(process.cwd(), a.slice('--book='.length)) : undefined;
}

/** 설정 안의 경로(content, figures, css, output, html)는 저장소 루트 기준이다. answers는 content 기준. */
export async function loadBook(configFile = DEFAULT_CONFIG) {
  if (!fs.existsSync(configFile)) throw new Error(`책 설정 파일이 없습니다: ${configFile}`);
  const config = (await import(pathToFileURL(configFile).href)).default;
  const content = path.resolve(ROOT, config.content ?? 'content');
  const answers = path.resolve(content, config.answers ?? 'answers');
  const figures = path.resolve(ROOT, config.figures ?? 'figures');
  const docs = [];
  const chapters = [];

  (config.beforeToc ?? []).forEach((file, i) => {
    docs.push({ kind: 'front', beforeToc: true, file: path.join(content, file), key: `pre-${i + 1}`, number: null, shift: 0 });
  });

  config.front.forEach((file, i) => {
    docs.push({ kind: 'front', file: path.join(content, file), key: `front-${i + 1}`, number: null, shift: 0 });
  });

  let n = 0;
  config.parts.forEach((part, pi) => {
    docs.push({ kind: 'part', key: `part-${pi + 1}`, index: pi + 1, title: part.title, chapters: [] });
    const partDoc = docs[docs.length - 1];
    for (const file of part.chapters) {
      n += 1;
      const answersFile = path.join(answers, `ch${pad(n)}.mdx`);
      const doc = { kind: 'chapter', file: path.join(content, file), key: `ch${pad(n)}`, number: n, shift: 1, part: pi + 1, answersFile };
      docs.push(doc);
      chapters.push(doc);
      partDoc.chapters.push(doc);
    }
  });

  docs.push({ kind: 'appendix-part', key: 'appendix', title: '부록', chapters: [] });
  const appendixPart = docs[docs.length - 1];
  config.appendices.forEach((file, ai) => {
    const letter = LETTERS[ai];
    const doc = { kind: 'appendix', file: path.join(content, file), key: `ap-${letter.toLowerCase()}`, number: letter, letter, shift: 1 };
    docs.push(doc);
    appendixPart.chapters.push(doc);
    if (file === config.answersAppendix) {
      for (const ch of chapters) {
        docs.push({ kind: 'answers', file: ch.answersFile, key: `ans-ch${pad(ch.number)}`, number: null, shift: 2, chapter: ch });
      }
    }
  });

  for (const d of docs) {
    if (!d.file) continue;
    d.exists = fs.existsSync(d.file);
    d.rel = path.relative(ROOT, d.file).replaceAll('\\', '/');
    d.frontmatter = d.exists ? readFrontmatter(d.file) : {};
    d.title = d.frontmatter.title ?? d.title ?? null;
  }
  return { config, docs, chapters, configFile, figures };
}

/** HTML 속성 값의 이스케이프를 푼다(React가 넣은 &amp; 등). */
export const unescapeAttr = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** 그림 파일의 형식과 크기(px). PNG는 비트 깊이·색 형식·인터레이스도. PNG·JPEG가 아니면 null. */
export function imageInfo(file) {
  const b = fs.readFileSync(file);
  if (b.length > 29 && b.readUInt32BE(0) === 0x89504e47) {
    return { type: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20), bitDepth: b[24], colorType: b[25], interlace: b[28], bytes: b.length };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff || b[i + 1] === 0xff) {
        i += 1;
        continue;
      }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { type: 'jpeg', width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5), bytes: b.length };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** 장 이름표: "5장", "부록 A". */
export const chapterLabel = (d) => (d.kind === 'appendix' ? `부록 ${d.letter}` : `${d.number}장`);

// 인라인 코드(`a.b/c(d)`)는 / . ( , 뒤에서만 줄이 바뀌도록 줄바꿈 지점을 넣는다.
// 코드 블록(pre)은 <code> 안에 <span>이 있으므로 이 정규식에 걸리지 않는다.
export const addCodeBreaks = (html) =>
  html.replace(/<code>([^<]+)<\/code>/g, (_, inner) => `<code>${inner.replace(/([/.(,])(?=\S)/g, '$1<wbr>')}</code>`);

/**
 * 그림(<Figure>): 컴파일된 문서(d.html)마다 "그림 N-M"(부록 "그림 A-M") 번호를 넣고, img의 src를 url(file)로,
 * fig-img의 속성을 attrs({ file, size })의 결과(앞에 공백을 둔 문자열, 없으면 '')로 바꾼다. 그다음 <FigRef>에 번호를 넣는다.
 * 그림 파일이 없으면 경고하고 attrs는 부르지 않는다. 반환값은 { 그림 id: "그림 N-M" }.
 */
export function numberFigures(docs, figures, { url, attrs }) {
  const labels = {};
  for (const d of docs) {
    if (d.html == null) continue;
    let m = 0;
    d.html = d.html.replace(/<figure class="fig fig-([^"]*)"(?: id="fig-([^"]*)")? data-src="([^"]*)">[\s\S]*?<\/figure>/g, (fig, size, id, src) => {
      m += 1;
      const label = `그림 ${d.number != null ? `${d.number}-` : ''}${m}`;
      if (id) labels[unescapeAttr(id)] = label;
      const file = path.resolve(figures, unescapeAttr(src));
      let extra = '';
      if (!src || !fs.existsSync(file)) console.warn(`  그림 파일 없음: ${d.rel} → ${src ? path.relative(ROOT, file) : '(src 없음)'}`);
      else extra = attrs({ file, size });
      const href = url(file);
      return fig
        .replace('<span class="fig-img">', () => `<span class="fig-img"${extra}>`)
        .replace(/<img src="[^"]*"/, () => `<img src="${href}"`)
        .replace('<span class="fig-no"></span>', () => `<span class="fig-no">${label}</span>`);
    });
  }
  for (const d of docs) {
    if (d.html == null) continue;
    d.html = d.html.replace(/(<a class="figref" href="#fig-([^"]*)" data-figref="[^"]*">)[^<]*<\/a>/g, (_, open, id) => {
      const label = labels[unescapeAttr(id)];
      if (!label) console.warn(`  그림 참조를 찾지 못함: ${d.rel} → ${unescapeAttr(id)}`);
      return `${open}${label ?? '그림 ?'}</a>`;
    });
  }
  return labels;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 표지(PDF 첫 쪽). 웹판도 같은 마크업과 book.css·guide.css의 표지 규칙으로 그린다. cover.title·cover.code는 HTML. */
// 판권 '도움' 칸의 Claude 로고(PDF와 웹이 함께 씀)
export const CLAUDE_LOGO = '<svg class="colophon-logo" viewBox="0 0 24 24" role="img" aria-label="Claude"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757"/></svg>';

export function renderCover(config) {
  return `<section class="cover page-cover">
<div class="cover-top"><span>ARMA REFORGER</span><span class="dot"></span><span>ENFUSION ENGINE</span></div>
<div class="cover-main">
${config.cover?.kicker ? `<div class="cover-kicker">${esc(config.cover.kicker)}</div>\n` : ''}<div class="cover-title">${config.cover?.title ?? esc(config.title)}</div>
<div class="cover-subtitle">${esc(config.subtitle)}</div>
</div>
${config.cover?.code ? `<pre class="cover-code">${config.cover.code}</pre>\n` : ''}<div class="cover-bottom">
<div class="cover-author"><div class="cover-label">저자</div><div class="cover-author-name">${esc(config.author)}</div><a class="cover-author-link" href="${esc(config.github)}">${esc(config.github)}</a></div>
<div class="cover-meta"><div>${esc(config.basis)}</div><div>마지막 수정: ${esc(config.date)}</div></div>
</div>
</section>`;
}

export { pad };
