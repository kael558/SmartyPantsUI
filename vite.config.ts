import electron from "vite-plugin-electron/simple";

export default {
	plugins: [
		electron({
			main: {
				// Shortcut of `build.lib.entry`
				entry: "src/main/main.js",
			},
			preload: {
				// Shortcut of `build.rollupOptions.input`
				input: "src/preload/preload.mjs",
			},
			// Optional: Use Node.js API in the Renderer process
			renderer: {},
		}),
	],
	build: {
		rollupOptions: {
			input: "src/main/main.js", // Your main entry file
			output: {
				file: "out/main/index.js", // Output location and filename expected by Vite
			},
		},
	},
};
