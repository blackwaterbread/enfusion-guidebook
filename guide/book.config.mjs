// Workbench 가이드 구성. 장 번호와 부록 문자는 여기 순서로 자동 부여된다.
// 빌드·검사: bun src/build.mjs --book=guide/book.config.mjs, bun src/check.mjs --book=guide/book.config.mjs
export default {
  title: 'Enfusion Workbench 가이드',
  subtitle: 'Arma Reforger 모딩 도구에 대한 사용법과 도움말',
  basis: 'Arma Reforger Tools 1.8 · Enfusion Workbench 기준',
  date: '2026년 10월',
  author: 'dayrain (blackwaterbread)',
  github: 'https://github.com/blackwaterbread',
  output: 'dist/Workbench-가이드.pdf',
  html: 'dist/Workbench-가이드.html',
  content: 'guide/content',
  figures: 'guide/figures',
  css: ['styles/book.css', 'styles/guide.css'],
  previewSuffix: '-guide',

  cover: {
    kicker: '한국어 안내서',
    title: 'Enfusion Workbench<br><span>가이드</span>',
  },
  colophon: {
    // 발행 이력(판권 쪽에 순서대로). 갱신할 때 { label: '갱신', date: '…', note: '무엇을 고쳤는지' }를 더한다
    editions: [{ label: '초판', date: '2026년 10월 17일' }],
    license: '이 책은 크리에이티브 커먼즈 저작자표시-비영리-동일조건변경허락 4.0 국제 라이선스(CC BY-NC-SA 4.0)로 배포됩니다. 책 속 예제 코드는 MIT 라이선스로 자유롭게 쓸 수 있습니다.',
    basis: 'Arma Reforger Tools 1.8.0.13 (Steam 빌드 24870687), Enfusion Workbench',
    sources: 'Bohemia Interactive 커뮤니티 위키(Arma Reforger), Workbench 동봉 엔진 문서, BohemiaInteractive/Arma-Reforger-Script-Diff',
    note: '이 책은 비공식 학습 자료이며 Bohemia Interactive a.s.와 관계가 없습니다. Arma, Arma Reforger, Enfusion은 Bohemia Interactive a.s.의 상표입니다. 화면은 Arma Reforger Tools 1.8.0.13 기준이며, 업데이트로 메뉴와 창 이름이 바뀔 수 있습니다.',
  },
  keywords: ['Enfusion Workbench', 'Arma Reforger', 'Arma Reforger Tools', 'Workbench', '모딩', '가이드'],
  appendixTitle: '레퍼런스',

  beforeToc: ['00-greeting.mdx'], // 차례 앞에 들어가고 차례 목록에는 넣지 않는다
  front: [],

  parts: [
    {
      title: '둘러보기',
      chapters: [
        'ch01-install-project.mdx',
        'ch02-main-window.mdx',
        'ch03-resource-browser.mdx',
      ],
    },
    {
      title: '스크립트',
      chapters: [
        'ch04-script-editor.mdx',
        'ch05-console-log-debugger.mdx',
      ],
    },
    {
      title: '월드와 데이터',
      chapters: [
        'ch06-world-editor.mdx',
        'ch07-components-properties.mdx',
        'ch08-prefabs.mdx',
        'ch09-config-files.mdx',
        'ch10-layouts-string-tables.mdx',
      ],
    },
    {
      title: '실행과 시험',
      chapters: [
        'ch11-play-diag-menu.mdx',
        'ch12-multiplayer-test-tools.mdx',
      ],
    },
  ],

  appendices: [
    'appendix-a-shortcuts.mdx',
    'appendix-b-menu-map.mdx',
    'appendix-c-wiki-screen-names.mdx',
    'appendix-d-references.mdx',
  ],
};
