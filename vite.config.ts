import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
		},
	},
	build: {
		minify: "esbuild",
		rollupOptions: {
			output: {
				manualChunks: {
					"react-vendor": ["react", "react-dom"],
					"codemirror": [
						"@codemirror/lang-javascript",
						"@codemirror/language",
						"@codemirror/state",
						"@codemirror/view",
						"@lezer/highlight",
						"@uiw/react-codemirror",
					],
					"radix-ui": [
						"@radix-ui/react-checkbox",
						"@radix-ui/react-dialog",
						"@radix-ui/react-label",
						"@radix-ui/react-select",
					],
					"ui-vendor": [
						"lucide-react",
						"sonner",
						"clsx",
						"tailwind-merge",
						"class-variance-authority",
					],
				},
			},
		},
		target: "es2020",
		chunkSizeWarningLimit: 1000,
	},
	optimizeDeps: {
		include: [
			"react",
			"react-dom",
			"@codemirror/lang-javascript",
			"@codemirror/language",
			"@codemirror/state",
			"@codemirror/view",
		],
	},
});
