import esbuild from "esbuild";
import { builtinModules } from "node:module";

const prod = process.argv[2] === "production";

const options = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	format: "cjs",
	platform: "node",
	target: "es2018",
	outfile: "main.js",
	sourcemap: prod ? false : "inline",
	minify: prod,
	external: ["obsidian", "electron", ...builtinModules],
};

if (prod) {
	await esbuild.build(options);
} else {
	const ctx = await esbuild.context(options);
	await ctx.watch();
}
