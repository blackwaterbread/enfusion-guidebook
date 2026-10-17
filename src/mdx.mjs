// MDX → HTML 공용 파이프라인 (check.mjs, build.mjs에서 사용)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import matter from 'gray-matter';
import { createHighlighter } from 'shiki';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import { transformerNotationHighlight, transformerNotationDiff } from '@shikijs/transformers';
import { visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import { components } from './components.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const enforceGrammar = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'enforce.tmLanguage.json'), 'utf8'));

export const LANG_LABELS = {
  enforce: 'Enforce Script',
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  json: 'JSON',
  ini: 'INI',
  xml: 'XML',
  bash: 'Shell',
  powershell: 'PowerShell',
  lua: 'Lua',
  text: '',
};
const ALIASES = { enfusion: 'enforce', enscript: 'enforce', js: 'javascript', ts: 'typescript', cs: 'csharp', 'c#': 'csharp', py: 'python', sh: 'bash', txt: 'text', plaintext: 'text', ps1: 'powershell' };
export const KNOWN_LANGS = new Set([...Object.keys(LANG_LABELS), ...Object.keys(ALIASES)]);

let highlighterPromise;
export function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ['github-light'],
    langs: [enforceGrammar, 'python', 'javascript', 'typescript', 'csharp', 'cpp', 'c', 'json', 'ini', 'xml', 'bash', 'powershell', 'lua'],
  });
  return highlighterPromise;
}

// 코드 펜스 메타: ```enforce title="Scripts/Game/TAG_Foo.c" showLineNumbers
const transformerBookMeta = {
  name: 'book-meta',
  pre(node) {
    const raw = this.options.meta?.__raw ?? '';
    const title = raw.match(/title="([^"]*)"/);
    if (title) node.properties['data-title'] = title[1];
    if (/\b(showLineNumbers|lineNumbers)\b/.test(raw)) this.addClassToHast(node, 'line-numbers');
    const lang = ALIASES[this.options.lang] ?? this.options.lang;
    const label = LANG_LABELS[lang];
    if (label) node.properties['data-lang'] = label;
  },
};

/**
 * 제목 번호·id 부여와 수준 조정.
 *  - shift: MDX의 ## 를 h(2+shift)로 내린다 (장 제목이 h2이므로 장 본문은 shift=1)
 *  - number: "5" 또는 "A" 이면 ## 제목 앞에 "5.1" 같은 번호를 붙인다
 *  - headings: 수집 결과(차례용)를 담을 배열
 */
function rehypeBookHeadings({ key, number, shift, headings }) {
  return (tree) => {
    let c2 = 0;
    let c3 = 0;
    let c4 = 0;
    visit(tree, 'element', (node) => {
      const m = /^h([1-6])$/.exec(node.tagName);
      if (!m) return;
      const level = Number(m[1]);
      const text = toString(node).trim();
      let id;
      let num = null;
      if (level <= 2) {
        c2 += 1;
        c3 = 0;
        c4 = 0;
        id = `${key}-${c2}`;
        if (number != null) num = `${number}.${c2}`;
      } else if (level === 3) {
        c3 += 1;
        c4 = 0;
        id = `${key}-${c2}-${c3}`;
      } else {
        c4 += 1;
        id = `${key}-${c2}-${c3}-${c4}`;
      }
      node.properties = { ...node.properties, id };
      if (num) {
        node.children = [
          { type: 'element', tagName: 'span', properties: { className: ['secnum'] }, children: [{ type: 'text', value: num }] },
          { type: 'text', value: ' ' },
          ...node.children,
        ];
      }
      headings.push({ level, id, num, text, label: num ? `${num} ${text}` : text });
      node.tagName = `h${Math.min(6, level + shift)}`;
    });
  };
}

export function readFrontmatter(file) {
  return matter(fs.readFileSync(file, 'utf8')).data ?? {};
}

/**
 * MDX 파일 하나를 정적 HTML로 컴파일한다.
 * themes: Shiki 다중 테마(웹판의 { light, dark }). 없으면 github-light 하나(PDF).
 * @returns {{ html: string, headings: object[], frontmatter: object }}
 */
export async function compileMdx(file, { key, number = null, shift = 1, themes = null } = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const frontmatter = matter(source).data ?? {};
  const headings = [];
  const highlighter = await getHighlighter();
  if (themes) {
    const missing = Object.values(themes).filter((t) => !highlighter.getLoadedThemes().includes(t));
    if (missing.length) await highlighter.loadTheme(...missing);
  }
  const mod = await evaluate(
    { value: source, path: file },
    {
      ...runtime,
      development: false,
      remarkPlugins: [remarkFrontmatter, remarkGfm],
      rehypePlugins: [
        [rehypeBookHeadings, { key, number, shift, headings }],
        [
          rehypeShikiFromHighlighter,
          highlighter,
          {
            ...(themes ? { themes, defaultColor: 'light' } : { theme: 'github-light' }),
            defaultLanguage: 'text',
            fallbackLanguage: 'text',
            addLanguageClass: true,
            transformers: [transformerBookMeta, transformerNotationHighlight(), transformerNotationDiff()],
          },
        ],
      ],
    },
  );
  const html = renderToStaticMarkup(createElement(mod.default, { components }));
  return { html, headings, frontmatter };
}
