import { PluginSettingTab, Setting, type App } from "obsidian";
import type ObsidianCheckPlugin from "./main";

export class ObsidianCheckSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ObsidianCheckPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Kimi API key")
			.setDesc("Ключ доступа к Kimi (Moonshot) API")
			.addText((text) => {
				text.inputEl.type = "password";
				text.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("Базовый URL Kimi API")
			.addText((text) =>
				text.setValue(this.plugin.settings.baseUrl).onChange(async (value) => {
					this.plugin.settings.baseUrl = value.trim();
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Model")
			.setDesc("Модель Kimi для генерации карточек")
			.addText((text) =>
				text.setValue(this.plugin.settings.model).onChange(async (value) => {
					this.plugin.settings.model = value.trim();
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Port")
			.setDesc("Порт локального HTTP-сервера (применяется после перезапуска плагина)")
			.addText((text) =>
				text.setValue(String(this.plugin.settings.port)).onChange(async (value) => {
					const port = Number.parseInt(value, 10);
					if (Number.isInteger(port) && port > 0 && port < 65536) {
						this.plugin.settings.port = port;
						await this.plugin.saveSettings();
					}
				}),
			);

		new Setting(containerEl)
			.setName("Tracked paths")
			.setDesc("Заметки и папки для генерации колод, по строке на путь")
			.addTextArea((text) =>
				text.setValue(this.plugin.settings.trackedPaths.join("\n")).onChange(async (value) => {
					this.plugin.settings.trackedPaths = value
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean);
					await this.plugin.saveSettings();
				}),
			);
	}
}
