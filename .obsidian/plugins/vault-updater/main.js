"use strict";
/*
 * Vault Updater — update this template vault without touching the user's notes.
 *
 * Rule (same idea as copier/cruft template updates):
 *   - a file the user never edited (its hash appears in the template's git history)
 *     is replaced by the new version, after a backup;
 *   - a file the user edited is kept; if the template also changed it, the new
 *     version is saved aside under "_模板库更新/v<version>/";
 *   - settings JSON the user edited only gets the missing keys added;
 *   - plugins/themes follow their own version numbers and are never downgraded;
 *   - files the user deleted are not brought back; files outside the template are never read.
 * The manifest is produced by .vault-update/make-manifest.py at release time.
 */
const { Plugin, Modal, Notice, Setting, PluginSettingTab, requestUrl, TFile, TFolder } = require("obsidian");

const REPO = "jady21a/obsidian-workflow-vault";
const MANIFEST_PATH = ".vault-update/manifest.json";
const BACKUP_DIR = ".vault-update/backup";
const UPDATE_DIR = "_模板库更新";
const DAY = 24 * 3600 * 1000;
const DEFAULT_SETTINGS = { autoCheck: true, lastCheck: 0, ignoredVersion: "" };

// ---------------------------------------------------------------- pure helpers

function cmpVersion(a, b) {
  const pa = String(a || "0").split(/[.-]/);
  const pb = String(b || "0").split(/[.-]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? "0";
    const y = pb[i] ?? "0";
    const nx = Number(x);
    const ny = Number(y);
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
      if (nx !== ny) return nx > ny ? 1 : -1;
    } else if (x !== y) {
      return x > y ? 1 : -1;
    }
  }
  return 0;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

async function gitBlobSha(bytes) {
  const header = enc.encode(`blob ${bytes.byteLength}\0`);
  const all = new Uint8Array(header.length + bytes.byteLength);
  all.set(header, 0);
  all.set(bytes, header.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", all));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Hashes of a local file: as-is, plus with CRLF turned into LF (git on Windows may convert line endings).
async function localShas(bytes) {
  const shas = [await gitBlobSha(bytes)];
  if (bytes.includes(13)) {
    const out = [];
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 13 && bytes[i + 1] === 10) continue;
      out.push(bytes[i]);
    }
    shas.push(await gitBlobSha(Uint8Array.from(out)));
  }
  return shas;
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Add keys that exist in `remote` but not in `local`; never change an existing value.
function mergeAddMissing(local, remote, prefix = "", added = []) {
  if (!isObj(local) || !isObj(remote)) return { value: local, added };
  const out = { ...local };
  for (const [k, rv] of Object.entries(remote)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (!(k in out)) {
      out[k] = rv;
      added.push(key);
    } else if (isObj(out[k]) && isObj(rv)) {
      out[k] = mergeAddMissing(out[k], rv, key, added).value;
    }
  }
  return { value: out, added };
}

// Where the new copy of a user-edited file goes: _模板库更新/v1.1.0/<path>, with dot-folders made visible.
function asidePath(version, path) {
  const segs = path.split("/").map((s) => (s.startsWith(".") ? "_" + s.slice(1) : s));
  return `${UPDATE_DIR}/v${version}/${segs.join("/")}`;
}

function isPkgArea(path) {
  return /^\.obsidian\/(plugins|themes)\//.test(path);
}

// ---------------------------------------------------------------- planning

/*
 * io: { toLocal(path), exists(path), read(path) -> Uint8Array }
 * fetchRemote(path, sha) -> Uint8Array (verified)
 * Returns a list of actions; nothing is written here.
 */
async function buildPlan(io, remote, local, fetchRemote) {
  const base = local && local.files ? local.files : remote.legacyBase || {};
  const history = remote.history || {};
  const known = (path, shas) => !!history[path] && shas.some((s) => history[path].includes(s));
  const roots = Object.keys(remote.pkgs || {});
  const rootOf = (path) => roots.find((r) => path.startsWith(r + "/"));
  const actions = [];
  const once = new Set();
  const note = (kind, path, extra) => {
    if (once.has(kind + path)) return;
    once.add(kind + path);
    actions.push({ kind, path, ...extra });
  };

  // 1. plugins / themes
  const pkg = {};
  for (const root of roots) {
    const man = io.toLocal(root + "/manifest.json");
    if (!(await io.exists(man))) {
      const hadIt = Object.keys(base).some((p) => p.startsWith(root + "/"));
      pkg[root] = hadIt ? "removed" : "install";
      if (hadIt) note("skip-pkg-removed", root);
      continue;
    }
    let localVersion = null;
    try {
      localVersion = JSON.parse(dec.decode(await io.read(man))).version;
    } catch (e) { /* unreadable manifest: treat as older */ }
    const c = localVersion ? cmpVersion(remote.pkgs[root], localVersion) : 1;
    pkg[root] = c > 0 ? "older" : c < 0 ? "newer" : "same";
    if (c < 0) note("skip-pkg-newer", root, { localVersion, remoteVersion: remote.pkgs[root] });
  }

  // 2. every file the template owns
  for (const [path, meta] of Object.entries(remote.files)) {
    const root = rootOf(path);
    const state = root ? pkg[root] : null;
    if (state === "removed") continue;
    const lp = io.toLocal(path);
    const exists = await io.exists(lp);

    if (meta.mode === "pkg") {
      if (state === "newer") continue;
      if (!exists) {
        actions.push({ kind: state === "install" ? "pkg-install" : "add", path, sha: meta.sha, root });
        continue;
      }
      const shas = await localShas(await io.read(lp));
      if (shas.includes(meta.sha)) continue;
      if (state === "older") actions.push({ kind: "pkg-update", path, sha: meta.sha, root });
      else if (known(path, shas)) actions.push({ kind: "update", path, sha: meta.sha });
      else note("skip-pkg-modified", root);
      continue;
    }

    if (!exists) {
      if (state === "install") actions.push({ kind: "pkg-install", path, sha: meta.sha, root });
      else if (path in base) { if (meta.mode === "file") actions.push({ kind: "skip-deleted", path }); }
      else actions.push({ kind: "add", path, sha: meta.sha });
      continue;
    }

    const shas = await localShas(await io.read(lp));
    if (shas.includes(meta.sha)) continue;
    if (known(path, shas)) {
      actions.push({ kind: "update", path, sha: meta.sha });
      continue;
    }
    // The user edited it. If the template did not change it since the user's version, nothing to do.
    if (base[path] && base[path].sha === meta.sha) continue;
    if (meta.mode === "seed") continue;
    if (meta.mode === "json") {
      let mine;
      let theirs;
      try {
        mine = JSON.parse(dec.decode(await io.read(lp)));
        theirs = JSON.parse(dec.decode(await fetchRemote(path, meta.sha)));
      } catch (e) {
        continue; // unreadable JSON: leave the user's file alone
      }
      const { value, added } = mergeAddMissing(mine, theirs);
      if (added.length) {
        actions.push({ kind: "merge", path, added, bytes: enc.encode(JSON.stringify(value, null, 2)) });
      }
      continue;
    }
    actions.push({ kind: "conflict", path, sha: meta.sha, aside: asidePath(remote.version, path) });
  }

  // 3. newly shipped plugins get switched on
  const newIds = roots
    .filter((r) => pkg[r] === "install" && r.startsWith(".obsidian/plugins/"))
    .map((r) => r.split("/")[2]);
  if (newIds.length) actions.push({ kind: "enable-plugins", path: ".obsidian/community-plugins.json", ids: newIds });

  // 4. files the template dropped
  for (const path of Object.keys(base)) {
    if (path in remote.files || isPkgArea(path)) continue;
    const lp = io.toLocal(path);
    if (!(await io.exists(lp))) continue;
    const shas = await localShas(await io.read(lp));
    actions.push({ kind: known(path, shas) ? "remove" : "keep-removed", path });
  }
  return actions;
}

// ---------------------------------------------------------------- applying

const WRITES = new Set(["add", "pkg-install", "update", "pkg-update", "merge", "conflict", "remove", "enable-plugins"]);
const NEEDS_DOWNLOAD = new Set(["add", "pkg-install", "update", "pkg-update", "conflict"]);
const BACKS_UP = new Set(["update", "pkg-update", "merge", "remove", "enable-plugins"]);

/*
 * io additionally needs: write(path, bytes), remove(path)
 * Downloads everything first; if any download fails nothing is written.
 */
async function applyPlan(io, remote, actions, fetchRemote, stamp) {
  const backupRoot = `${BACKUP_DIR}/${stamp}`;
  const todo = actions.filter((a) => WRITES.has(a.kind));
  for (const a of todo) {
    if (NEEDS_DOWNLOAD.has(a.kind) && !a.bytes) a.bytes = await fetchRemote(a.path, a.sha);
  }
  const failed = [];
  for (const a of todo) {
    try {
      const lp = io.toLocal(a.path);
      const bak = `${backupRoot}/${a.path}`;
      if (BACKS_UP.has(a.kind) && (await io.exists(lp)) && !(await io.exists(bak))) {
        await io.write(bak, await io.read(lp));
      }
      if (a.kind === "conflict") await io.write(a.aside, a.bytes);
      else if (a.kind === "remove") await io.remove(lp);
      else if (a.kind === "enable-plugins") {
        let list = [];
        try { list = JSON.parse(dec.decode(await io.read(lp))); } catch (e) { /* missing: start empty */ }
        if (!Array.isArray(list)) list = [];
        for (const id of a.ids) if (!list.includes(id)) list.push(id);
        await io.write(lp, enc.encode(JSON.stringify(list, null, 2)));
      } else await io.write(lp, a.bytes);
    } catch (e) {
      a.error = String((e && e.message) || e);
      failed.push(a);
    }
  }
  if (!failed.length) {
    const { history, legacyBase, ...slim } = remote; // the base for next time; history is not needed locally
    await io.write(MANIFEST_PATH, enc.encode(JSON.stringify(slim, null, 1)));
  }
  return { failed, backupRoot };
}

// ---------------------------------------------------------------- wording

const GROUPS = [
  { kinds: ["update", "pkg-update"], title: "直接换成新版(你没改过,旧版已备份)" },
  { kinds: ["add", "pkg-install"], title: "新增的文件" },
  { kinds: ["enable-plugins"], title: "启用新插件" },
  { kinds: ["merge"], title: "设置补上新选项(你原来的设置一个不动)" },
  { kinds: ["conflict"], title: `你改过、新版也改了:保留你的,新版另存到 ${UPDATE_DIR} 文件夹` },
  { kinds: ["remove"], title: "新版不再需要的文件(你没改过,备份后移走)" },
  { kinds: ["keep-removed"], title: "新版不再需要,但你改过:原样保留" },
  { kinds: ["skip-deleted", "skip-pkg-removed"], title: "你删掉的:不加回来" },
  { kinds: ["skip-pkg-newer", "skip-pkg-modified"], title: "插件你已自己更新或改过:不动" },
];

function label(a) {
  if (a.kind === "enable-plugins") return a.ids.join(", ");
  if (a.kind === "conflict") return `${a.path}  →  ${a.aside}`;
  if (a.kind === "skip-pkg-newer") return `${a.path}(你的 ${a.localVersion},模板的 ${a.remoteVersion})`;
  return a.path;
}

function groupActions(actions) {
  return GROUPS.map((g) => ({ ...g, items: actions.filter((a) => g.kinds.includes(a.kind)) }))
    .filter((g) => g.items.length);
}

function buildReport(remote, fromVersion, actions, result) {
  const link = (p) => (/\.md$/.test(p) && !p.split("/").some((s) => s.startsWith("."))
    ? `[[${p.replace(/\.md$/, "")}]]` : `\`${p}\``);
  const lines = [
    `# 模板库更新到 v${remote.version}`,
    "",
    `从 v${fromVersion} 更新,时间 ${new Date().toLocaleString()}。改动前的文件都备份在 \`${result.backupRoot}\`。`,
    "",
  ];
  if (remote.notes) lines.push("## 这一版改了什么", "", remote.notes, "");
  if (result.failed.length) {
    lines.push("## 没写进去的文件", "", "下面这些写入失败,其他文件已更新。再跑一次「检查模板库更新」会重试。", "");
    for (const a of result.failed) lines.push(`- \`${a.path}\`:${a.error}`);
    lines.push("");
  }
  for (const g of groupActions(actions)) {
    lines.push(`## ${g.title}`, "");
    for (const a of g.items) {
      if (a.kind === "conflict") lines.push(`- 你的:${link(a.path)}  新版:${link(a.aside)}`);
      else lines.push(`- ${a.kind === "enable-plugins" ? a.ids.join(", ") : link(a.path)}`);
    }
    lines.push("");
  }
  if (actions.some((a) => a.kind === "conflict")) {
    lines.push("> [!tip] 怎么处理另存的新版", "> 对照两份,把想要的改动挪进你自己的文件,然后把这个文件夹整个删掉。", "");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------- Obsidian side

function urlsFor(ref, path) {
  const p = path.split("/").map(encodeURIComponent).join("/");
  return [
    `https://raw.githubusercontent.com/${REPO}/${ref}/${p}`,
    `https://cdn.jsdelivr.net/gh/${REPO}@${ref}/${p}`,
  ];
}

async function getBytes(urls) {
  let last;
  for (const url of urls) {
    try {
      const r = await requestUrl({ url, throw: false });
      if (r.status === 200) return new Uint8Array(r.arrayBuffer);
      last = `HTTP ${r.status}`;
    } catch (e) {
      last = String((e && e.message) || e);
    }
  }
  throw new Error(`下载失败(${last})`);
}

class VaultIO {
  constructor(app) {
    this.app = app;
    this.adapter = app.vault.adapter;
    this.configDir = app.vault.configDir || ".obsidian";
  }
  toLocal(path) {
    return path.startsWith(".obsidian/") ? this.configDir + path.slice(".obsidian".length) : path;
  }
  hidden(path) {
    return path.split("/").some((s) => s.startsWith("."));
  }
  exists(path) {
    return this.adapter.exists(path);
  }
  async read(path) {
    return new Uint8Array(await this.adapter.readBinary(path));
  }
  async mkdirs(dir) {
    const parts = dir.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const d = parts.slice(0, i).join("/");
      if (!d || (await this.adapter.exists(d))) continue;
      if (this.hidden(d)) await this.adapter.mkdir(d);
      else await this.app.vault.createFolder(d);
    }
  }
  async write(path, bytes) {
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const dir = path.split("/").slice(0, -1).join("/");
    if (dir) await this.mkdirs(dir);
    if (this.hidden(path)) return this.adapter.writeBinary(path, buf);
    const f = this.app.vault.getAbstractFileByPath(path);
    if (f instanceof TFile) return this.app.vault.modifyBinary(f, buf);
    if (await this.adapter.exists(path)) return this.adapter.writeBinary(path, buf);
    return this.app.vault.createBinary(path, buf);
  }
  async remove(path) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (f instanceof TFile) return this.app.vault.trash(f, false);
    return this.adapter.remove(path);
  }
}

class PlanModal extends Modal {
  constructor(app, { remote, fromVersion, actions, onConfirm }) {
    super(app);
    Object.assign(this, { remote, fromVersion, actions, onConfirm });
  }
  onOpen() {
    const { contentEl, remote } = this;
    this.titleEl.setText(`模板库更新:v${this.fromVersion} → v${remote.version}`);
    contentEl.createEl("p", { text: "你自己写的笔记不会被动到。会改动的文件都先备份。" });
    if (remote.notes) {
      const box = contentEl.createEl("details");
      box.createEl("summary", { text: "这一版改了什么" });
      box.createEl("pre", { text: remote.notes }).style.whiteSpace = "pre-wrap";
    }
    for (const g of groupActions(this.actions)) {
      const d = contentEl.createEl("details");
      d.createEl("summary", { text: `${g.title}(${g.items.length})` });
      const ul = d.createEl("ul");
      for (const a of g.items) ul.createEl("li", { text: label(a) });
    }
    new Setting(contentEl)
      .addButton((b) => b.setButtonText("取消").onClick(() => this.close()))
      .addButton((b) => b.setButtonText("开始更新").setCta().onClick(async () => {
        b.setDisabled(true).setButtonText("更新中…");
        await this.onConfirm();
        this.close();
      }));
  }
  onClose() {
    this.contentEl.empty();
  }
}

class DoneModal extends Modal {
  constructor(app, { reportPath, failed }) {
    super(app);
    Object.assign(this, { reportPath, failed });
  }
  onOpen() {
    this.titleEl.setText(this.failed ? "更新完成,有文件没写进去" : "更新完成");
    this.contentEl.createEl("p", {
      text: "重启一次 Obsidian 让插件和设置生效。改动清单在「" + this.reportPath + "」。",
    });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("稍后").onClick(() => this.close()))
      .addButton((b) => b.setButtonText("立即重启 Obsidian").setCta().onClick(() => {
        this.app.commands.executeCommandById("app:reload");
      }));
  }
  onClose() {
    this.contentEl.empty();
  }
}

class UpdaterSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("每天自动检查一次新版本")
      .setDesc("有新版只弹一条提示,不会自动改任何文件。")
      .addToggle((t) => t.setValue(this.plugin.settings.autoCheck).onChange(async (v) => {
        this.plugin.settings.autoCheck = v;
        await this.plugin.saveData(this.plugin.settings);
      }));
    new Setting(this.containerEl)
      .setName("现在检查")
      .addButton((b) => b.setButtonText("检查模板库更新").onClick(() => this.plugin.checkForUpdates(true)));
  }
}

class VaultUpdaterPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addCommand({ id: "check", name: "检查模板库更新", callback: () => this.checkForUpdates(true) });
    this.addSettingTab(new UpdaterSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoCheck && Date.now() - this.settings.lastCheck > DAY) {
        window.setTimeout(() => this.checkForUpdates(false), 15000);
      }
    });
  }

  async readLocalManifest(io) {
    try {
      return JSON.parse(dec.decode(await io.read(MANIFEST_PATH)));
    } catch (e) {
      return null;
    }
  }

  async fetchManifest() {
    const urls = [
      `https://raw.githubusercontent.com/${REPO}/main/${MANIFEST_PATH}`,
      `https://cdn.jsdelivr.net/gh/${REPO}@main/${MANIFEST_PATH}`,
    ];
    const m = JSON.parse(dec.decode(await getBytes(urls)));
    if (m.schema !== 1 || !m.files || !m.ref) throw new Error("清单格式不认识,请先更新本插件");
    return m;
  }

  async checkForUpdates(manual) {
    const io = new VaultIO(this.app);
    let remote;
    try {
      remote = await this.fetchManifest();
    } catch (e) {
      if (manual) new Notice(`连不上模板库(GitHub):${e.message}`);
      return;
    }
    this.settings.lastCheck = Date.now();
    await this.saveData(this.settings);
    const local = await this.readLocalManifest(io);
    const fromVersion = (local && local.version) || "1.0.0";
    if (cmpVersion(remote.version, fromVersion) <= 0 && local) {
      if (manual) new Notice(`模板库已是最新(v${fromVersion})`);
      return;
    }
    if (!manual) {
      if (this.settings.ignoredVersion === remote.version) return;
      const frag = createFragment((f) => {
        f.appendText(`模板库有新版本 v${remote.version}。`);
        f.createEl("a", { text: "查看更新", href: "#" }).onclick = (ev) => {
          ev.preventDefault();
          this.checkForUpdates(true);
        };
      });
      new Notice(frag, 15000);
      this.settings.ignoredVersion = remote.version; // remind once per version
      await this.saveData(this.settings);
      return;
    }

    const cache = new Map();
    const fetchRemote = async (path, sha) => {
      if (cache.has(path)) return cache.get(path);
      const bytes = await getBytes(urlsFor(remote.ref, path));
      if ((await gitBlobSha(bytes)) !== sha) throw new Error(`${path} 下载内容校验不通过`);
      cache.set(path, bytes);
      return bytes;
    };

    const notice = new Notice("正在比对文件…", 0);
    let actions;
    try {
      actions = await buildPlan(io, remote, local, fetchRemote);
    } catch (e) {
      notice.hide();
      new Notice(`比对失败:${e.message}`);
      return;
    }
    notice.hide();

    if (!actions.some((a) => WRITES.has(a.kind))) {
      await io.write(MANIFEST_PATH, enc.encode(JSON.stringify((({ history, legacyBase, ...s }) => s)(remote), null, 1)));
      new Notice(`模板库已是最新(v${remote.version}),你改过的文件都保留着`);
      return;
    }

    new PlanModal(this.app, {
      remote, fromVersion, actions,
      onConfirm: async () => {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const n = new Notice("正在下载并更新…", 0);
        let result;
        try {
          result = await applyPlan(io, remote, actions, fetchRemote, stamp);
        } catch (e) {
          n.hide();
          new Notice(`没有改动任何文件:${e.message}`, 10000);
          return;
        }
        n.hide();
        const reportPath = `${UPDATE_DIR}/v${remote.version}/更新说明.md`;
        await io.write(reportPath, enc.encode(buildReport(remote, fromVersion, actions, result)));
        const f = this.app.vault.getAbstractFileByPath(reportPath);
        if (f instanceof TFile) await this.app.workspace.getLeaf(true).openFile(f);
        new DoneModal(this.app, { reportPath, failed: result.failed.length > 0 }).open();
      },
    }).open();
  }
}

module.exports = VaultUpdaterPlugin;
module.exports.core = { cmpVersion, gitBlobSha, localShas, mergeAddMissing, buildPlan, applyPlan, buildReport, groupActions, asidePath };
