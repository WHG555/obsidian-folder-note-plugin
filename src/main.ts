import {
    Plugin,
    MarkdownView
} from 'obsidian';

import * as Yaml from 'yaml';
import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { ccardProcessor } from './ccard-block';

import { 
    FolderNotePluginSettings, 
    FOLDER_NOTE_DEFAULT_SETTINGS, 
    FolderNoteSettingTab 
} from './settings';

// ------------------------------------------------------------
// FolderNotePlugin
// ------------------------------------------------------------

enum NoteFileMethod {
    Index, Inside, Outside,
}

export default class FolderNotePlugin extends Plugin {
    settings: FolderNotePluginSettings;
    folderNote: FolderNote;

    async onload() {
        console.log('Loading Folder Note plugin.');

        // load settings
        await this.loadSettings();
        
        // for ccard rendering
        this.registerMarkdownCodeBlockProcessor('ccard', async (source, el, ctx) => {
            // run processer
            let proc = new ccardProcessor(this.app, this);
            await proc.run(source, el, ctx, this.folderNote);
        });

        // for rename event
        this.registerEvent(this.app.vault.on('rename', 
            (newPath, oldPath) => this.handleFileRename(newPath, oldPath)));

        // for remove folder
        this.registerEvent(this.app.vault.on('delete', 
            (file) => this.handleFileDelete(file) ));

        // auto-refresh folder brief cards when notes change
        this.registerEvent(this.app.vault.on('modify', (file) => {
            this.scheduleRefresh();
        }));
        this.registerEvent(this.app.vault.on('create', (file) => {
            this.scheduleRefresh();
        }));
        this.registerEvent(this.app.vault.on('delete', (file) => {
            this.scheduleRefresh();
        }));

        // for settings
        this.addSettingTab(new FolderNoteSettingTab(this.app, this));

        // for file explorer click
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // get the folder path
            const elemTarget = (evt.target as Element);
            var folderElem = this.folderNote.setByFolderElement(elemTarget);

            // open the infor note
            if (this.folderNote.folderPath.length > 0) {
                // any key?
                var newKey = false;
                if (this.settings.folderNoteKey == 'ctrl') {
                    newKey = (evt.ctrlKey || evt.metaKey);
                }
                else if (this.settings.folderNoteKey == 'alt') {
                    newKey = evt.altKey;
                }

                // open it
                this.folderNote.openFolderNote(folderElem, newKey);
            }
        });

        this.addCommand({
            id: 'insert-folder-brief',
            name: 'Insert Folder Brief',
            callback: async () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    const editor = view.sourceMode.cmEditor;
                    const activeFile = this.app.workspace.getActiveFile();
                    // generate brief
                    let folderBrief = new FolderBrief(this.app);
                    let folderPath = await this.folderNote.getNoteFolderBriefPath(activeFile.path);
                    let briefCards = await folderBrief.makeBriefCards(folderPath, activeFile.path);
                    editor.replaceSelection(briefCards.getYamlCode(), "end");
                }
            },
            hotkeys: []
        });

        this.addCommand({
            id: 'note-to-folder',
            name: 'Make Current Note to Folder',
            callback: async () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    const activeFile = this.app.workspace.getActiveFile();
                    this.folderNote.setByNotePath(activeFile.path);
                    await this.folderNote.newNoteFolder();
                }
            },
            hotkeys: []
        });
    }

    onunload() {
        console.log('Unloading Folder Note plugin');
    }

    updateFolderNote() {
        this.folderNote = new FolderNote(
            this.app, 
            this.settings.folderNoteType, 
            this.settings.folderNoteName);
        this.folderNote.initContent = this.settings.folderNoteStrInit;
        this.folderNote.hideNoteFile = this.settings.folderNoteHide;
    }

    async loadSettings() {
        this.settings = Object.assign(FOLDER_NOTE_DEFAULT_SETTINGS, await this.loadData());
        this.updateFolderNote();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateFolderNote();
    }

    // keep notefile name to be the folder name
    async handleFileRename(newPath: any, oldPath: any) {
        if (!this.settings.folderNoteAutoRename) return;
        this.folderNote.syncName(newPath, oldPath);
    }

    // delete folder
    async handleFileDelete(pathToDel: any) {
        if (!this.settings.folderDelete2Note) return;
        this.folderNote.deleteFolder(pathToDel.path);
    }

    // ------------------------------------------------------------
    // Auto-refresh folder brief cards
    // ------------------------------------------------------------

    private _refreshTimer: number | null = null;

    // Debounce: aggregate rapid file changes into a single refresh
    scheduleRefresh() {
        if (this._refreshTimer !== null) {
            window.clearTimeout(this._refreshTimer);
        }
        this._refreshTimer = window.setTimeout(() => {
            this._refreshTimer = null;
            this.refreshOpenMarkdownViews();
        }, 400);
    }

    // Re-render all open markdown preview views so ccard blocks re-read latest content
    async refreshOpenMarkdownViews() {
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            if (!view || !view.file) continue;
            if (!view.previewMode) continue;
            try {
                // Re-read file content and re-set it to force Obsidian to
                // re-parse the markdown and re-run code block processors
                const data = await this.app.vault.read(view.file);
                view.previewMode.set(data, true);
            } catch (e) {
                // fallback: try simple full re-render
                try {
                    view.previewMode.rerender(true);
                } catch {}
            }
        }
    }
}
