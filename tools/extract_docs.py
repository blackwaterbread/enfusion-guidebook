"""Extract scripting-related wiki/engine doc pages into one Markdown file per page (+ INDEX.md).

usage: python -I extract_docs.py <enfusion-workbench-mcp/data/wiki/pages.json> <out_dir>
pages.json comes from the enfusion-workbench-mcp repo. The text there is an HTML->text dump that
lost content inside <...> and some table cells; for exact wording use data/wiki/export.xml (raw wikitext).
"""
import json, re, sys, os
pages_json, out_dir = sys.argv[1], sys.argv[2]
WANT = """Syntax|Values|Keywords|Operators|Coding Guidelines|Enforce Automatic Reference Counting|Event System|Script Testing Framework|Loadtime and Runtime|World Systems|Input System|Menu System|Replication|Replicating entities, components and hierarchies|RplNode|Language Server Protocol|Features|Visual Studio Code configuration|File Types and Extensions|Command line interface (CLI)
Enforce Script Syntax|From SQF to Enforce Script|Scripting First Steps|Scripting Example|Scripting Modding|Scripting Temporary Feature|Scripting Conf File Usage|Scripting: Automatic Reference Counting|Scripting: Best Practices|Scripting: Config Object|Scripting: Conventions|Scripting: Do's and Don'ts|Scripting: JSON|Scripting: Keywords|Scripting: Operators|Scripting: Performance|Scripting: Preprocessor Directives|Scripting: Preprocessor Macros|Scripting: Values
Script Editor|Script Editor Plugin|Script Editor: Autocomplete Plugin|Script Profiling|ScriptInvoker Usage|Object Oriented Programming Basics|Object Oriented Programming Advanced Usage|Class Template Example|Create a Component|Create an Entity|Create a Config Class|Entity Lifecycle|Entity Activeness|Event Handlers|Multiplayer Scripting|Prefabs Basics|Prefab Data|Mod Project Setup|Directory Structure|File Types|BaseContainer Usage|Serialisation|JsonApiStruct Usage|REST API Usage|Hint Usage|Notification Creation|Input Manager|Action Context Setup|General Game Mode Setup|Respawn Setup|Damage System|Autotest Framework|Dictionary|Getting Started|Data Modding Basics|Development Executables|Startup Parameters|Diag Menu|Layout Creation|Dialog Configuration Tutorial|Modular Button Component Tutorial|Widget Tooltip Setup|RichText Format|Persistence System|Game Identity|Task System Usage|Workbench Plugin|Resource Manager: Options|Mod Localisation|Game Master: Context Action Creation"""
want = [t for line in WANT.splitlines() for t in line.split("|")]
pages = {p["title"]: p for p in json.load(open(pages_json, encoding="utf-8"))}
rows = []
for t in want:
    p = pages.get(t)
    if not p:
        print("MISSING:", t); continue
    src = "engine-docs" if p.get("source") == "enfusion" else "bi-wiki"
    slug = src + "__" + re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_")
    path = os.path.join(out_dir, slug + ".md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# {t}\n\n> source: {src}" + (f" | url: {p['url']}" if p.get("url") else " | (bundled Workbench engine documentation)") + "\n\n")
        f.write(p["content"])
    rows.append((slug + ".md", t, src, len(p["content"]), p.get("url") or ""))
with open(os.path.join(out_dir, "INDEX.md"), "w", encoding="utf-8") as f:
    f.write("# Source documents index\n\nengine-docs = Enfusion engine docs bundled with Workbench (authoritative, newer). bi-wiki = community.bistudio.com Arma Reforger wiki (snapshot, latest edit 2026-02-17).\n\n| file | title | source | chars | url |\n|---|---|---|---|---|\n")
    for r in rows:
        f.write(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |\n")
print("written", len(rows))
