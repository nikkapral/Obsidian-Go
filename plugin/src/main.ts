import type http from "node:http";
import { FileSystemAdapter, Notice, Plugin } from "obsidian";
import { generateForNote } from "./generator";
import { DEFAULT_SETTINGS, type PluginSettings } from "./settings";
import { ObsidianCheckSettingTab } from "./settings-tab";
import { startServer } from "./server";
import { DeckStore } from "./store";
import type { Card } from "./types";

export default class ObsidianCheckPlugin extends Plugin {
	settings: PluginSettings = { ...DEFAULT_SETTINGS };
	private store!: DeckStore;
	private server?: http.Server;

	async onload(): Promise<void> {
		await this.loadSettings();

		let basePath = ".";
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			basePath = this.app.vault.adapter.getBasePath();
		} else {
			console.warn("Obsidian Check: vault adapter не FileSystemAdapter, кеш колод в '.'");
		}
		this.store = new DeckStore(basePath);
		await this.store.load();

		this.server = startServer({
			port: this.settings.port,
			store: this.store,
			regenerate: (path) => this.regenerateDeck(path),
		});

		this.addCommand({
			id: "regenerate-all-decks",
			name: "Regenerate all decks",
			callback: async () => {
				try {
					for (const path of this.settings.trackedPaths) {
						await this.regenerateDeck(path);
					}
					new Notice(`Obsidian Check: колоды обновлены (${this.settings.trackedPaths.length})`);
				} catch (error) {
					console.error("Obsidian Check: ошибка генерации", error);
					new Notice("Obsidian Check: ошибка генерации, см. консоль");
				}
			},
		});

		this.addSettingTab(new ObsidianCheckSettingTab(this.app, this));
	}

	onunload(): void {
		this.server?.close();
	}

	async regenerateDeck(path: string): Promise<void> {
		const files = this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path === path || file.path.startsWith(`${path}/`));

		const cards: Card[] = [];
		const notes: Record<string, number> = {};
		for (const file of files) {
			const content = await this.app.vault.cachedRead(file);
			const generated = await generateForNote(this.settings, {
				title: file.basename,
				path: file.path,
				content,
			});
			cards.push(...generated);
			notes[file.path] = file.stat.mtime;
		}

		await this.store.saveDeck({
			path,
			generatedAt: Date.now(),
			stale: false,
			notes,
			cards,
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
