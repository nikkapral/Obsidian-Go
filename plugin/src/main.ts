import type http from "node:http";
import { FileSystemAdapter, Notice, Plugin, type TAbstractFile } from "obsidian";
import { collectCards, generateForNote } from "./generator";
import { DEFAULT_SETTINGS, type PluginSettings } from "./settings";
import { ObsidianCheckSettingTab } from "./settings-tab";
import { startServer } from "./server";
import { DeckStore } from "./store";

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
		await this.store.markStale(this.collectMtimes());

		const onVaultEvent = (file: TAbstractFile, oldPath?: string) => {
			const tracked = (p: string) =>
				this.settings.trackedPaths.some((path) => p === path || p.startsWith(`${path}/`));
			if (tracked(file.path) || (oldPath !== undefined && tracked(oldPath))) {
				void this.store.markStale(this.collectMtimes());
			}
		};
		this.registerEvent(this.app.vault.on("modify", onVaultEvent));
		this.registerEvent(this.app.vault.on("create", onVaultEvent));
		this.registerEvent(this.app.vault.on("delete", onVaultEvent));
		this.registerEvent(this.app.vault.on("rename", onVaultEvent));

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
					new Notice("Obsidian Check: ошибка генерации (Kimi), кеш не изменён");
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

		const inputs = [];
		const notes: Record<string, number> = {};
		for (const file of files) {
			inputs.push({
				title: file.basename,
				path: file.path,
				content: await this.app.vault.cachedRead(file),
			});
			notes[file.path] = file.stat.mtime;
		}

		const { cards, failed } = await collectCards(inputs, (note) =>
			generateForNote(this.settings, note),
		);
		if (failed.length > 0) {
			throw new Error(`Ошибка генерации (Kimi) для: ${failed.join(", ")}`);
		}

		await this.store.saveDeck({
			path,
			generatedAt: Date.now(),
			stale: false,
			notes,
			cards,
		});
	}

	private collectMtimes(): Record<string, Record<string, number>> {
		const files = this.app.vault.getMarkdownFiles();
		const result: Record<string, Record<string, number>> = {};
		for (const path of this.settings.trackedPaths) {
			const mtimes: Record<string, number> = {};
			for (const file of files) {
				if (file.path === path || file.path.startsWith(`${path}/`)) {
					mtimes[file.path] = file.stat.mtime;
				}
			}
			result[path] = mtimes;
		}
		return result;
	}

	async loadSettings(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
