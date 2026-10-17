// 책 구성. 장 번호와 부록 문자는 여기 순서로 자동 부여된다.
export default {
  title: 'Enforce Script 가이드',
  subtitle: 'Arma Reforger 스크립팅 입문과 레퍼런스',
  basis: 'Arma Reforger 1.8 · Enfusion 엔진 기준',
  date: '2026년 10월',
  author: 'dayrain (blackwaterbread)',
  github: 'https://github.com/blackwaterbread',
  output: 'dist/Enforce-Script-가이드.pdf',
  html: 'dist/Enforce-Script-가이드.html',
  // 경로는 저장소 루트 기준. 생략하면 content: 'content', answers: 'answers'(content 안), figures: 'figures',
  // css: ['styles/book.css'], previewSuffix: ''(--only 미리보기 dist/preview<접미사>.pdf)

  // 표지(kicker·code는 없으면 생략, title·code는 HTML), 판권면, PDF 키워드, 부록 부 이름
  cover: {
    kicker: '한국어 학습서 · 레퍼런스',
    title: 'Enforce Script<br><span>가이드</span>',
    code: [
      '<span class="k">modded class</span> <span class="t">SCR_BaseGameMode</span>',
      '{',
      '\t<span class="k">override void</span> <span class="f">OnPlayerConnected</span>(<span class="k">int</span> playerId)',
      '\t{',
      '\t\t<span class="k">super</span>.<span class="f">OnPlayerConnected</span>(playerId);',
      '\t\t<span class="f">Print</span>(<span class="s">"환영합니다!"</span>);',
      '\t}',
      '}',
    ].join('\n'),
  },
  colophon: {
    // 발행 이력(판권 쪽에 순서대로). 갱신할 때 { label: '갱신', date: '…', note: '무엇을 고쳤는지' }를 더한다
    editions: [{ label: '초판', date: '2026년 10월 17일' }],
    license: '이 책은 크리에이티브 커먼즈 저작자표시-비영리-동일조건변경허락 4.0 국제 라이선스(CC BY-NC-SA 4.0)로 배포됩니다. 책 속 예제 코드는 MIT 라이선스로 자유롭게 쓸 수 있습니다.',
    basis: 'Arma Reforger 1.8 (공식 스크립트 1.8.0.13), Enfusion 엔진',
    sources: 'Bohemia Interactive 커뮤니티 위키(Arma Reforger), Workbench 동봉 엔진 문서, BohemiaInteractive/Arma-Reforger-Script-Diff, BohemiaInteractive/Arma-Reforger-Samples',
    note: '이 책은 비공식 학습 자료이며 Bohemia Interactive a.s.와 관계가 없습니다. Arma, Arma Reforger, Enfusion은 Bohemia Interactive a.s.의 상표입니다. 게임이 업데이트되면 API가 바뀔 수 있으니, 이 책과 실제 동작이 다를 때는 Workbench Script Editor와 공식 스크립트를 기준으로 삼으세요.',
  },
  keywords: ['Enforce Script', 'Arma Reforger', 'Enfusion', 'Workbench', '모딩', '가이드'],
  appendixTitle: '레퍼런스와 해답',

  beforeToc: ['00-greeting.mdx'], // 차례 앞에 들어가고 차례 목록에는 넣지 않는다
  front: ['00-preface.mdx'],

  parts: [
    {
      title: '언어 기초',
      chapters: [
        'ch01-getting-started.mdx',
        'ch02-variables-types-operators.mdx',
        'ch03-control-flow.mdx',
        'ch04-functions.mdx',
      ],
    },
    {
      title: '객체지향과 메모리',
      chapters: [
        'ch05-classes.mdx',
        'ch06-inheritance.mdx',
        'ch07-memory.mdx',
        'ch08-collections.mdx',
        'ch09-strings-vectors-math.mdx',
      ],
    },
    {
      title: '엔진 프로그래밍',
      chapters: [
        'ch10-entities-components.mdx',
        'ch11-events-callbacks.mdx',
        'ch12-modding.mdx',
        'ch13-ui.mdx',
      ],
    },
    {
      title: '멀티플레이어와 실전',
      chapters: [
        'ch14-multiplayer.mdx',
        'ch15-debugging-testing.mdx',
        'ch16-project.mdx',
      ],
    },
  ],

  appendices: [
    'appendix-a-language-reference.mdx',
    'appendix-b-language-comparison.mdx',
    'appendix-c-api-reference.mdx',
    'appendix-d-glossary.mdx',
    'appendix-e-answers.mdx', // 본문 뒤에 answers/chNN.mdx 가 순서대로 이어 붙는다
    'appendix-f-references.mdx',
  ],
  answersAppendix: 'appendix-e-answers.mdx',
};
