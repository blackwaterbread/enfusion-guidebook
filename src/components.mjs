// MDX에서 import 없이 바로 쓸 수 있는 학습용 컴포넌트.
// 정적 PDF용이므로 클라이언트 JS 없이 HTML만 만든다.
import { createElement as h, Fragment } from 'react';

function box(kind, label) {
  function Box({ title, children }) {
    return h(
      'aside',
      { className: `box box-${kind}` },
      h(
        'div',
        { className: 'box-head' },
        h('span', { className: 'box-label' }, label),
        title ? h('span', { className: 'box-title' }, title) : null,
      ),
      h('div', { className: 'box-body' }, children),
    );
  }
  Box.displayName = label;
  return Box;
}

const LEVELS = { 기초: 'basic', 응용: 'applied', 도전: 'challenge' };

export const components = {
  /** 장 첫머리의 학습 목표. 본문은 글머리표 목록. */
  Objectives({ children }) {
    return h(
      'section',
      { className: 'objectives' },
      h('div', { className: 'objectives-head' }, '이 장의 학습 목표'),
      h('div', { className: 'objectives-body' }, children),
    );
  },
  Note: box('note', '참고'),
  Tip: box('tip', '팁'),
  Warning: box('warning', '주의'),
  /** 초보자가 자주 하는 실수와 그 이유. */
  Pitfall: box('pitfall', '흔한 실수'),
  /** Python / JavaScript / C# 등과 나란히 비교. 본문에 언어별 코드 블록을 둔다. */
  Compare: box('compare', '다른 언어와 비교'),
  /** Workbench에서 직접 따라 해 보는 실습. */
  TryIt: box('tryit', '직접 해보기'),
  /** 장 끝의 핵심 정리. 본문은 글머리표 목록. */
  Summary({ children }) {
    return h(
      'section',
      { className: 'summary' },
      h('div', { className: 'summary-head' }, '핵심 정리'),
      h('div', { className: 'summary-body' }, children),
    );
  },
  /** 연습문제. id="5-1" 형식(장-번호), level은 기초/응용/도전. */
  Exercise({ id, level, title, children }) {
    const lv = LEVELS[level] ?? 'basic';
    return h(
      'section',
      { className: 'exercise', id: id ? `ex-${id}` : undefined },
      h(
        'div',
        { className: 'exercise-head' },
        h('span', { className: 'exercise-no' }, `연습문제 ${id ?? ''}`),
        level ? h('span', { className: `level level-${lv}` }, level) : null,
        title ? h('span', { className: 'exercise-title' }, title) : null,
        id ? h('a', { className: 'xref', href: `#ans-${id}` }, '해답 ›') : null,
      ),
      h('div', { className: 'exercise-body' }, children),
    );
  },
  /** 부록의 해답. id는 대응하는 Exercise의 id. */
  Answer({ id, children }) {
    return h(
      'section',
      { className: 'answer', id: id ? `ans-${id}` : undefined },
      h(
        'div',
        { className: 'answer-head' },
        h('span', { className: 'answer-no' }, `연습문제 ${id ?? ''}`),
        ' 해답',
        id ? h('a', { className: 'xref', href: `#ex-${id}` }, '문제 ›') : null,
      ),
      h('div', { className: 'answer-body' }, children),
    );
  },
  /** 키보드 단축키: <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> */
  Kbd({ children }) {
    return h('kbd', null, children);
  },
  /**
   * 그림. 본문이 캡션이다. src는 설정 figures 폴더 기준, size는 auto(PNG·JPEG 폭 1px = 0.2mm)·full·half,
   * marks="1@12,30;2@55,8"은 그림 위에 얹는 번호 원(번호@가로%,세로%). 번호("그림 N-M")와 경로·폭은 build가 넣는다.
   */
  Figure({ src, alt, size = 'auto', id, marks, children }) {
    const pins = String(marks ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [n, xy = ''] = s.split('@');
        const [x, y] = xy.split(',').map((v) => v.trim());
        return h('span', { className: 'fig-mark', style: { left: `${x}%`, top: `${y}%` } }, n.trim());
      });
    return h(
      'figure',
      { className: `fig fig-${size}`, id: id ? `fig-${id}` : undefined, 'data-src': src ?? '' },
      h('span', { className: 'fig-img' }, h('img', { src, alt: alt ?? '' }), ...pins),
      h('figcaption', null, h('span', { className: 'fig-no' }), children),
    );
  },
  /** 그림 참조: <FigRef id="file-menu" /> → "그림 2-1"(번호는 build가 넣는다). */
  FigRef({ id }) {
    return h('a', { className: 'figref', href: `#fig-${id}`, 'data-figref': id }, '그림');
  },
  Fragment,
};

export const COMPONENT_NAMES = Object.keys(components).filter((n) => n !== 'Fragment');
