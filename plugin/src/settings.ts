export interface PluginSettings {
	apiKey: string;
	baseUrl: string;
	model: string;
	port: number;
	trackedPaths: string[];
}

export const DEFAULT_SETTINGS: PluginSettings = {
	apiKey: "",
	baseUrl: "https://api.moonshot.ai/v1",
	model: "moonshot-v1-8k",
	port: 27124,
	trackedPaths: [],
};
