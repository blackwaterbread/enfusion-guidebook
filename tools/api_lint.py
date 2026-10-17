"""Flag identifiers used in the textbook's Enforce code that never appear in the official scripts.

usage: python -I api_lint.py <script-diff/scripts dir> <content dir> [file ...]
Prints, per MDX file, PascalCase/ALLCAPS identifiers (and Class.Member pairs) that are
neither defined in the book's own code nor present anywhere in the official corpus.
"""
import os
import re
import sys
from collections import defaultdict

scripts_dir, content_dir = sys.argv[1], sys.argv[2]
only = set(os.path.abspath(f) for f in sys.argv[3:])

TOKEN = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")
KEYWORDS = set(
    """class enum typedef modded sealed extends override static const private protected proto native external volatile
    owned ref autoptr out inout notnull event reference if else for foreach while switch case default break continue
    return new delete thread debug void int float bool string vector typename auto func array set map true false null
    NULL this super vanilla Class Managed""".split()
)

# ---- official corpus
corpus = set()
member_of = defaultdict(set)  # class name -> member names declared in its body (approximate)
cls_re = re.compile(r"^\s*(?:modded\s+)?(?:sealed\s+)?class\s+([A-Za-z_]\w*)")
decl_re = re.compile(r"^\s*(?:(?:proto|native|external|static|override|protected|private|event|sealed|owned|volatile|const|ref)\s+)*[\w<>,\s\[\]]*?\b([A-Za-z_]\w*)\s*\(")
var_re = re.compile(r"^\s*(?:(?:static|protected|private|const|ref)\s+)*[A-Za-z_][\w<>, ]*\s+([A-Za-z_]\w*)\s*(?:=|;|\[)")
enum_re = re.compile(r"^\s*enum\s+([A-Za-z_]\w*)")
for root, _, files in os.walk(scripts_dir):
    for fn in files:
        if not fn.endswith(".c"):
            continue
        with open(os.path.join(root, fn), encoding="utf-8", errors="replace") as f:
            text = f.read()
        corpus.update(TOKEN.findall(text))
        current = None
        depth = 0
        for line in text.splitlines():
            m = cls_re.match(line) or enum_re.match(line)
            if m and depth == 0:
                current = m.group(1)
            if current and depth == 1:
                d = decl_re.match(line) or var_re.match(line)
                if d:
                    member_of[current].add(d.group(1))
                elif enum_re.match(line) is None:
                    em = re.match(r"^\s*([A-Z_][A-Z0-9_]*)\s*(?:=|,|$)", line)
                    if em:
                        member_of[current].add(em.group(1))
            depth += line.count("{") - line.count("}")
            if depth <= 0:
                depth = 0
                if "}" in line:
                    current = None
        # enum one-liners / members on same lines
for name, members in list(member_of.items()):
    pass

# ---- book
FENCE = re.compile(r"^```+(\w*)[^\n]*\n(.*?)^```+\s*$", re.S | re.M)
INLINE = re.compile(r"`([^`\n]+)`")
DEF_PATTERNS = [
    re.compile(r"\b(?:class|enum|typedef[^;]*?)\s+([A-Za-z_]\w*)"),
    re.compile(r"\b[A-Za-z_][\w<>, ]*\s+([A-Za-z_]\w*)\s*\("),
    re.compile(r"\b[A-Za-z_][\w<>]*\s+([A-Za-z_]\w*)\s*(?:=|;|\[)"),
    re.compile(r"^\s*([A-Z_][A-Z0-9_]*)\s*(?:=|,)", re.M),
]

files = []
for root, _, fs in os.walk(content_dir):
    for fn in fs:
        if fn.endswith(".mdx"):
            p = os.path.abspath(os.path.join(root, fn))
            if not only or p in only:
                files.append(p)

for p in sorted(files):
    src = open(p, encoding="utf-8").read()
    blocks = []
    for m in FENCE.finditer(src):
        if m.group(1) in ("enforce", "enfusion", "enscript"):
            blocks.append((src[: m.start()].count("\n") + 1, m.group(2)))
    for m in INLINE.finditer(src):
        blocks.append((src[: m.start()].count("\n") + 1, m.group(1)))
    defined = set()
    for _, code in blocks:
        for pat in DEF_PATTERNS:
            defined.update(pat.findall(code))
    flagged = defaultdict(list)
    for line, code in blocks:
        code_nc = re.sub(r"//.*", "", code)
        code_nc = re.sub(r'"(?:\\.|[^"\\])*"', '""', code_nc)
        for tok in TOKEN.findall(code_nc):
            if tok in KEYWORDS or tok in defined or tok in corpus:
                continue
            if tok.startswith(("TAG_", "m_", "s_", "g_")) or not (tok[0].isupper()):
                continue
            flagged[tok].append(line)
        for cls, mem in re.findall(r"\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z_]\w*)\s*\(", code_nc):
            if cls in member_of and mem not in member_of[cls] and mem in corpus and not cls.startswith("TAG_"):
                flagged[f"{cls}.{mem}()"].append(line)
    rel = os.path.relpath(p, content_dir)
    if flagged:
        print(f"== {rel}")
        for tok, lines in sorted(flagged.items()):
            print(f"   {tok}  (lines {', '.join(map(str, sorted(set(lines))[:6]))})")
    else:
        print(f"== {rel}: ok")
