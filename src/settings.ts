import {
    App,
    PluginSettingTab,
    Setting,
} from 'obsidian';

import FolderNotePlugin from './main';

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------

export interface FolderNotePluginSettings {
    folderNoteHide: boolean;
    folderNoteType: string;
    folderNoteName: string;
    folderNoteKey: string;
    folderNoteAutoRename: boolean;
    folderDelete2Note: boolean;
    folderNoteStrInit: string;
}

export const FOLDER_NOTE_DEFAULT_SETTINGS: FolderNotePluginSettings = {
    folderNoteHide: true,
    folderNoteType: 'inside',
    folderNoteName: '_索引_',
    folderNoteKey: 'ctrl',
    folderNoteAutoRename: true,
    folderDelete2Note: false,
    folderNoteStrInit: '# {{FOLDER_NAME}} 预览\n {{FOLDER_BRIEF_LIVE}} \n'
}

// ------------------------------------------------------------
// Settings Tab
// ------------------------------------------------------------

export class FolderNoteSettingTab extends PluginSettingTab {
    plugin: FolderNotePlugin;

    constructor(app: App, plugin: FolderNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: '文件夹笔记: 设置' });

        new Setting(containerEl)
            .setName('笔记文件方法')
            .setDesc('选择放置文件夹备注文件的方法。(阅读文档了解更多信息。)')
            .addDropdown(dropDown =>
                dropDown
                .addOption('index', '索引文件')
                .addOption('inside', '文件夹名称置于内部')
                .addOption('outside', '文件夹名称置于外部')
                .setValue(this.plugin.settings.folderNoteType || 'inside')
                .onChange((value: string) => {
                    this.plugin.settings.folderNoteType = value;
                    this.plugin.saveSettings();
                    this.display();
                }));

        if (this.plugin.settings.folderNoteType == 'index') {
            new Setting(containerEl)
                .setName('索引文件名称')
                .setDesc('设置文件夹备注的索引文件名。（仅适用于索引方法）')
                .addText(text => text
                    .setValue(this.plugin.settings.folderNoteName)
                    .onChange(async (value) => {
                        // console.log('Secret: ' + value);
                        this.plugin.settings.folderNoteName = value;
                        await this.plugin.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('初始内容')
            .setDesc('设置新建文件夹备注的初始内容。{{FOLDER_NAME}} 将被替换为当前文件夹名称.')
            .addTextArea(text => {
                text
                    .setPlaceholder('About the folder.')
                    .setValue(this.plugin.settings.folderNoteStrInit)
                    .onChange(async (value) => {
                        try {
                            this.plugin.settings.folderNoteStrInit = value;
                            await this.plugin.saveSettings();
                        } catch (e) {
                            return false;
                        }
                    })
                text.inputEl.rows = 8;
                text.inputEl.cols = 50;
            });
        
        new Setting(containerEl)
            .setName('新笔记的按键')
            .setDesc('按住按键并点击文件夹以创建文件夹笔记文件。')
            .addDropdown(dropDown =>
                dropDown
                .addOption('ctrl', 'Ctrl + Click')
                .addOption('alt', 'Alt + Click')
                .setValue(this.plugin.settings.folderNoteKey || 'ctrl')
                .onChange((value: string) => {
                    this.plugin.settings.folderNoteKey = value;
                    this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('隐藏文件夹笔记')
            .setDesc('在文件资源管理器面板中隐藏文件夹备注文件。')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.folderNoteHide);
                toggle.onChange(async (value) => {
                    this.plugin.settings.folderNoteHide = value;
                    await this.plugin.saveSettings();
                });
            });
        
        if (this.plugin.settings.folderNoteType != 'index') {
            new Setting(containerEl)
                .setName('自动重命名')
                .setDesc('尝试在文件夹名称更改时自动重命名文件夹备注。（实验性功能）')
                .addToggle((toggle) => {
                    toggle.setValue(this.plugin.settings.folderNoteAutoRename);
                    toggle.onChange(async (value) => {
                        this.plugin.settings.folderNoteAutoRename = value;
                        await this.plugin.saveSettings();
                    });
                });
        }
        
        if (this.plugin.settings.folderNoteType == 'outside') {
            new Setting(containerEl)
                .setName('删除文件夹笔记')
                .setDesc('尝试在删除文件夹时删除文件夹笔记。（危险操作）')
                .addToggle((toggle) => {
                    toggle.setValue(this.plugin.settings.folderDelete2Note);
                    toggle.onChange(async (value) => {
                        this.plugin.settings.folderDelete2Note = value;
                        await this.plugin.saveSettings();
                    });
                });
        }
    }
}
