# Enforce Script 가이드

Arma Reforger(Enfusion 엔진)의 스크립트 언어 Enforce Script를 한국어로 설명하는 학습서 겸 참고서입니다. 원고는 MDX로 쓰고, 빌드하면 PDF가 출력됩니다.

- 결과물: `dist/Enforce-Script-가이드.pdf` (같은 내용의 HTML: `dist/Enforce-Script-가이드.html`)
- 기준: Arma Reforger 1.8 (공식 스크립트 1.8.0.13)

## 읽기

- 웹판: <https://blackwaterbread.github.io/enfusion-guidebook/> (두 책을 웹에서 읽고 검색할 수 있습니다)
- PDF 내려받기: [Enforce Script 가이드](https://blackwaterbread.github.io/enfusion-guidebook/script/Enforce-Script-%EA%B0%80%EC%9D%B4%EB%93%9C.pdf), [Enfusion Workbench 가이드](https://blackwaterbread.github.io/enfusion-guidebook/workbench/Workbench-%EA%B0%80%EC%9D%B4%EB%93%9C.pdf)

## 빌드

[Bun](https://bun.sh)과 Chrome 또는 Edge가 필요합니다. PDF는 설치된 Chrome/Edge로 인쇄합니다.

```sh
bun install
bun run check          # 원고 검사 (MDX 컴파일 + 형식 규칙)
bun run build          # PDF 생성
```

- `bun src/check.mjs content/ch05-classes.mdx`: 특정 원고만 검사
- `bun src/build.mjs --only=ch05,ap-c`: 일부 장만 `dist/preview.pdf`로 미리보기
- `bun run build:html`: HTML만 생성
- `bun src/build.mjs --book=<설정 파일>`: `book.config.mjs` 대신 다른 책 설정으로 빌드(`check.mjs`도 같은 인자를 받음)
- `bun run check:guide`, `bun run build:guide`: 같은 저장소의 Workbench 가이드(`guide/book.config.mjs`) 검사와 PDF 생성(`dist/Workbench-가이드.pdf`)
- `bun run build:web`: 두 책의 웹판(정적 사이트)과 검색 색인을 `dist/web/`에 생성(`dist/`의 PDF도 함께 복사, 로컬에서 보기는 `bun run serve:web`)

### 배포

`main` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/pages.yml`)가 두 책을 검사하고, PDF 두 권과 웹판을 빌드해 GitHub Pages(<https://blackwaterbread.github.io/enfusion-guidebook/>)에 올립니다. Actions 탭에서 직접 실행할 수도 있습니다. 처음 한 번은 저장소의 Settings > Pages > Build and deployment에서 Source를 "GitHub Actions"로 바꿔 두어야 합니다.

## 구조

```text
enfusion-guidebook/
├─ AGENTS.md            작업을 이어받는 사람을 위한 안내(파이프라인 배경, 근거 자료, 검증된 사실, 남은 일)
├─ book.config.mjs      책 구성(부·장·부록 순서, 제목, 출력 경로)
├─ STYLE.md             원고 작성 가이드(문체, 표준 용어, MDX 규칙, 정확성 원칙)
├─ LICENSE              빌드·도구 코드와 책 속 예제 코드 라이선스(MIT)
├─ LICENSE-CONTENT      원고·그림 라이선스(CC BY-NC-SA 4.0)
├─ content/             원고(MDX)
│  ├─ 00-greeting.mdx   저자 인사말
│  ├─ 00-preface.mdx    머리말
│  ├─ chNN-*.mdx        본문 16장
│  ├─ appendix-*.mdx    부록 A–F
│  └─ answers/chNN.mdx  장별 연습문제 해답(부록 E 뒤에 자동으로 이어 붙음)
├─ guide/               Workbench 가이드 원고(설정 book.config.mjs, 원고 content/, 그림 figures/)
├─ src/
│  ├─ build.mjs         MDX → HTML → PDF (차례 쪽 번호는 PDF 책갈피로 2단계 계산, pdf-lib로 압축·문서 정보)
│  ├─ web.mjs           웹판(dist/web): 장마다 한 쪽, 차례, 검색(Pagefind). web-client.js는 웹판 화면 동작
│  ├─ book.mjs          PDF와 웹판이 함께 쓰는 부분(책 읽기, 표지, 그림 번호)
│  ├─ check.mjs         원고 검사기
│  ├─ mdx.mjs           MDX 컴파일 파이프라인(Shiki 문법 강조, 제목 번호)
│  ├─ components.mjs    학습용 컴포넌트(Objectives, Note, Tip, Exercise …)
│  └─ enforce.tmLanguage.json  Enforce Script 문법 강조 규칙
├─ styles/book.css      A4 인쇄용 디자인
├─ styles/guide.css     Workbench 가이드 디자인(book.css 뒤에 읽음)
├─ styles/web.css       웹판 디자인
├─ licenses/            글꼴 라이선스(OFL) 원문. 웹판에 함께 실음
└─ tools/               근거 자료 검증용 Python (api_lint.py, extract_docs.py — 사용법은 AGENTS.md)
```

## 기여하기

틀린 내용이나 더 나은 설명을 발견하면 직접 고쳐서 풀 리퀘스트를 보내 주세요. 오탈자 한 글자를 고치는 PR도 환영합니다.

예제 코드는 공식 선언과 대조하고 Workbench 1.8.0.13에서 모두 컴파일해 확인했고, 출력이나 동작을 설명하는 곳은 실행해 본문과 맞는지도 확인했습니다. 다만 데디케이티드 서버에서의 동작, 한 번 실행해서는 가를 수 없는 내용(맵의 순회 순서 등)처럼 아직 확인하지 못한 부분이 있습니다. 만약 안 되는 예제를 찾았다면 PR을 보내 주세요.

### PR 전에 확인할 것

1. [STYLE.md](STYLE.md)의 규칙을 따릅니다. 특히 MDX에서는 본문에 `{`, `}`, `<`를 그대로 쓰면 안 됩니다.
2. API 이름과 시그니처는 공식 스크립트([Arma-Reforger-Script-Diff](https://github.com/BohemiaInteractive/Arma-Reforger-Script-Diff))로 확인합니다. 확인할 수 없는 내용은 쓰지 않습니다.
3. 한 주제는 한 장에서만 자세히 다루고, 다른 장에서는 "7장에서 다룹니다"처럼 장 번호로 가리킵니다. 장을 추가하면 `book.config.mjs`에 순서를 넣습니다.
4. `bun run check`가 오류 0, 경고 0으로 통과하는지 보고, `bun run build`로 PDF가 제대로 나오는지 확인합니다.

장 번호, 절 번호(5.1 등), 차례, 머리글, 쪽 번호, 책갈피는 빌드할 때 자동으로 만들어지므로 원고에 직접 쓰지 않습니다.

## 라이선스

- **원고와 그림**(`content/`, `guide/content/`, `guide/figures/`)과 거기서 만든 PDF·웹판: [CC BY-NC-SA 4.0](LICENSE-CONTENT). 출처를 밝히고, 상업적으로 쓰지 않으며, 고친 것도 같은 조건으로 배포하면 자유롭게 쓸 수 있습니다.
- **책 속 예제 코드**(원고의 코드 블록. 인용한 공식 스크립트는 빼고)와 **빌드·도구 코드**(`src/`, `tools/`, `styles/`, 책 설정 파일): [MIT](LICENSE). 예제는 자기 모드나 프로젝트에 가져다 써도 됩니다.
- **글꼴** Pretendard, D2Coding: SIL Open Font License 1.1([`licenses/`](licenses/)).
- 책에 인용한 Arma Reforger 공식 스크립트와 Arma Reforger·Arma Reforger Tools 화면은 Bohemia Interactive a.s.의 것입니다. 이 책은 비공식 학습 자료이며 Bohemia Interactive a.s.와 관계가 없습니다. Arma, Arma Reforger, Enfusion은 Bohemia Interactive a.s.의 상표입니다.
