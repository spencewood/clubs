import fs from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import { createCaddyAPIClient } from "./lib/caddy-api-client.js";
import { getCaddyfileStats } from "./parser.js";
import { validateCaddyfile } from "./validator.js";

const CADDYFILES_DIR = process.env.CADDYFILES_DIR || "./caddyfiles";
const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

// Create Caddy API client
const caddyAPI = createCaddyAPIClient(CADDY_API_URL);

const fastify = Fastify({
	logger: true,
});

// Enable CORS
await fastify.register(import("@fastify/cors"), {
	origin: "*",
});

interface CaddyfileInfo {
	name: string;
	path: string;
	stats: {
		siteBlocks: number;
		directives: number;
	};
}

interface FilenameParams {
	filename: string;
}

// List all Caddyfiles
fastify.get("/api/caddyfiles", async (_request, reply) => {
	try {
		const files = await fs.readdir(CADDYFILES_DIR);
		const potentialCaddyfiles = files.filter(
			(f) => f === "Caddyfile" || f.endsWith(".caddy"),
		);

		// Validate each file and only return valid ones
		const validCaddyfiles: CaddyfileInfo[] = [];

		for (const filename of potentialCaddyfiles) {
			try {
				const filepath = path.join(CADDYFILES_DIR, filename);
				const content = await fs.readFile(filepath, "utf-8");
				const validation = validateCaddyfile(content);

				if (validation.valid) {
					const stats = getCaddyfileStats(content);
					validCaddyfiles.push({
						name: filename,
						path: filepath,
						stats: {
							siteBlocks: stats.siteBlocks,
							directives: stats.directives,
						},
					});
				} else {
					fastify.log.info(
						`Skipping ${filename}: ${validation.errors.join(", ")}`,
					);
				}
			} catch (error) {
				fastify.log.error({ err: error }, `Error validating ${filename}`);
			}
		}

		return validCaddyfiles;
	} catch (error) {
		fastify.log.error({ err: error }, "Failed to list files");
		reply.code(500).send({ error: "Failed to list files" });
	}
});

// Get a specific Caddyfile
fastify.get<{ Params: FilenameParams }>(
	"/api/caddyfiles/:filename",
	async (request, reply) => {
		const { filename } = request.params;

		// Security: prevent directory traversal
		if (filename.includes("..") || filename.includes("/")) {
			return reply.code(400).send({ error: "Invalid filename" });
		}

		try {
			const filepath = path.join(CADDYFILES_DIR, filename);
			const content = await fs.readFile(filepath, "utf-8");
			reply.type("text/plain").send(content);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				reply.code(404).send({ error: "File not found" });
			} else {
				fastify.log.error({ err: error }, "Failed to read file");
				reply.code(500).send({ error: "Failed to read file" });
			}
		}
	},
);

// Save a Caddyfile
fastify.put<{ Params: FilenameParams }>(
	"/api/caddyfiles/:filename",
	async (request, reply) => {
		const { filename } = request.params;

		// Security: prevent directory traversal
		if (filename.includes("..") || filename.includes("/")) {
			return reply.code(400).send({ error: "Invalid filename" });
		}

		try {
			const filepath = path.join(CADDYFILES_DIR, filename);
			await fs.writeFile(filepath, request.body as string, "utf-8");
			return { message: "File saved successfully" };
		} catch (error) {
			fastify.log.error({ err: error }, "Failed to save file");
			reply.code(500).send({ error: "Failed to save file" });
		}
	},
);

// Check Caddy API status
fastify.get("/api/caddy/status", async (_request, _reply) => {
	try {
		const isAvailable = await caddyAPI.isAvailable();
		const status = isAvailable
			? await caddyAPI.getStatus()
			: { running: false };

		return {
			available: isAvailable,
			...status,
			url: CADDY_API_URL,
		};
	} catch (error) {
		fastify.log.error({ err: error }, "Failed to check Caddy API status");
		return {
			available: false,
			running: false,
			url: CADDY_API_URL,
		};
	}
});

// Start server
const start = async () => {
	try {
		// Ensure caddyfiles directory exists
		await fs.mkdir(CADDYFILES_DIR, { recursive: true });

		const port = Number(process.env.API_PORT) || 8080;
		await fastify.listen({ port, host: "0.0.0.0" });
		fastify.log.info(`Server listening on port ${port}`);
	} catch (err) {
		fastify.log.error({ err }, "Failed to start server");
		process.exit(1);
	}
};

start();
