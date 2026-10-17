# 원고 작성 가이드

이 책(Enforce Script 가이드)의 원고를 쓰거나 고칠 때 따르는 규칙입니다. 부·장·부록의 순서와 제목은 `book.config.mjs`에 있습니다.

## 1. 독자와 목표

- **독자**: Python이나 JavaScript(일부는 C#)로 프로그래밍해 본 개발자. Enforce Script와 Arma Reforger 모딩은 처음입니다.
- **두 가지 쓰임**: 처음부터 차례대로 읽는 **학습서**이면서, 나중에 필요한 부분을 찾아보는 **참고서**입니다. 설명은 친절하게 쓰되 표, 정리 상자, 부록처럼 다시 찾아보기 쉬운 형태도 함께 둡니다.
- **기준 버전**: Arma Reforger 1.8 (공식 스크립트 1.8.0.13). 다른 버전 이야기는 꼭 필요할 때만 합니다.
- **Workbench 범위**: 이 책은 Script 책이므로 Workbench는 예제를 실행하는 데 필요한 만큼만 씁니다. 자세한 사용법은 같은 저장소의 《Enfusion Workbench 가이드》(`guide/`)가 맡습니다.
  - 실행 절차는 필요한 그 자리에서 한두 문장으로 씁니다(예: "테스트 월드를 열고, 엔티티에 이 컴포넌트를 추가한 다음 Play를 눌러 로그를 확인합니다."). 같은 절차가 여러 장에 나오면 장마다 다시 쓰고, 공통 절차 절을 따로 만들어 가리키지 않습니다.
  - 창 목록, 단축키 표, 메뉴 경로 세부, 화면 관찰("1.8.0.13에서 눌러 보니 탭으로 열렸다" 같은 것)은 쓰지 않습니다. 버튼과 창 이름은 절차 문장에 꼭 필요할 때만 씁니다.
  - 스크립트가 Workbench에 미치는 효과(`[Attribute]`가 속성 창에 나타나는 것 등), 스크립트 실행에 꼭 필요한 데이터 설정(액션 컨텍스트 이름, `chimeraMenus.conf` 항목 이름 등), 파일 형식과 폴더, 시작 매개변수, 로그 파일 위치는 씁니다.
  - 예외: 15장 디버거 절(브레이크포인트, 버튼 표, 실습)은 지금대로 둡니다.

## 2. 문체

- **합니다체**로 씁니다. 문장은 짧게 쓰고, 한 문단은 3~5문장 정도로 맞춥니다.
- 번역투를 피합니다. "~에 대해", "~를 통해", "~하는 것이 가능합니다", 불필요한 피동("~되어지다")을 남발하지 않습니다.
- 개념 → 예제 → 설명 → 주의점 순서가 기본입니다. 코드를 보여주기 전에 무엇을 하는 코드인지 한 문장으로 먼저 말합니다.
- 독자가 아는 언어(Python/JS/C#)와 비교하면 이해가 빨라지는 곳에서만 `<Compare>`를 씁니다. 모든 절에 넣지는 않습니다.
- 과장하거나 감탄하지 않습니다("강력한", "놀라운" 같은 수식어 금지). 이모지도 쓰지 않습니다.
- 용어는 처음 나올 때 `참조 카운팅(Reference Counting)`처럼 영어를 함께 쓰고, 그 뒤로는 한국어만 씁니다.
- 코드 식별자, 키워드, 파일 이름은 영어 그대로 인라인 코드로 씁니다: `modded`, `ref`, `SCR_BaseGameMode`, `addon.gproj`.
- Workbench 화면의 메뉴와 버튼 이름은 영어 그대로 굵게 씁니다: **Script Editor**, **Resource Browser**, **Build > Validate and Reload Scripts**.

## 3. 표준 용어

모든 장에서 같은 번역어를 씁니다. 표에 없는 용어는 업계에서 흔히 쓰는 한국어 표기를 따릅니다.

| 영어 | 이 책의 표기 |
|---|---|
| Enforce Script / Enfusion | Enforce Script(언어) / Enfusion 엔진 — 번역하지 않음 |
| Workbench, Script Editor, World Editor, Resource Browser | 영어 그대로 |
| addon / mod | 애드온(프로젝트 구조를 말할 때) / 모드(일반적으로) |
| class, object, instance | 클래스, 객체, 인스턴스 |
| member variable, method, function | 멤버 변수, 메서드, 함수 |
| parameter, argument, return value | 매개변수, 인수, 반환값 |
| named argument | 이름 있는 인수 |
| constructor, destructor | 생성자, 소멸자 |
| inheritance, parent/child class | 상속, 부모 클래스/자식 클래스 |
| override, overload | 오버라이드, 오버로드 |
| cast | 형변환 |
| access modifier | 접근 제한자 |
| reference / strong / weak reference | 참조 / 강한 참조 / 약한 참조 |
| (automatic) reference counting | (자동) 참조 카운팅(ARC) |
| garbage collection | 가비지 컬렉션 |
| enum, typedef, template | 열거형(enum), 타입 별칭(typedef), 템플릿 |
| array, set, map | 배열, 집합(set), 맵(map) |
| entity, component, prefab, world | 엔티티, 컴포넌트, 프리팹, 월드 |
| attribute (`[Attribute]`) / property | 어트리뷰트 / 속성 |
| event, callback, handler | 이벤트, 콜백, 핸들러 |
| ScriptInvoker, call queue | ScriptInvoker(그대로), 콜 큐 |
| replication, authority, proxy, owner | 리플리케이션, 권한자(Authority), 프록시(Proxy), 소유자(Owner) |
| RPC | RPC(원격 프로시저 호출) |
| server, client, dedicated server | 서버, 클라이언트, 데디케이티드 서버 |
| game mode, user action | 게임 모드, 사용자 액션 |
| widget, layout | 위젯, 레이아웃 |
| breakpoint, debugger, profiler | 브레이크포인트, 디버거, 프로파일러 |
| compile, preprocessor, scope | 컴파일, 전처리기, 스코프 |
| modded class, vanilla | modded 클래스, 바닐라(원본) |
| resource, GUID, config | 리소스, GUID, 설정 파일(config) |

## 4. 장 구조

각 장 파일(`content/chNN-*.mdx`)은 다음 틀을 따릅니다.

````mdx
---
title: 클래스와 객체
description: 이 장에서 무엇을 배우는지 한두 문장으로 씁니다. 장 제목 아래 작게 표시됩니다.
---

<Objectives>

- 학습 목표 3~5개. "~할 수 있다" 형태로 씁니다.

</Objectives>

도입 문단 1~2개: 이 장이 왜 필요한지, 앞 장과 어떻게 이어지는지.

## 첫 번째 절

### 소제목

...

## 정리

<Summary>

- 이 장의 핵심 5~8개

</Summary>

## 연습문제

<Exercise id="5-1" level="기초" title="...">

문제

</Exercise>
````

- 장 제목(H1)과 번호는 빌드할 때 자동으로 붙습니다. 원고에는 **`#`(H1)을 쓰지 않습니다.**
- 절은 `##`, 소제목은 `###`, 그 아래는 `####`까지 씁니다. `##`에는 "5.1" 같은 번호가 자동으로 붙으니 **번호를 직접 쓰지 않습니다.**
- 마지막 두 절은 항상 `## 정리`와 `## 연습문제`입니다.
- 공식 문서를 더 읽을 거리로 소개하고 싶으면 `## 정리`의 `<Summary>` 아래에 "더 읽을거리" 목록을 둡니다(영어 링크).
- 한 주제는 한 장에서만 자세히 다루고, 다른 장은 **장 번호로만** 가리킵니다("7장에서 자세히 다룹니다"). 다른 장의 절 번호는 바뀔 수 있으니 쓰지 않습니다.
- 분량은 장마다 MDX 18~35KB, A4로 8~14쪽 정도를 목표로 합니다.

## 5. MDX 문법 주의 (컴파일 오류 방지)

MDX는 Markdown에 JSX가 섞인 형식이라 일반 Markdown과 다른 점이 있습니다.

1. **본문에 `{` `}`를 그대로 쓰면 안 됩니다.** JSX 표현식으로 해석됩니다. 인라인 코드(`` `{ }` ``)나 코드 블록 안에만 씁니다.
2. **본문에 `<`를 그대로 쓰면 안 됩니다.** `array<int>`, `a < b` 같은 표현은 반드시 인라인 코드로 감쌉니다. 부등호를 글로 쓸 때는 "작다/크다"로 풀어 씁니다.
3. HTML 주석 `<!-- -->`는 쓸 수 없습니다. 주석이 필요하면 `{/* ... */}`를 씁니다.
4. 컴포넌트 안에 Markdown을 쓸 때는 **여는 태그 다음과 닫는 태그 앞에 빈 줄**을 둡니다. 태그는 줄 맨 앞에서 시작합니다.
5. 컴포넌트 안에 제목(`##`, `###`)을 두지 않습니다.
6. 표는 GFM 표 문법을 씁니다. 표 칸 안의 `|`는 `\|`로 씁니다.
7. raw HTML 태그(`<br>`, `<div>`)는 쓰지 않습니다. 예외는 아래 9번의 `<strong>`뿐입니다.
8. import/export 문은 쓰지 않습니다. 컴포넌트는 따로 불러오지 않아도 됩니다.
9. **굵게 뒤에 조사가 붙을 때 주의합니다.** 닫는 `**` 바로 앞이 문장부호나 인라인 코드이고 바로 뒤에 한글이 오면(`` **`ref`**입니다 ``, `**(예)**는`) 굵게가 적용되지 않고 별표가 그대로 찍힙니다. 이럴 때는 `` <strong>`ref`</strong>입니다 ``처럼 `<strong>`으로 감쌉니다. 검사기가 이런 곳을 경고로 알려 줍니다.

## 6. 컴포넌트

| 컴포넌트 | 쓰임 |
|---|---|
| `<Objectives>` | 장 첫머리 학습 목표(글머리표 목록) |
| `<Note title="...">` | 참고. 알아 두면 좋은 배경 정보 |
| `<Tip title="...">` | 팁. 더 나은 방법 |
| `<Warning title="...">` | 주의. 놓치면 버그가 나거나 데이터가 깨지는 것 |
| `<Pitfall title="...">` | 흔한 실수. 초보자가 자주 하는 실수와 그 이유, 고친 코드 |
| `<Compare title="...">` | 다른 언어와 비교. 안에 언어별 코드 블록을 차례로 둠 |
| `<TryIt title="...">` | 직접 해보기. 단계가 여럿인 Workbench 실습에만 씀(한두 문장으로 끝나면 상자 없이 본문에) |
| `<Summary>` | `## 정리` 안의 핵심 정리 목록 |
| `<Exercise id="장-번호" level="기초\|응용\|도전" title="...">` | 연습문제 |
| `<Answer id="장-번호">` | 해답(`content/answers/chNN.mdx`에서만 사용) |
| `<Kbd>Ctrl</Kbd>` | 키보드 키 |

`title`은 생략할 수 있습니다. 상자는 한 쪽에 두세 개를 넘지 않게 씁니다. 상자가 너무 많으면 본문 흐름이 끊깁니다.

## 7. 코드 예제

- 코드 블록에는 항상 언어를 씁니다: `enforce`, `python`, `javascript`, `csharp`, `json`, `text`(출력 결과나 폴더 구조).
- 파일 하나를 통째로 보일 때는 경로를 제목으로 붙입니다: ```` ```enforce title="Scripts/Game/TAG_HealthComponent.c" ````
- 줄 번호가 필요하면 `showLineNumbers`를 붙입니다(본문에서 "7번째 줄"처럼 가리킬 때만).
- 특정 줄을 강조할 때는 줄 끝에 `// [!code highlight]`, 바뀐 부분을 보일 때는 `// [!code ++]`, `// [!code --]`를 붙입니다. 이 표시는 출력에서 지워집니다.
- **공식 컨벤션을 따릅니다** (`bi-wiki__Scripting_Conventions.md`):
  - 직접 만드는 클래스에는 `TAG_` 접두사를 붙입니다(`TAG_HealthComponent`). 1장에서 TAG를 자기 태그로 바꿔 쓰라고 설명합니다.
  - 멤버 변수는 `m_` + 타입 접두사 + PascalCase: `m_iCount`, `m_fSpeed`, `m_bEnabled`, `m_sName`, `m_vPosition`, `m_eState`, 객체는 `m_Entity`처럼 타입 접두사 없이 씁니다. 정적 변수는 `s_`, 상수는 `UPPER_SNAKE_CASE`.
  - 메서드는 PascalCase, 매개변수와 지역 변수는 camelCase.
  - 들여쓰기는 탭, 중괄호는 새 줄에 둡니다(Allman 스타일). 키워드 뒤와 이항 연산자 양옆에 공백을 둡니다.
- 코드 주석은 한국어로 써도 됩니다. 한 예제는 40줄 이하로 쓰고, 길어지면 나눠서 설명합니다.
- 실행 결과는 ```` ```text ```` 블록에 보이고, 바로 앞 문장에서 "실행 결과는 다음과 같습니다"처럼 알려 줍니다.
- 일부만 보여 줄 때는 `// ...`로 생략을 표시합니다.

## 8. 정확성 원칙 (가장 중요)

이 책을 읽는 사람은 영어 원문을 확인하기 어렵습니다. 틀린 내용은 곧바로 버그가 됩니다.

1. **모든 API 이름과 시그니처는 공식 스크립트에서 확인합니다.** 클래스, 메서드, 매개변수 순서와 타입, 열거형 값, 반환 타입을 확인한 뒤에만 씁니다.
2. **언어 규칙은 엔진 문서와 위키로 확인하고, 공식 코드에서 실제 사용례도 찾습니다.** 문서와 코드가 다르면 코드를 따릅니다.
3. **확인하지 못한 내용은 쓰지 않습니다.** 꼭 필요한데 확인이 안 되면 원고에서 빼고 작업 보고에 남깁니다. "버전에 따라 다를 수 있습니다"로 얼버무리지 않습니다.
4. 위키 덤프는 HTML을 텍스트로 바꾸는 과정에서 `<...>` 안의 내용(`array<string>`의 `<string>` 등)과 표의 키워드 이름 일부가 지워졌습니다. 위키 예제 코드를 그대로 옮기지 말고 공식 코드와 대조합니다.
5. 엔진 문서 일부(특히 Coding Guidelines)는 DayZ 시절 예제(`DayZGame`, `itoa` 등)를 담고 있습니다. Reforger 공식 스크립트에 실제로 있는지 확인하고, 없으면 쓰지 않습니다.
6. 예제 코드는 **실제로 컴파일될 수 있게** 씁니다. 존재하는 API만 쓰고, `override`하는 메서드는 부모에 실제로 있는지와 시그니처가 같은지 확인합니다.
7. 개념 설명에서 엔진 내부 동작을 추측하지 않습니다. 문서에 근거가 있는 것만 씁니다.

## 9. 검사

원고를 저장할 때마다 검사합니다(프로젝트 루트, 즉 `package.json`이 있는 폴더에서 실행).

```text
bun src/check.mjs content/ch05-classes.mdx content/answers/ch05.mdx
```

오류(ERROR)는 반드시 고치고, 경고(warn)도 가능하면 없앱니다. 전체 PDF는 `bun run build`로 만듭니다(결과: `dist/Enforce-Script-가이드.pdf`).
