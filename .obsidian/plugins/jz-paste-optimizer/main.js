'use strict';

var obsidian = require('obsidian');

const DEFAULT_SETTINGS = {
    removeListBlankLines: true,
    cleanBooksCopyright: true,
    autoAddListFormat: false,
    debugMode: false
};

class PasteOptimizerPlugin extends obsidian.Plugin {
    async onload() {
        await this.loadSettings();
        this.log('粘贴优化插件已加载');

        // 统一的粘贴事件处理器
        this.registerEvent(
            this.app.workspace.on('editor-paste', (evt, editor) => {
                const text = evt.clipboardData?.getData('text/plain');
                
                if (!text) return;

                let processedText = text;
                let shouldIntercept = false;
                const processedFeatures = [];

                // 功能 1: 清理 Books 版权信息
                if (this.settings.cleanBooksCopyright) {
                    const result = this.cleanBooksCopyright(text);
                    if (result.processed) {
                        processedText = result.text;
                        shouldIntercept = true;
                        processedFeatures.push('Books版权清理');
                        this.log('清理前:', text.substring(0, 100));
                        this.log('清理后:', processedText.substring(0, 100));
                    }
                }

                // 功能 2: 去除列表项之间的空行
                if (this.settings.removeListBlankLines) {
                    const result = this.removeListBlankLines(processedText);
                    if (result.processed) {
                        processedText = result.text;
                        shouldIntercept = true;
                        processedFeatures.push('列表空行去除');
                    }
                }

                // 如果有任何处理，则拦截默认粘贴
                if (shouldIntercept) {
                    evt.preventDefault();
                    editor.replaceSelection(processedText);
                    
                    // 只在处理了内容时才显示通知
                    if (processedFeatures.length > 0) {
                        this.log(`已应用: ${processedFeatures.join('、')}`);
                    }
                }
                
                // 延迟处理：处理从 Obsidian 内部复制的情况
                if (this.settings.removeListBlankLines) {
                    setTimeout(() => {
                        this.cleanupEditorLists(editor);
                    }, 50);
                }
            })
        );

        // 命令: 手动去除选中区域的列表空行
        this.addCommand({
            id: 'remove-blank-lines',
            name: '去除列表项之间的空行',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                
                if (selection) {
                    const result = this.removeListBlankLines(selection);
                    if (result.processed) {
                        editor.replaceSelection(result.text);
                        new obsidian.Notice('已去除选中区域的列表空行');
                    } else {
                        new obsidian.Notice('选中区域没有需要处理的列表空行');
                    }
                } else {
                    const fullText = editor.getValue();
                    const result = this.removeListBlankLines(fullText);
                    if (result.processed) {
                        editor.setValue(result.text);
                        new obsidian.Notice('已去除文档中的列表空行');
                    } else {
                        new obsidian.Notice('文档中没有需要处理的列表空行');
                    }
                }
            }
        });

        // 命令: 清理当前列表
        this.addCommand({
            id: 'clean-current-list',
            name: '清理当前列表的空行',
            editorCallback: (editor) => {
                const removed = this.cleanupEditorLists(editor);
                if (removed > 0) {
                    new obsidian.Notice(`已清理 ${removed} 个空行`);
                } else {
                    new obsidian.Notice('未找到需要清理的空行');
                }
            }
        });

        // 命令: 清理 Books 版权信息
        this.addCommand({
            id: 'clean-books-copyright',
            name: '清理 Books 版权信息',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                
                if (!selection) {
                    new obsidian.Notice('请先选中要清理的文本');
                    return;
                }
                
                const result = this.cleanBooksCopyright(selection);
                if (result.processed) {
                    editor.replaceSelection(result.text);
                    new obsidian.Notice('已清理 Books 版权信息');
                } else {
                    new obsidian.Notice('未检测到 Books 版权信息');
                }
            }
        });

        // 添加设置页面
        this.addSettingTab(new PasteOptimizerSettingTab(this.app, this));
    }

    /**
     * 清理 Books 应用的版权信息
     */
    cleanBooksCopyright(text) {
        const hasBooksCopyright = 
            text.includes('摘录来自') || 
            text.includes('此材料可能受版权保护') ||
            text.includes('Excerpt From') ||
            text.includes('This material may be protected by copyright');
        
        if (!hasBooksCopyright) {
            return { text, processed: false };
        }

        // 清理版权信息
        let cleaned = text
            .replace(/摘录来自[\s\S]*?此材料可能受版权保护。?\s*/g, '')
            .replace(/Excerpt From[\s\S]*?This material may be protected by copyright\.?\s*/g, '')
            .trim();
        
        // 移除所有类型的引号（开头和结尾）
        cleaned = this.removeQuotes(cleaned);
        
        // 处理每一行
        const lines = cleaned
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        // 如果启用自动列表格式
        if (this.settings.autoAddListFormat) {
            cleaned = lines
                .map(line => {
                    // 如果已经是列表项，不重复添加
                    if (/^[-*+]\s/.test(line)) {
                        return line;
                    }
                    return '- ' + line;
                })
                .join('\n');
        } else {
            // 保留原格式
            cleaned = lines.join('\n');
        }

        return { text: cleaned, processed: true };
    }

    /**
     * 移除文本首尾的各种引号
     */
    removeQuotes(text) {
        const quoteChars = /[\u0022\u0027\u2018\u2019\u201C\u201D\u201E\u201F\u2033\u300C-\u300F\u00AB\u00BB\u2039\u203A《》]/g;
        
        let cleaned = text.trim();
        let prev;
        let iterations = 0;
        
        // 多次迭代，直到没有引号或达到最大次数
        do {
            prev = cleaned;
            // 移除首尾的引号和空白
            cleaned = cleaned.replace(/^[\s\u0022\u0027\u2018\u2019\u201C\u201D\u201E\u201F\u2033\u300C-\u300F\u00AB\u00BB\u2039\u203A《》]+/, '');
            cleaned = cleaned.replace(/[\s\u0022\u0027\u2018\u2019\u201C\u201D\u201E\u201F\u2033\u300C-\u300F\u00AB\u00BB\u2039\u203A《》]+$/, '');
            cleaned = cleaned.trim();
            iterations++;
        } while (cleaned !== prev && iterations < 20);
        
        return cleaned;
    }

    /**
     * 去除列表项之间的空行
     */
    removeListBlankLines(text) {
        const hasListItems = /^[\s]*[-*+]\s/m.test(text);
        const hasBlankLines = /\n\s*\n/.test(text);
        
        if (!hasListItems || !hasBlankLines) {
            return { text, processed: false };
        }

        const lines = text.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const isBlankLine = trimmedLine === '';
            
            // 检查是否应该跳过这个空行
            if (isBlankLine && i > 0 && i < lines.length - 1) {
                const prevLine = lines[i - 1].trim();
                const nextLine = lines[i + 1].trim();
                
                const isPrevList = /^[-*+]\s/.test(prevLine);
                const isNextList = /^[-*+]\s/.test(nextLine);
                
                // 如果前后都是列表项，跳过这个空行
                if (isPrevList && isNextList) {
                    this.log(`跳过空行 (第${i+1}行): 前="${prevLine.substring(0, 20)}" 后="${nextLine.substring(0, 20)}"`);
                    continue;
                }
            }
            
            result.push(line);
        }

        return { text: result.join('\n'), processed: true };
    }

    /**
     * 清理编辑器中的列表空行（处理 Obsidian 内部复制的情况）
     */
    cleanupEditorLists(editor) {
        const cursor = editor.getCursor();
        const line = cursor.line;
        
        // 扫描范围：光标前20行到光标后5行
        const startLine = Math.max(0, line - 20);
        const endLine = Math.min(editor.lineCount() - 1, line + 5);
        
        let removedCount = 0;
        
        // 从后往前删除，避免行号变化
        for (let i = endLine; i >= startLine + 1; i--) {
            // 边界检查
            if (i < 1 || i >= editor.lineCount()) continue;
            
            const currentLine = editor.getLine(i);
            const prevLine = editor.getLine(i - 1);
            const nextLine = i < editor.lineCount() - 1 ? editor.getLine(i + 1) : null;
            
            const isPrevList = /^\s*[-*+]\s/.test(prevLine);
            const isCurrentBlank = currentLine.trim() === '';
            const isNextList = nextLine ? /^\s*[-*+]\s/.test(nextLine) : false;
            
            // 删除列表项之间的空行
            if (isPrevList && isCurrentBlank && isNextList) {
                editor.replaceRange('', 
                    { line: i, ch: 0 }, 
                    { line: i + 1, ch: 0 }
                );
                removedCount++;
                this.log(`删除第 ${i + 1} 行的空行`);
            }
        }
        
        if (removedCount > 0) {
            this.log(`共删除 ${removedCount} 个列表空行`);
        }
        
        return removedCount;
    }

    /**
     * 条件日志输出（仅在调试模式下）
     */
    log(...args) {
        if (this.settings.debugMode) {
            console.log('[粘贴优化]', ...args);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        this.log('粘贴优化插件已卸载');
    }
}

/**
 * 设置页面
 */
class PasteOptimizerSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '粘贴优化设置' });

        // 功能开关
        new obsidian.Setting(containerEl)
            .setName('去除列表空行')
            .setDesc('自动去除粘贴时列表项之间的空行')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.removeListBlankLines)
                .onChange(async (value) => {
                    this.plugin.settings.removeListBlankLines = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('清理 Books 版权信息')
            .setDesc('自动清理从 Apple Books 复制的版权声明')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cleanBooksCopyright)
                .onChange(async (value) => {
                    this.plugin.settings.cleanBooksCopyright = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('自动添加列表格式')
            .setDesc('清理 Books 内容时，自动为每行添加列表标记（- ）。关闭此选项将保留原文段落格式')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoAddListFormat)
                .onChange(async (value) => {
                    this.plugin.settings.autoAddListFormat = value;
                    await this.plugin.saveSettings();
                }));

        // 高级设置
        containerEl.createEl('h3', { text: '高级设置' });

        new obsidian.Setting(containerEl)
            .setName('调试模式')
            .setDesc('在控制台输出详细的调试信息（开发者选项）')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        // 使用说明
        containerEl.createEl('h3', { text: '使用说明' });
        
        const descEl = containerEl.createDiv();
        descEl.innerHTML = `
            <p><strong>自动功能：</strong></p>
            <ul>
                <li>粘贴时自动处理（根据上述设置）</li>
            </ul>
            <p><strong>手动命令（Ctrl/Cmd + P）：</strong></p>
            <ul>
                <li><code>去除列表项之间的空行</code> - 处理选中文本或整个文档</li>
                <li><code>清理当前列表的空行</code> - 清理光标所在的列表</li>
                <li><code>清理 Books 版权信息</code> - 清理选中的 Books 内容</li>
            </ul>
            <p><strong>提示：</strong></p>
            <ul>
                <li>从 Books 复制时会自动清理版权信息和引号</li>
                <li>从 Obsidian 内部复制列表时会自动去除空行</li>
                <li>如遇问题，可开启调试模式查看详细日志</li>
            </ul>
        `;
    }
}

module.exports = PasteOptimizerPlugin;