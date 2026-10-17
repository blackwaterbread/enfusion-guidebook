# AGENTS.md

Guide for agents and developers who pick up work on this project. Written as of 2026-10-08.

## 1. Project overview

- **What it is**: A Korean textbook and reference for Enforce Script, the scripting language of Arma Reforger (Enfusion engine). The MDX manuscript is built into a PDF.
- **Target game**: **Arma Reforger** (current Enfusion), not DayZ. DayZ material and tools have a different API, so do not use them.

## 2. Conventions

- Write the manuscript and project documents in Korean. This file (AGENTS.md) is the exception and stays in English.
- Use **bun** as the JS runtime and package manager.
- **Workbench scope**: this is a Script book. Workbench is covered only as far as needed to run the examples; detailed Workbench usage belongs to the separate Workbench guide in `guide/` (config `guide/book.config.mjs`, styles `styles/guide.css`).

## 3. Directory layout

```text
enfusion-guidebook/
├─ AGENTS.md          this file
├─ README.md          how to build, project structure
├─ STYLE.md           manuscript rules: tone, standard terms, MDX pitfalls, code conventions, accuracy principles
├─ LICENSE          MIT (build and tooling code, example code in the books); LICENSE-CONTENT: CC BY-NC-SA 4.0 (manuscripts, figures, built books)
├─ book.config.mjs    order and titles of parts/chapters/appendices, output paths
├─ content/           MDX manuscript: chNN-*.mdx, appendix-*.mdx, answers/chNN.mdx, 00-greeting.mdx (author's greeting), 00-preface.mdx
├─ guide/             Workbench guide (second book): book.config.mjs, content/ (MDX), figures/
├─ src/               build.mjs (PDF), web.mjs + web-client.js (web edition), check.mjs, mdx.mjs, book.mjs (shared), components.mjs, enforce.tmLanguage.json
├─ styles/book.css    A4 print design
├─ styles/guide.css   Workbench guide styles, loaded after book.css (guide-cover.svg: cover drawing)
├─ styles/web.css     web edition styles
├─ licenses/          font licences (OFL) copied into the web edition
├─ tools/             api_lint.py, extract_docs.py (Python for checking against source material)
└─ dist/              output PDF and HTML; dist/web/ is the web edition
```

## 4. Working on the book

### 4.1 Commands (run from the project root, i.e. the folder with `package.json`)

```sh
bun install
bun run check                         # MDX compile + format rules. Keep it at "오류 0, 경고 0" (0 errors, 0 warnings)
bun run build                         # full PDF (about 20 s)
bun src/build.mjs --only=ch05,ap-c    # only some chapters, into dist/preview.pdf
bun src/check.mjs content/ch05-classes.mdx content/answers/ch05.mdx
bun src/build.mjs --book=<config>     # another book's config instead of book.config.mjs; check.mjs takes --book= too
bun run build:web                     # web edition of both books + Pagefind search index into dist/web (src/web.mjs, styles/web.css; view: bun run serve:web)
```

The PDF is printed with the installed Chrome or Edge. The build uses playwright-core, so no separate browser download is needed. After editing the manuscript, always run check first, then build.

Deployment: a push to `main` runs `.github/workflows/pages.yml` on ubuntu-latest (check and check:guide, both PDFs with the runner's Google Chrome, then build:web) and deploys `dist/web` to GitHub Pages at https://blackwaterbread.github.io/enfusion-guidebook/ (a sub-path, so site links stay relative; Pages source must be "GitHub Actions").

### 4.2 The pipeline and why it is built this way

Read this before changing the structure. These decisions came out of trial and error.

- MDX (`evaluate` from `@mdx-js/mdx`) → React SSR static HTML → Chromium `page.pdf()`. Paged.js is not used.
- Running heads and page numbers use Chromium's native `@page` margin boxes. Each chapter has a named page, and build.mjs generates those `@page` rules.
- Table-of-contents page numbers are filled by printing twice. The bookmarks (outline) of the first PDF are read with pdfjs-dist to get the page number of each heading, and the PDF is printed again with those numbers.
- Chromium only creates bookmarks when `tagged: true`. The tag structure adds a structure element for every syntax-highlighting span, which grows the PDF to 17 MB. So the PDF is re-saved with pdf-lib using object streams, which brings it down to about 11 MB. The same step writes the document info and sets PageMode UseOutlines so the bookmark panel opens with the file.
- Do not put `transform` on elements that repeat across the book (e.g. the TOC leaders). Chromium then paints the transformed layer into every page's content stream and clips it away: the dotted TOC leaders (`border-bottom: dotted`, drawn as 1×1 rects) added 20,000–30,000 rects to each page. Using `position: relative; top: …` instead took the Script book from 12.0 MB to 5.7 MB and the guide from 7.9 MB to 5.2 MB (2026-10-17).
- Fonts are **static** Pretendard woff2 (400–900) and D2Coding.
  - With variable fonts, Chromium embeds them as Type 3 fonts, which hurts quality and file size.
  - Do not use non-standard weights such as 750 or 850 in CSS.
- For inline code, build.mjs inserts `<wbr>` after `/ . ( ,` so lines break only there. The CSS uses `overflow-wrap: break-word`. Switching to `anywhere` makes table columns too narrow and breaks words in the middle.
- Syntax highlighting is Shiki; the `enforce` language uses a hand-made minimal grammar, `src/enforce.tmLanguage.json`.
- In pdfjs-dist v6, use `loadingTask.destroy()`. There is no `pdf.destroy()`.
- When reviewing rendered output with CLI tools such as `pdftoppm`, Korean file names may get garbled depending on the shell. In that case, copy the file to an English name first.

### 4.3 Manuscript rules in brief (details in STYLE.md)

- Write in 합니다체 (formal polite style) and follow the standard-terms table in STYLE.md (e.g. named argument → 이름 있는 인수).
- Never put `{`, `}`, or `<` directly in MDX body text; always wrap them in inline code. Do not use HTML comments or H1 (the chapter title comes from frontmatter `title`). Section numbers are added automatically, so don't write them yourself.
- **Bold followed by a particle**: in `` **`ref`**입니다 ``, where the closing `**` is preceded by punctuation or inline code and immediately followed by Hangul, the bold is not applied. Use `<strong>…</strong>` in that case. Do not work around it by inserting a space before the particle (that is a spelling error). check warns about these spots.
- Code conventions: `TAG_` prefix on user classes, member variables as `m_` + type prefix (`m_iCount`), tab indentation, Allman braces.
- Exercise ids are `chapter-number` (e.g. `5-1`), and answers go in `<Answer id>` in `content/answers/chNN.mdx`. Refer to other chapters only by chapter number.
- Cover each topic in detail in one chapter only; other chapters point to it by chapter number. Chapter order and titles live in `book.config.mjs`.
- Workbench run-steps: one or two sentences at the place they are needed, repeated per chapter (no shared procedure sections to point to). No window lists, shortcut tables, menu-path detail or screen observations; `TryIt` only for multi-step exercises. Exception: the chapter 15 debugger section stays as it is (STYLE.md section 1).

### 4.4 Accuracy principles and source material

Readers of this book often cannot check the English originals, so a wrong API becomes the reader's bug right away. **Every API name and signature is checked against the official scripts before it is written.** If it cannot be confirmed, don't write it; if documents disagree, don't state it as fact.

- **Official game scripts**: BohemiaInteractive/Arma-Reforger-Script-Diff. The book is based on 1.8.0.13 (commit of 2026-09-03).
  ```sh
  git clone --depth 1 -c core.longpaths=true https://github.com/BohemiaInteractive/Arma-Reforger-Script-Diff.git
  ```
  - On Windows, checkout fails without `core.longpaths`.
  - Built-in types are in `scripts/Core/proto/Types.c` (Class, Managed, func, array, set, map) and `scripts/Core/generated/Types/*.c` (string, vector, int, float, bool, typename).
  - Log functions are in `scripts/Core/proto/EnDebug.c` (Print, PrintFormat).
- **Official sample mods**: BohemiaInteractive/Arma-Reforger-Samples. The whole repo is 1.3 GB, so fetch only the scripts.
  ```sh
  git clone --depth 1 -c core.longpaths=true --filter=blob:none --sparse https://github.com/BohemiaInteractive/Arma-Reforger-Samples.git
  git -C Arma-Reforger-Samples sparse-checkout set --no-cone '**/*.c' '**/*.gproj'
  ```
- **Documentation**: use `data/wiki/pages.json` (text dump) and `data/wiki/export.xml` (wiki source) from the enfusion-workbench-mcp repository. Per-page files can be generated with `python -I tools/extract_docs.py <pages.json> <output folder>`.
  - pages.json has the contents of `<...>` stripped (e.g. the `<string>` in `array<string>`), along with some table and keyword names. Look up exact wording in export.xml.
  - Pages whose source is `enfusion` are the engine explanations that ship with the Enfusion Script API docs in the Arma Reforger Tools install folder `Workbench/docs`; they are the most authoritative source. Some pages, however, such as Coding Guidelines, mix in examples from the DayZ era that don't exist in Reforger (`DayZGame`, `itoa`).
  - The online API docs (`community.bistudio.com/wikidata/external-data/arma-reforger/...`) return 403 (bot blocking) to curl and WebFetch.
- **Checking tool**: `python -I tools/api_lint.py <Script-Diff>/scripts content [files...]` extracts identifiers from the manuscript's code blocks and inline code that don't exist in the official code.
  - Most of what remains are names defined in the manuscript itself, file names, prefab names, and comparison code in other languages, so a person has to check each one in context.
  - Classes from the sample mods (`SCR_DrawerUserAction` etc.) are flagged because they aren't in Script-Diff.

## 5. Verified key facts

Confirmed against the 1.8.0.13 official scripts. Use these as the reference when making chapters consistent with each other. Items marked (WB) were confirmed by compiling and running code in Workbench 1.8.0.13 (2026-10-09, 2026-10-10). Items marked (WB GUI) were observed by operating the Workbench 1.8.0.13 GUI (menus, dialogs, panels, clicks, with log lines where stated; 2026-10-10).

- **Call queue**
  - The name is `GetGame().GetCallqueue()` (lowercase q). It appears 1,018 times in the official code; the wiki's `GetCallQueue` is a typo.
  - The signature is `CallLater(func fn, int delay = 0, bool repeat = false, void param1..9)`, with delay in milliseconds (`GameLib/tools.c`).
  - Never call `Clear()` on the shared queue.
- **Logging**
  - `Print(void var, LogLevel level = LogLevel.NORMAL)`.
  - Always pass `PrintFormat`'s log level as a named argument, `level: LogLevel.X`. Passed positionally, it becomes one of the `%N` arguments. The official code has this bug too.
  - Placeholders are `%1`–`%9`; a literal `%` is written `%%`.
  - (WB) `Print(variable)` prints the type and name too: `string name = 'Alpha'`, `int rounds =  24` (tested with local variables only, not members or parameters). An expression or method result prints the value only (`Print("x" + name)`, `Print(obj.GetName())`). `PrintFormat` prints string arguments without quotes, bools as `1`/`0`, vectors as `<1,2,3>`.
- **Components**
  - Make them as a pair of classes: `[ComponentEditorProps(category: "TAG/...", description: "...")] class TAG_XComponentClass : ScriptComponentClass` and `class TAG_XComponent : ScriptComponent`.
  - (WB) A missing companion class is a compile error: `Missing Component Class for 'TAG_XComponentClass' for Component 'TAG_XComponent'`. Entities likewise (`Missing Entity Class`). Widget components (`ScriptedWidgetComponent` family) need no companion class.
  - Lifecycle methods are written like `override void OnPostInit(IEntity owner)`. The parent declares them `event protected`, and only `RplSave`/`RplLoad` return `bool`.
  - Turn on the event mask in `OnPostInit` with `SetEventMask(owner, EntityEvent.FRAME)`, not in the constructor. A component's `EOnActivate` is not called when it is spawned.
  - (WB) A mask set in the component constructor (`SetEventMask(ent, EntityEvent.FRAME)`) still worked: `EOnFrame` ran as many times as with the mask set in `OnPostInit`, for an entity placed in World Editor, a prefab instance, and one spawned from a prefab during Play. The official comment warns against it; the book still recommends `OnPostInit`. Tested: single-player authority, root `GenericEntity`. Untested: components on child entities, dedicated server/proxies.
  - (WB) `EventHandlerManagerComponent` `"OnDestroyed"` fired 45 times for one `SCR_DamageManagerComponent.Kill` of one UAZ469; only the first call passed the vehicle, the rest passed null or other unnamed entities (not identified). Filter in the callback as `SCR_AmbientVehicleSpawnPointComponent` does (`if (m_Vehicle != vehicle) return;`). Tested: `Kill` only, `delayed` true and false. Untested: destruction by shooting or explosion.
- **ScriptInvoker**: declare with `void TAG_XMethod(...); typedef func TAG_XMethod; typedef ScriptInvokerBase<TAG_XMethod> TAG_XInvoker;` and create it on first use inside the getter. Predefined types (`ScriptInvokerVoid`, `ScriptInvokerInt`, etc.) are in `Game/Helpers/SCR_ScriptInvokerHelper.c`.
- **Spawning and deleting**
  - Check `IsValid()` after `Resource.Load`.
  - Fill `EntitySpawnParams` with `TransformMode = ETransformMode.WORLD` and `Transform[3] = pos`.
  - Spawn with `GetGame().SpawnEntityPrefab(res, world, params)`; delete with `SCR_EntityHelper.DeleteEntityAndChildren`.
  - (WB) Right after `DeleteEntityAndChildren(e)`, the local variable, non-`ref` members/statics and non-`ref` array elements that pointed at `e` are already null, in the same call and the same frame, although the `IsDeleted()` comment says the pointer is valid until the end of the frame; no live reference remained to call `IsDeleted()` on. Tested: single-player authority, entities spawned during Play (with and without `RplComponent`), deleted from outside the frame update and from another entity's component `EOnFrame`. Untested: an entity deleting itself (`SCR_LifetimeComponent`), `ref` members, proxies/clients, `delete` and other deletion paths. The book still advises checking `IsDeleted()` as well.
- **Transforms and prefab data** (WB)
  - `CoordToParent`/`VectorToParent` return world coordinates/directions even for a child entity; `CoordToLocal` maps the result back. Use `GetLocalTransform`/`SetLocalTransform` for parent-relative values. Tested: one-level child via Hierarchy, parent unrotated and parent yawed 90° (rotation set in edit mode).
  - Instances of the same prefab whose values were not changed share one prefab data object (companion-class instance from `GetComponentData`). An instance whose values were changed in World Editor (a component value or a companion-class value, via `WorldEditorAPI.SetVariableValue`) gets its own, so companion-class values can differ per instance. Tested in Workbench edit and Play mode; packaged game and dedicated server untested.
  - A property set nowhere in the prefab chain takes the `[Attribute]` `defvalue`, not the type's default (tested: a `float` with `defvalue: "45"` read 45).
  - `AddChild(child, -1)` with the default `EAddChildFlags.AUTO_TRANSFORM` uses the child's previous world position as its local position, so the child moves to parent transform × that position; with `RECALC_LOCAL_TRANSFORM` or `NONE` it stays in place (as the official comment on `RECALC_LOCAL_TRANSFORM` says). Tested: parent yawed 90°, unrotated children (default flag: with and without Hierarchy; `RECALC_LOCAL_TRANSFORM`/`NONE`: with Hierarchy only), during Play, single-player authority. Position only: the children's own rotation was not distinguished, and whether a `RECALC_LOCAL_TRANSFORM`/`NONE` child follows the parent afterwards is untested.
- **JsonApiStruct** (WB): `Pack()` writes only `RegV`-registered members. `ExpandFromRAW()` also fills an unregistered member whose name equals a JSON key, with no warning, also on a fresh never-packed instance, but only if the class registered at least one member; a class with no `RegV` at all fills nothing. Registered names are case-sensitive. Tested with `string` members only. A second operation on the same instance logs `JsonApiStruct :: Operation (Load/ Save/ etc.) called twice above same instance`.
- **Replication**
  - The callback in `[RplProp(onRplName: "OnXChanged")]` is not called on the authority. So the authority calls the callback itself after `Replication.BumpMe()`.
  - (WB, Peer Tool) On a late join, the client's `onRplName` callback fired only for properties the server had changed; a property still at its initial value got no callback. Seen twice (two sessions); whether "changed" means "bumped" or "differs from the initial value" was not separated.
  - RPCs get `[RplRpc(RplChannel.Reliable, RplRcver.Server)]` and are called with `Rpc(Method, …)`. `Rpc` is a `protected` method of GenericEntity/GenericComponent and takes at most 8 arguments.
  - Determine the role with `!rpl.IsProxy()` or `rpl.Role() == RplRole.Authority`. `IsMaster()` does not mean "server".
  - The `RplNode` method is `GetRole()`. `Role()` in the engine docs is the old name.
  - (WB) In Workbench, both edit mode and Play, `RplSession.Mode()` is `RplMode.None`, not `Listen`, and `Replication.IsServer()` is true. Single-player in the game executable untested. With **Server localhost** checked in the Play menu, Play starts an RPL server (`0.0.0.0:2001`) and `Mode()` is `Listen` (WB GUI, 2026-10-17).
  - (WB, Peer Tool listen server + 1 client) A proxy's local write to an `[RplProp]` was replaced by the authority's value when that value changed and replicated. While the authority value stayed the same, `Replication.BumpMe()` did not overwrite it (still different 3.5 s later).
  - (WB, same setup) Right after a kill, in the same frame, the victim's `PlayerController.GetControlledEntity()` was not yet null. Whether a null window exists before respawn is untested (the test mode auto-respawned within 1.8 s).
- **User actions**: `override` without an access modifier.
  - `Init(IEntity pOwnerEntity, GenericComponent pManagerComponent)`
  - `PerformAction(IEntity pOwnerEntity, IEntity pUserEntity)`
  - `CanBeShownScript(IEntity user)`, `CanBePerformedScript(IEntity user)`
  - `GetActionNameScript(out string outName)`
  - (WB, Peer Tool listen + 1 client) On a placed entity without `RplComponent`, a client's action still reached the server's `PerformAction`; chapter 16's `TryTake()` then refused it at its `!m_RplComponent` check.
  - (WB GUI, single-player Workbench Play) The action menu still appeared (seen on screen; log `canPerform=true` for the RigidBody and Model Geometry crates, only indirect log evidence for the UIInfo crate) on crates without `RigidBody`, with `RigidBody` **Model Geometry** off, and with no context `UIInfo`, although Action Context Setup asks for all three. Only the menu was seen: the action was not performed on those crates; multiplayer untested. The book keeps the doc's setup.
- **UI** (WB)
  - A widget handler created with `new` and attached with `Widget.AddHandler` does not get its `[Attribute]` `defvalue`s (a `string` member was `''`), so `TAG_ClickCounterComponent` (chapter 13) attached that way silently never finds its label. Attached through a layout's Script property, the `defvalue` and layout-set values apply. Untested: setting the member in code before `AddHandler`.
  - `MenuManager.IsAnyMenuOpen()` and `GetTopMenu()` ignore dialogs opened with `OpenDialog`: with only dialogs open they return false/null; with a dialog over a menu, `GetTopMenu()` returns the menu. `IsAnyDialogOpen()` sees them. Tested in Workbench Play with dialogs from a menu preset.
  - (WB GUI) `OnChange` on an `EditBoxWidget` (typing `abc`): one call per character with `finished=false`, then one `finished=true` when focus moved to a clicked button. `OnFocusLost` was not observed.
  - (WB GUI) In Workbench Play, clicking a `DbgUI` window's `Check`/`Button` needed a mouse cursor from another open menu (the tester used the group menu); then both worked (logged).
- **Hints and notifications**
  - `SCR_HintManagerComponent.ShowCustomHint(...)` is static and, per its official comment, meant for quick debugging. A hint only appears on the machine that called it.
  - `SCR_NotificationsComponent.SendToEveryone`/`SendToPlayer` return false when not on the server.
  - (WB) `ShowHint()` of the same `SCR_HintUIInfo` while it is shown is always silent (`isSilent |= m_bIsShown && info == m_LatestHint` in `SCR_HintManagerComponent`; observed `silent=1` on the second show, new description in the show event). `ShowCustomHint` creates a new info each time, so it is not silenced this way.
  - (WB GUI) The game setting behind `CanShow()` is **Interface > Prompts > Show context hints** (`m_bShowHints`; same group: Notifications, Show controls hints, Nearby interaction hints). Off: `CanShow()` false, `ShowCustomHint` returned false, no hint; on again: shown. Workbench Play.
- **Arrays and maps**
  - Arrays: `Insert` returns the index it added at, `Find` returns -1 when not found. `Remove(i)` and `RemoveItem(v)` fill the gap with the last element, changing the order; `RemoveOrdered` and `RemoveItemOrdered` keep the order. `InsertAt(value, index)` takes the value first.
  - Maps: `Get` returns the default value when the key is missing. `Find(key, out val)` returns bool; `Set` creates the entry if missing and replaces it otherwise. `ReplaceKey`/`GetKeyByValue` are Obsolete. Iteration order is not insertion order.
- **Strings**
  - `ToLower`, `ToUpper`, `Replace`, `TrimInPlace` modify the original and return an int.
  - `Trim()` and `Substring(start, len)` return a new string; the second argument of `Substring` is a length, not an end position.
  - `Split(delim, out notnull array<string>, bool skipEmpty)` needs the array created beforehand.
- **Language**
  - There is no ternary operator (WB: syntax error). The errors on the ternary line itself are `Broken expression (missing ';'?)` and `Invalid statement ':'`; the accompanying `Syntax error` points at the enclosing class declaration line.
  - `switch` branches on integers, enums, and strings.
  - (WB) A `case` with code and no `break`: if it is the first case of the `switch`, compile error `Switch: fall through cases can't have a body`; any later case compiles and falls through into the next case like C.
  - (WB) `do-while` is not supported (syntax error).
  - (WB) An executable statement outside any function is a syntax error (tested: `Print("Hello");` at the top of a file). Declarations such as global variables are allowed (`ArmaReforgerScripted g_ARGame;` in `game.c`).
  - (WB) Assigning a `string` to an `int` only warns ("yields a conditional expression result of either 0 or 1") and stores 0 or 1.
  - (WB) `int / int` is evaluated as float division where the result is received as `float`: a `float` variable declaration or assignment, a script function's `float` parameter, a `return` in a function returning `float` (`float r = 7 / 2;` is 3.5). Received by an `int` variable (incl. `out int`) or passed directly to `Print`/`PrintFormat`, it truncates (3). The same holds for a parenthesized subexpression: `Math.PI2 * (i / count)` with `i` 1 and `count` 4 is 1.5708 in a `float` variable but 0 passed directly to `Print`/`PrintFormat`. The wiki Operators page's "`5 / 3; // result is 1 (int)`" holds only for the truncating cases. Untested: `/=`, string `+`, comparisons, mixed sums such as `a / b + 0.5`, negative operands, engine (`proto`) `float` parameters.
  - (WB) Missing return on some path of a non-void function is a compile error (tested: an `if` without `else`; the message is `No return statement in function returning non-void '…'`).
  - Method overloading works. (WB) Overloaded global functions also compile and dispatch by argument type.
  - `override` is required, and parameter names must match the parent's too (WB: `argument name 'range' differs from prototype 'distance'`).
  - (WB) Named arguments work, including reordering and `ToInt(default: 17)`.
  - (WB) `new X().Method()` does not compile (`Broken expression (missing ';'?)`); store the object in a variable first.
  - Since 1.1.0, `this` inside a static method refers to the class, not an object. (WB) Non-static `const` members are usable from static methods.
  - `debug;` sets a Script Editor breakpoint.
  - (WB) A `#define` in one file also applied to another file of the same module in testing; still write it in every file that uses it.
- **Memory** (all WB)
  - In the Game module, classes that declare no parent are reference-counted like `Managed` (compared: destructor runs, weak references become null).
  - Assigning a freshly created object (`new`, `{}`) to a weak (non-`ref`) member (tested: assigned inside its own class), static variable (tested with `new` only), or member initializer is a compile error: `Variable 'X' is not strong ref (missing 'ref'?)` (with `{}`: `(missing 'ref' keyword?)`). Via a method's return value, or into a collection whose element type lacks `ref`, it compiles and the object is freed immediately.
  - A non-`ref` parameter does not keep its object alive: if the other strong references are dropped inside the method, the object is destroyed and the parameter becomes null. The engine ARC doc says function arguments are strong references. If the caller holds the object (e.g. in a local variable), it survives the call. (tested: object held only by another object's `ref` member, passed as `holder.m_Held`. A `new` object passed directly survived the call; cause not isolated. `ref` parameters untested; none found in the official scripts.)
  - `delete` destroys immediately and nulls the variable and weak references, but if any other strong reference exists (even a local variable) it raises a VM exception `Can't delete instance ... with non-zero references` and does not destroy.
  - `ref` cycles are never freed.
  - `typename.Spawn()` returns null when a parent class's constructor is `protected`, even if the child's constructor is public.
- **Modding** (WB)
  - A `modded` class can `override` a `private` method of the original and it replaces it.
  - A `modded` class's constructor/destructor run in addition to the original: original ctor → modded ctor; modded dtor → original dtor.
  - `vanilla.Method()` calls the unmodded original, skipping other mods in the chain.
  - An override may drop the parent's default parameter value: `override void AddSuicide(int playerId, int count)` for `AddSuicide(int playerId, int count = 1)` compiled with no warning (the Game module, incl. official one-argument calls, compiled). Tested in a `modded` class only, compile only; a one-argument call into such an override was not run.
- **ScriptInvoker** (WB): `Insert` with a callback whose parameter type differs (tested: `string` vs `int`) is a compile error (`Callback method ... is not compatible with prototype`), not just a warning as the wiki says.
- **Testing** (WB)
  - TearDown runs even when Setup fails: a `Setup` step calling `SetFailure(TestFailureBase)` skips the remaining `Setup` and `Main` steps, then `TearDown` runs. The official comment in `GameLib/tests/TestingFramework.c` says TearDown is not called. A `Main` failure skips the remaining `Main` steps and runs `TearDown`. Tested twice, `TestHarness` run directly; untested: a `Setup` failure by timeout or VME (a `Main` timeout did run `TearDown`), the same through the Autotest plugin/Tool.
  - An Autotest suite (`SCR_AutotestSuiteBase`) runs only in Play mode, even for pure calculation tests: nothing runs in edit mode, the case starts after Play starts, and a suite that does not override `GetWorldFile()` first switches to the default Autotest world. Tested: the plugin's `SCR_TestRunner.InitRunner` path and `-autotest <SuiteClass>` in Workbench (Play started by hand); the plugin and Autotest Tool call `SCR_AutotestHelper.SwitchToGameMode()` themselves (source only; the Tool's New Process option instead launches the game exe with `-autotest`). A `-autotest` run writes `junit.xml` and then calls `GetGame().RequestClose()` (default end action EXIT), which in Workbench only ended Play mode. Untested: running from the Autotest Tool panel (opened only), `-autotest` with a group config or a case class, the game executable; (WB GUI) the plugin's F4 ran a suite and showed `Test result SUCCESS`.
- **Shortcuts** (WB GUI, Script Editor menu labels; Workbench-guide facts, some of which the Script book also uses, e.g. in run-steps and chapter 15)
  - Build: **Validate Scripts** F7, **Validate and Reload Scripts** Shift+F7 (the wiki's "Compile and Reload Scripts"; the book uses the menu name), **Reload Scripts** Ctrl+Shift+F7.
  - Debug: Continue F5, Step Into F11, Step Over F10, Step Out Shift+F11, Stop Shift+F5, Toggle Breakpoint F9, Recompile File on Host Ctrl+F7, Console Execute F6. Plugins: Autotest F4.
  - Pressed and working: F4, F5, F9, F10, Shift+F7 (in Script Editor: the log shows `Reloading game scripts` and `Script validation`).
- **Workbench UI** (WB GUI; Workbench-guide facts, as for Shortcuts)
  - Launcher: new project via **Add Project** ▾ > **Create New Project** (same menu: Add Existing Project, Scan for Projects). The New Project dialog has Project Name, Location, Dependencies (ArmaReforger checked and greyed) and **Create**/**Cancel**.
  - Main window menus: File Editors View Edit Window Utilities Plugins Help (no "Workbench" menu); **Options...** is in File. Script Editor menus: File Edit Build Debug Window Bookmarks Plugins Help; the panel list is the **Window** menu.
  - The console panel is **Remote Console** (tab and Window menu; no "Console", no "Text Editor"). With the Game environment, **Run** printed to Output with no world loaded and no Play (scripts are compiled at Workbench start), and also during Play.
  - Resource Browser double-click: `.et`, `.conf`, `.layout` open as tabs in the main window (the `.et` tab has an **Edit Prefab** button; pressed on 2026-10-11, see the Override in item below); `.c` opens in Script Editor, `.ent` in World Editor. (WB GUI, 2026-10-11) `.ct` also opens as a main-window tab (a property table; one base-game `.ct` opened from the main window's Resource Browser, no World Editor window appeared; from World Editor's Resource Browser untested).
  - `RplComponent` properties: Enabled, Self Insert, Rpl State Override, Parent Node From Parent (label cut off as 'Parent Node From Par…'), Spatial Relevancy, Streamable, Auto Hierarchy, Runtime Only. No "Recursive" (the name in `RplDocs.c`); whether Auto Hierarchy is the same thing is untested.
  - VME dialog **Virtual machine exception**: Debug / Ignore / Ignore All / Show Details... (seen once: fresh Workbench, edit mode, Script Editor never opened). Ignore continued with the next line of the function. In a session where Script Editor had been opened (also after closing it), every VME, including `Debug.Error()`, showed only a toast `Virtual Machine Exception occurred! Check log for more info.` plus the log. There, `Debug.Error(msg)` was logged as a VME with `Reason: msg` and execution continued; its dialog in a fresh session is untested. (WB GUI, 2026-10-11, from the 2026-10-10/11 logs) Every VME block in the log (dialog and toast-only sessions, edit mode and Play, `Debug.Error` included; ten blocks in three session logs checked) has `Reason:` followed by `Stack trace:` and `file:line Function name` lines.
  - Errors panel groups under `Configuration WORKBENCH`: Errors, Warnings, Hints (info icon, e.g. `Variable 'key' can be const`).
  - Resource Browser right-click, **Addons** section: **Override in '<addon>'**, **Duplicate to '<addon>'**, **Inherit in '<addon>'** (base-game prefab; the tester saw the same for a sound file). No "Replacement" item (Replacement is a Data Modding Basics concept). What Override in does for a sound is untested (not pressed). On an original already overridden in the working addon (`chimeraMenus.conf`), Override in is absent and **Navigate to Override** is enabled, as the doc says.
  - Diag Menu (opened with Win+Alt during Play): `Statistics > Script profiler` cycles off → frame → average → memory → off (screenshot shows off only; the rest is the tester's report). The wiki's `continuous` is not among them.
  - Debugger: a breakpoint on the last statement of `OnPostInit` stops before it runs (Watch: `this` expands to members, `m_RplComponent = NULL`; parameters show without adding a watch). Step Over there (menu and F10) did not stop again; the game continued. A Breakpoints entry existed for a `debug;` line; unchecking it made `debug;` not stop, rechecking made it stop again. How that entry was created is unknown. The entry showed the same red dot as an F9 breakpoint, so whether `debug;` alone stops was not shown.
  - (WB GUI, 2026-10-11) Main window **File** has **Project Settings...** besides **Options...**. Project Settings holds the project's ID, GUID, TITLE, **Dependencies** (list with +) and, per configuration, module settings such as Modules > **Widget Manager Settings** > **String Tables**. **Options...** has only General, World Editor, Animation Editor, Script Editor, Audio Editor, Behavior Editor and Shortcuts: no project, dependency or Widget Manager settings, although the wiki (Resource Manager: Options, Mod Localisation) puts them under Options. Both dialogs were closed with Cancel; adding a dependency or string table was not tried.
  - (WB GUI, 2026-10-11) The wiki's name "Config Editor" is not on screen: with a `.conf` open as a main-window tab (the tab is named after the file), it appeared in none of the window title (`Enfusion Workbench - Book Examples`, the project TITLE), the tab, the status bar or the eight main-window menus (Editors: World, Particle, Animation, Script, Audio, String, Procedural Animation, Behavior Editor; submenus not expanded).
  - (WB GUI, 2026-10-11) World Editor Object Properties of a prefab instance shows in bold only what was changed on that instance (Coords; after Capacity was set 3 → 7 through the NET API, that property and its component's name, with a revert arrow); Undo restored normal weight. A main-window property table did the same (a `.ct` showed the values it sets in bold). Only the instance level was checked.
  - (WB GUI, 2026-10-11) **Override in '<addon>'** on base-game `Prefabs/Characters/Core/DefaultPlayerController.et` created that path with the same GUID in the addon. The overridden prefab's main-window tab offered only **Edit Prefab** (no component editing in the visible panels), which opened `World Editor - Prefab edit mode`; there **+ Add Component** added `TAG_GeneratorRequestComponent` and **File > Save Prefabs** (Ctrl+S) wrote a diff file listing only that component, the same form as the hand-made override that applied to `DefaultPlayerControllerMP.et` in session A. The GUI-made file was not run in a game mode; all created files were deleted.
  - (WB GUI, 2026-10-11) Drag and drop in World Editor (from its Resource Browser): a base-game `.xob` onto the viewport created an unnamed `GenericEntity` (Hierarchy shows `GenericEntity_N`) with a `MeshObject` whose Object is that model; a `.conf` onto an empty object property (`[Attribute()] protected ref TAG_LootTableConfig m_LootTable;`, shown as `set class`) filled it with that config, entries included. Dragging a root entity from Hierarchy onto a Resource Browser folder opened **New entity prefab** ("Enter new prefab name", OK/Cancel) and created `<name>.et`; the extension is appended even when typed (`X.et` became `X.et.et`). The world was not saved.
  - (WB GUI, 2026-10-11) A `.layout` tab has a **Hierarchy** panel (Name, #, Class); double-clicking a widget there renames it in place, and Properties **Name** follows. Not saved.
  - (WB GUI, 2026-10-11) Property labels: a `chimeraMenus.conf` Menu Presets entry has Layout, Action Context, Class, Menu Items, Preload Count, Persistent. A `Notifications.conf` entry has Notification Key, Priority Notification, Add Friendly Indicator and Info (a class slot; `set class` offers `SCR_ColoredTextNotificationUIInfo`, `SCR_SplitNotificationUIInfo`, `SCR_UINotificationInfo`; inside: Name, Description, Icon, …). `ActionsManagerComponent` has Action Contexts (`UserActionContext`: UI Info, Context Name, Position) and Additional Actions (+ opens a class chooser; searching `TAG_Take` found `TAG_TakeSupplyAction`); an action's UI Info has Name. Seen on existing entries and on an unsaved new `Notifications.conf` entry.
  - (WB GUI, 2026-10-11) Script Editor: Ctrl+click on a symbol (`ScriptComponent` in a user script) opened the official file declaring it (`ScriptComponent.c`, read-only) in a new tab at the declaration line.
  - (WB GUI, 2026-10-11) Diag Menu: `GameCode` has submenus **User Actions** (Log actions, Context position, …) and **Network** (Log ownership changes). `UI` has **Disable Loc** directly (no `Disable` submenu; the wiki's Mod Localisation says `UI > Disable > Disable Loc`); true showed every UI text as its `#` key, false localized it again. These menus were opened with Remote Console `DiagMenu.SelectMenuByName("<name>")` plus Win+Alt, not by navigating from the top list.
  - (WB GUI, 2026-10-10 session A record, judged 2026-10-11) Peer Tool settings (**Configure Peer tool**) have **Executable** at the top; set to the game's `ArmaReforgerSteamDiag.exe`, **Server localhost + PeerTool** ran it with `-client` and the peer joined. Only this setting is recorded: the default (`game.exe` in `PeerTool.c`) was not tried, so whether peers then fail to start is source-only.
- **Obsolete in 1.8**
  - JSON: `SCR_JsonSaveContext`, `SCR_JsonLoadContext`, `ExportToString`, `ImportFromString` → `JsonSaveContext`, `JsonLoadContext`, `SaveToString`, `LoadFromString`.
  - The names on the wiki's Autotest page (`[Step(EStage…)]`, `SCR_AutotestResult`) are outdated too. The actual names are `[TestStep(TestStage…)]`, `[Test(suite: …)]`, `AssertTrue`, `SetFailure`.

## 6. Background: Language Server research (2026-10-08)

Research done before this book was started. It isn't needed for the book itself, but it relates to the LSP section in chapter 1 and is the starting point if LS work resumes.

- **There is an official LSP.** It ships as an experimental feature inside the Workbench Script Editor.
  - Enabling it: turn it on in the Workbench options and the editor connects over TCP. Command-line options are `-lsp` (start the LSP server when Workbench starts) and `-lspPort PORT` (default 5776).
  - VS Code side: install the WIP extension `lsp-enforcescript-extension` from a VSIX. Where it is distributed is not documented.
  - Features: diagnostics, completion, signature help, hover including Doxygen comments, go to definition / type definition / implementation.
  - Limitations: Workbench must be running, accurate diagnostics only appear after saving the file, and the Script Editor may write files being edited to disk.
  - Sources: engine docs Language Server Protocol, Features, Visual Studio Code configuration, Command line interface.
- **Third-party (targeting Reforger)**
  - Reforger Script Tools (`burn0ut7/reforger-script-tools`, Marketplace `Burn0ut7.reforger-script-tools`): a Rust LS plus VS Code extension, the most complete option. It indexes the base game API from the installed game and Workbench.
  - `fliqqs/arma-reforger-lsp`: small and inactive since 2026-03.
  - DayZ-only tools (yuval Enfusion Script, EnScript IDE, devz-tools/enforce-script-lsp, etc.) do not apply.
  - tree-sitter grammars: `simonvic/tree-sitter-enforce` (MIT), `Reidond/tree-sitter-enfusion`.
- **If you need API data without installing the game**: the `data/api` index in enfusion-workbench-mcp is missing lowercase built-in types (string, vector, array, map, set, etc.), global functions (Print, GetGame), and enum values. The cause is that the scraper only reads `^interface[A-Z].*\.html$` (`src/scraper/index.ts`). The official Script-Diff repository has all of this.

## 7. enfusion-workbench-mcp (MCP server)

- Repository: https://github.com/Goldwep/enfusion-workbench-mcp. Clone it separately outside this project; installing dependencies runs the `prepare` script, which also builds it.
- Registering with Claude Code (optional): `claude mcp add --scope user enfusion-workbench-mcp -- node <clone path>/dist/index.js`. User scope makes it available in every project folder. Check the connection with `claude mcp get enfusion-workbench-mcp`.
- Works without Steam: `api_search`, `wiki_search`/`wiki_read`, `wb_knowledge`, and the `script_*` tools.
- Needs Arma Reforger Tools: the other `wb_*` (live Workbench) tools, building mods, reading game data.
