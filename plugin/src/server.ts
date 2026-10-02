import http from "node:http";
import type { DeckStore } from "./store";

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

export function startServer(opts: {
	port: number;
	store: DeckStore;
	regenerate: (path: string) => Promise<void>;
}): http.Server {
	const { store, regenerate } = opts;
	const server = http.createServer((req, res) => {
		void handle(req, res).catch(() => sendJson(res, 500, { error: "internal error" }));
	});
	server.listen(opts.port);
	server.on("error", (err) => {
		console.error(`obsidian-check: HTTP server error: ${err.message}`);
	});

	async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		const url = new URL(req.url ?? "/", "http://localhost");
		const pathname = url.pathname;

		if (req.method === "GET" && pathname === "/decks") {
			sendJson(
				res,
				200,
				store.getDecks().map((d) => ({ path: d.path, cardCount: d.cards.length, stale: d.stale })),
			);
			return;
		}

		const isRegenerate = req.method === "POST" && pathname.endsWith("/regenerate");
		const prefix = "/decks/";
		if (
			(req.method === "GET" || isRegenerate) &&
			pathname.startsWith(prefix) &&
			pathname.length > prefix.length
		) {
			const raw = isRegenerate
				? pathname.slice(prefix.length, -"/regenerate".length)
				: pathname.slice(prefix.length);
			if (!raw) {
				sendJson(res, 404, { error: "not found" });
				return;
			}
			const path = decodeURIComponent(raw);
			const deck = store.getDeck(path);
			if (!deck) {
				sendJson(res, 404, { error: `deck not found: ${path}` });
				return;
			}
			if (isRegenerate) {
				try {
					await regenerate(path);
				} catch (err) {
					sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
					return;
				}
				sendJson(res, 200, { ok: true });
			} else {
				sendJson(res, 200, deck);
			}
			return;
		}

		sendJson(res, 404, { error: "not found" });
	}

	return server;
}
