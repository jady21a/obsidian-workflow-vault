#!/usr/bin/env python3
"""Generate .vault-update/manifest.json for a template-vault release.

Run by the maintainer AFTER committing the release content, BEFORE committing
the manifest itself:

    python3 .vault-update/make-manifest.py 1.1.0
    git add .vault-update/manifest.json && git commit -m "release: v1.1.0"
    git tag v1.1.0 && git push && git push --tags

The manifest describes the HEAD tree. The Vault Updater plugin downloads files
by the HEAD commit hash recorded here, so the tag is optional for updates.

Fields:
  files       path -> {sha, mode}   every file the template owns (git blob sha1)
  history     path -> [sha...]      every content a path ever had in git history;
                                    a local file whose hash is in here was never
                                    edited by the user and is safe to replace
  pkgs        plugin/theme folder -> version
  legacyBase  files of the last release shipped without a manifest (v1.0.0),
              used as the "what the user started from" list for those users
  mode        file  : replace if untouched, else save the new copy aside
              json  : replace if untouched, else only add missing keys
              seed  : replace if untouched, else leave alone
              pkg   : plugin/theme code, follows the version in manifest.json
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".vault-update" / "manifest.json"
NOTES = ROOT / ".vault-update" / "release-notes.md"
REPO = "jady21a/obsidian-workflow-vault"
LEGACY_TAG = "v1.0.0"

EXCLUDE = [
    re.compile(r"^\.vault-update/"),
    re.compile(r"(^|/)\.DS_Store$"),
    re.compile(r"(^|/)\.hotreload$"),
    re.compile(r"^\.obsidian/hotkeys\.json\.bak"),
]
SEED = {".obsidian/vault-stats.json", ".obsidian/hotkeys.json"}
PKG = re.compile(r"^\.obsidian/(plugins|themes)/[^/]+/(main\.js|manifest\.json|styles\.css|theme\.css)$")
JSON_CFG = re.compile(r"^\.obsidian/([^/]+\.json|plugins/[^/]+/data\.json)$")
PKG_MANIFEST = re.compile(r"^(\.obsidian/(?:plugins|themes)/[^/]+)/manifest\.json$")


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], check=True,
                          capture_output=True).stdout


def mode_of(path):
    if any(r.search(path) for r in EXCLUDE):
        return None
    if path in SEED:
        return "seed"
    if PKG.match(path):
        return "pkg"
    if JSON_CFG.match(path):
        return "json"
    return "file"


def tree(ref):
    """path -> blob sha for every file in ref (NUL-separated, so CJK paths stay intact)."""
    out = {}
    for entry in git("ls-tree", "-r", "-z", ref).split(b"\0"):
        if not entry:
            continue
        meta, path = entry.split(b"\t", 1)
        kind, sha = meta.split()[1:3]
        if kind == b"blob":
            out[path.decode("utf-8")] = sha.decode()
    return out


def main():
    if len(sys.argv) != 2 or not re.match(r"^\d+\.\d+\.\d+$", sys.argv[1]):
        sys.exit("usage: make-manifest.py <version>   e.g. 1.1.0")
    version = sys.argv[1]

    dirty = [l for l in git("status", "--porcelain", "-uno").decode().splitlines()
             if ".vault-update/" not in l]
    if dirty:
        print("warning: uncommitted changes are NOT in the manifest (it reads HEAD):")
        print("\n".join("  " + l for l in dirty[:20]))

    head = git("rev-parse", "HEAD").decode().strip()
    files = {}
    pkgs = {}
    for path, sha in tree(head).items():
        mode = mode_of(path)
        if not mode:
            continue
        files[path] = {"sha": sha, "mode": mode}
        m = PKG_MANIFEST.match(path)
        if m:
            meta = json.loads(git("show", f"{head}:{path}"))
            pkgs[m.group(1)] = str(meta.get("version", "0"))

    history = {}
    for commit in git("rev-list", head).decode().split():
        for path, sha in tree(commit).items():
            if mode_of(path):
                history.setdefault(path, set()).add(sha)

    legacy = {}
    if git("tag", "--list", LEGACY_TAG).strip():
        for path, sha in tree(LEGACY_TAG).items():
            mode = mode_of(path)
            if mode:
                legacy[path] = {"sha": sha, "mode": mode}

    manifest = {
        "schema": 1,
        "repo": REPO,
        "version": version,
        "ref": head,
        "notes": NOTES.read_text("utf-8").strip() if NOTES.exists() else "",
        "files": files,
        "pkgs": pkgs,
        "history": {p: sorted(s) for p, s in sorted(history.items())},
        "legacyBase": legacy,
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n", "utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: v{version} @ {head[:7]}, "
          f"{len(files)} files, {len(pkgs)} plugins/themes, {len(history)} paths in history")


if __name__ == "__main__":
    main()
