#!/usr/bin/env python3
"""字数热力图(homepage.md「字数热力图」)的明细索引。

放在 <库>/.obsidian/scripts/ 下,按自己的位置认库;按天汇总三份数据,
写到 <库>/.obsidian/wordheat-index.json(已 gitignore):
  typed  Better Word Count 当天在编辑器里打字的单文件字数(插件只留当天,这里每跑一次存一份快照)
  ai     Claude Code / Codex 会话记录里 AI 改文件的字数
  git    git 提交里 md 文件的词级增删(给没有 typed 快照的旧日子估算"自己改的")
  shell  AI 用命令行写文件(sed -i、重定向、python 脚本等)时点到名的 md 路径片段;
         也收带目录的通配写法(如 2.Read/douban/book/*.md,批量脚本常这么写)。
         这类改动不走编辑工具、没有字数,主页拿它把 git 里对应文件归到"AI 改的"

增量:git 记上次的 HEAD,只读新提交;会话文件记读到的字节位置,只读追加部分
(同 filebeat registry 的思路)。主页打开时在后台调用。
只用标准库;没有 git 就跳过 git 那份。
"""
import json
import os
import re
import shutil
import subprocess
import sys
from collections import Counter
from datetime import date, datetime
from pathlib import Path

try:
    import fcntl
except ImportError:  # Windows 没有,不加锁
    fcntl = None

VAULT = str(Path(__file__).resolve().parents[2])
OUT = Path(VAULT) / ".obsidian" / "wordheat-index.json"
LOCK = Path(VAULT) / ".obsidian" / "wordheat-index.lock"
CLAUDE_DIR = Path.home() / ".claude" / "projects"
CODEX_DIR = Path.home() / ".codex" / "sessions"
INDEX_VERSION = 4  # 4:shell 片段开始收带目录的通配写法(dir/*.md),升版本让历史会话重扫

# 和主页 dataviewjs 的 countWords 保持一致:中日韩每字算一个,其余按单词
CJK = r"㐀-鿿豈-﫿぀-ヿ가-힯"
TOKEN = re.compile(rf"[{CJK}]|[A-Za-z0-9À-ɏ]+(?:['’][A-Za-z]+)*")


def tokens(s):
    return TOKEN.findall(s)


def block_diff(removed, added):
    """一段连续的删行+加行按词做多重集差,避免改一个字就把整行算成删一遍加一遍。"""
    r, a = Counter(tokens("\n".join(removed))), Counter(tokens("\n".join(added)))
    return sum((a - r).values()), sum((r - a).values())


def diff_lines(lines):
    """统一 diff 的行列表(以 ' '/'+'/'-' 开头)→ (加, 删) 词数。"""
    add = dele = 0
    rem, ad = [], []
    for ln in list(lines) + [" "]:
        if ln.startswith("@@") or ln.startswith("+++") or ln.startswith("---"):
            continue
        if ln.startswith("-"):
            rem.append(ln[1:])
        elif ln.startswith("+"):
            ad.append(ln[1:])
        else:
            if rem or ad:
                x, y = block_diff(rem, ad)
                add += x
                dele += y
                rem, ad = [], []
    return add, dele


def local_day(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d")


def bump(days, day, kind, path, add, dele):
    if not (add or dele):
        return
    f = days.setdefault(day, {}).setdefault(kind, {}).setdefault(path, [0, 0])
    f[0] += add
    f[1] += dele


# 命令里像在写文件的迹象;只读的 cat/grep 不算
WRITEISH = re.compile(r">|sed -i|perl -i|\btee\b|\bmv |\bcp |open\(|write|apply_patch|replace\(")
MD_FRAG = re.compile(r"[^\s'\"`()\[\]{}<>|;,=]+\.md\b")


# 丢掉输出/报错的重定向(2>/dev/null、2>&1)不算写文件
NOISE = re.compile(r"\d?>\s*/dev/null|\d?>&\d")
# 通配片段(dir/*.md)要更硬的证据:脚本真在改文件,而不是列目录、读内容
# (str.replace 不算:读完内容做字符串替换很常见,不代表写回了文件)
STRONG = re.compile(r"sed -i|perl -i|\.write\(|write_text|writeFile|apply_patch|open\([^)]*['\"][wa]")
CD = re.compile(r"\bcd\s+(?:\"([^\"]+)\"|'([^']+)'|(\S+))")


def elsewhere(cmd):
    # 命令先 cd 到了别的仓库(如演示库),里面的相对路径就不是本库的文件
    for m in CD.finditer(cmd):
        t = next(g for g in m.groups() if g is not None)
        if t.startswith(("/", "~", "$")) and not t.startswith(VAULT):
            return True
    return False


def glob_ok(frag, cmd):
    # 通配之前要有目录,且从库的顶层文件夹写起;光 *.md、**/*.md、references/*.md
    # 范围太大或认不出是哪,收了会把不相干的改动算给 AI
    head = frag.split("*", 1)[0]
    return ("/" in head and os.path.isdir(os.path.join(VAULT, head.split("/")[0]))
            and STRONG.search(cmd) is not None and not elsewhere(cmd))


def note_shell(idx, ts, cmd):
    if not isinstance(cmd, str) or ".md" not in cmd:
        return
    cmd = NOISE.sub("", cmd)
    if not WRITEISH.search(cmd):
        return
    frags = set()
    for f in MD_FRAG.findall(cmd):
        f = f.replace(VAULT + "/", "").lstrip("./").replace("\\", "")
        if "$" in f:  # 变量没法确定是哪个文件
            continue
        if "*" not in f or glob_ok(f, cmd):
            frags.add(f)
    if frags:
        idx["days"].setdefault(local_day(ts), {}).setdefault("shell", [])
        cur = idx["days"][local_day(ts)]["shell"]
        cur.extend(sorted(frags - set(cur)))


def rel(path):
    if not path.startswith(VAULT + "/") or not path.endswith(".md"):
        return None
    return path[len(VAULT) + 1:]


# ---------- git ----------
def find_git():
    if sys.platform == "darwin":
        # 没装命令行工具时 /usr/bin/git 是个会弹安装框的空壳,先认 Homebrew 的
        for p in ("/opt/homebrew/bin/git", "/usr/local/bin/git"):
            if os.path.exists(p):
                return p
        if os.path.exists("/Library/Developer/CommandLineTools/usr/bin/git") or os.path.exists("/Applications/Xcode.app"):
            return "/usr/bin/git"
        return None
    return shutil.which("git")


GIT = find_git()


def git(*args):
    return subprocess.run([GIT, "-c", "core.quotepath=false", *args], cwd=VAULT,
                          capture_output=True, text=True, encoding="utf-8", errors="replace").stdout


def update_git(idx):
    if not GIT or not os.path.exists(os.path.join(VAULT, ".git")):
        return
    head = git("rev-parse", "HEAD").strip()
    old = idx.get("gitHead")
    if not head or head == old:
        return
    days = idx["days"]
    if old and subprocess.run([GIT, "merge-base", "--is-ancestor", old, head], cwd=VAULT).returncode == 0:
        rng = [f"{old}..{head}"]
    else:  # 首次或历史被改写:git 部分全量重建
        rng = [head]
        for d in days.values():
            d.pop("git", None)
    out = git("log", *rng, "-p", "--word-diff=porcelain", "--no-color", "--no-ext-diff",
              "--format=@@@%cd", "--date=short", "--", "*.md")
    day = path = None
    header = False
    clean = lambda p: re.sub(r"^[ab]/", "", p.rstrip("\t").strip('"'))
    for ln in out.split("\n"):
        if ln.startswith("@@@"):
            day, path, header = ln[3:], None, False
        elif ln.startswith("diff --git "):
            path, header = None, True
        elif header:
            if (ln.startswith("--- ") or ln.startswith("+++ ")) and ln[4:] != "/dev/null":
                path = clean(ln[4:])
            elif ln.startswith("@@"):
                header = False
        elif path and day and ln[:1] in "+-" and ln:
            n = len(tokens(ln[1:]))
            bump(idx["days"], day, "git", path, n if ln[0] == "+" else 0, n if ln[0] == "-" else 0)
    idx["gitHead"] = head


# ---------- AI 会话 ----------
def read_new(idx, f):
    """只读该文件上次之后追加的完整行。"""
    key = str(f)
    size = f.stat().st_size
    off = idx["offsets"].get(key, 0)
    if size < off:  # 文件被重写,从头读
        off = 0
    if size == off:
        return []
    with open(f, "rb") as fh:
        fh.seek(off)
        data = fh.read()
    end = data.rfind(b"\n")
    if end < 0:
        return []
    idx["offsets"][key] = off + end + 1
    return data[:end].decode("utf-8", "replace").split("\n")


def update_claude(idx):
    if not CLAUDE_DIR.exists():
        return
    needle = json.dumps(VAULT)[1:-1]
    for f in CLAUDE_DIR.rglob("*.jsonl"):
        for ln in read_new(idx, f):
            is_result = '"toolUseResult"' in ln and needle in ln
            is_bash = '"name":"Bash"' in ln and ".md" in ln
            if not (is_result or is_bash):
                continue
            try:
                d = json.loads(ln)
            except ValueError:
                continue
            if is_bash and d.get("timestamp"):
                for c in ((d.get("message") or {}).get("content") or []):
                    if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") == "Bash":
                        note_shell(idx, d["timestamp"], (c.get("input") or {}).get("command"))
            r = d.get("toolUseResult")
            if not isinstance(r, dict) or not d.get("timestamp"):
                continue
            p = rel(r.get("filePath") or "")
            if not p:
                continue
            patch = r.get("structuredPatch")
            if patch:
                add = dele = 0
                for h in patch:
                    x, y = diff_lines(h.get("lines", []))
                    add += x
                    dele += y
            elif r.get("type") == "create":
                add, dele = len(tokens(r.get("content") or "")), 0
            else:
                continue
            bump(idx["days"], local_day(d["timestamp"]), "ai", p, add, dele)


def update_codex(idx):
    if not CODEX_DIR.exists():
        return
    for f in CODEX_DIR.rglob("*.jsonl"):
        for ln in read_new(idx, f):
            is_change = '"FileChange"' in ln and "item_completed" in ln
            is_call = ('"function_call"' in ln or '"custom_tool_call"' in ln) and ".md" in ln
            if not (is_change or is_call):
                continue
            try:
                d = json.loads(ln)
            except ValueError:
                continue
            if is_call and d.get("timestamp"):
                pl = d.get("payload") or {}
                note_shell(idx, d["timestamp"], pl.get("arguments") or pl.get("input"))
            item = (d.get("payload") or {}).get("item") or {}
            if item.get("type") != "FileChange" or item.get("status") not in (None, "completed"):
                continue
            for path, ch in (item.get("changes") or {}).items():
                p = rel(path)
                if not p or not isinstance(ch, dict):
                    continue
                if ch.get("unified_diff"):
                    add, dele = diff_lines(ch["unified_diff"].split("\n"))
                elif ch.get("type") == "add":
                    add, dele = len(tokens(ch.get("content") or "")), 0
                else:
                    continue
                bump(idx["days"], local_day(d["timestamp"]), "ai", p, add, dele)


# ---------- 字数插件当天快照 ----------
def update_typed(idx):
    try:
        stats = json.load(open(os.path.join(VAULT, ".obsidian", "vault-stats.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return
    if not stats.get("history"):
        return
    day = max(stats["history"])  # modifiedFiles 属于插件记录的最后一天
    typed = {}
    for p, v in (stats.get("modifiedFiles") or {}).items():
        w = v.get("words") or {}
        n = (w.get("current") or 0) - (w.get("initial") or 0)
        if n:
            typed[p] = n
    idx["days"].setdefault(day, {})["typed"] = typed


def shell_matcher(shell):
    """shell 片段可能是带目录的通配(dir/*.md):* 不跨目录,** 跨目录。"""
    plain = [f for f in shell if "*" not in f]
    pats = []
    for f in shell:
        if "*" in f:
            r = re.escape(f).replace(r"\*\*", "\0").replace(r"\*", "[^/]*").replace("\0", ".*")
            pats.append(re.compile("(^|/)" + r + "$"))
    return lambda p: any(p == f or p.endswith("/" + f) for f in plain) or any(r.search(p) for r in pats)


def touched_today():
    """今天改过的 md(按修改时间),补上还没进 git 的改动。"""
    out, start = [], datetime.combine(date.today(), datetime.min.time()).timestamp()
    for root, dirs, files in os.walk(VAULT):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if f.endswith(".md"):
                full = os.path.join(root, f)
                try:
                    if os.stat(full).st_mtime >= start:
                        out.append(os.path.relpath(full, VAULT).replace(os.sep, "/"))
                except OSError:
                    pass
    return out


def build_summary(idx):
    today = date.today().isoformat()
    summary = {}
    for d in set(idx["days"]) | {today}:
        day = idx["days"].get(d, {})
        git = day.get("git", {})
        ai = {p: list(v) for p, v in day.get("ai", {}).items()}
        by_shell = shell_matcher(day.get("shell", []))
        for p, v in git.items():
            if p not in ai and by_shell(p):
                ai[p] = list(v)
        other = {}
        if "typed" in day:
            estimated = False
            typed = {p: [n, 0] for p, n in day["typed"].items()}
            other = {p: list(v) for p, v in git.items() if p not in typed and p not in ai}
        else:
            # 没有打字快照:git 改动减去 AI 那部分,剩下的算自己改的(混着插件/模板生成的)
            estimated = True
            typed = {}
            for p, v in git.items():
                a = ai.get(p)
                if not a:
                    typed[p] = list(v)
                else:
                    r = [max(0, v[0] - a[0]), max(0, v[1] - a[1])]
                    if r[0] + r[1] > 5:
                        typed[p] = r
        if d == today:
            for p in touched_today():
                if p not in typed and p not in ai and p not in other:
                    other[p] = None  # 还没提交,不知道改了多少字
        if typed or ai or other:
            summary[d] = {"typed": typed, "ai": ai, "other": other, "estimated": estimated}
    idx["summary"] = summary


def main():
    lock = open(LOCK, "w")
    if fcntl:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            return  # 另一个实例在跑
    try:
        idx = json.load(open(OUT, encoding="utf-8"))
        if idx.get("version") != INDEX_VERSION:
            raise ValueError
    except (OSError, ValueError):
        idx = {"version": INDEX_VERSION, "gitHead": None, "offsets": {}, "days": {}}
    update_git(idx)
    update_claude(idx)
    update_codex(idx)
    update_typed(idx)
    build_summary(idx)
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(idx, ensure_ascii=False), encoding="utf-8")
    tmp.replace(OUT)


if __name__ == "__main__":
    sys.exit(main())
