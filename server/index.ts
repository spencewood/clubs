import fs from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import { getEnhancedStats } from "./lib/advanced-parser.js";
import { createCaddyAPIClient } from "./lib/caddy-api-client.js";
import { validateCaddyfile } from "./validator.js";

const CADDYFILE_PATH = process.env.CADDYFILE_PATH || "./config/Caddyfile";
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

// Get the Caddyfile
fastify.get("/api/caddyfile", async (_request, reply) => {
	try {
		// Always read from file - Caddy's Admin API returns JSON, not Caddyfile format
		// The "live" mode refers to the ability to apply changes via the API, not read config
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");
		reply.type("text/plain").send(content);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// If file doesn't exist, check if we can read from live Caddy instead
			const isAvailable = await caddyAPI.isAvailable();
			if (isAvailable) {
				try {
					const response = await fetch(`${CADDY_API_URL}/config/`, {
						headers: {
							Accept: "text/caddyfile",
						},
					});

					if (response.ok) {
						const content = await response.text();
						return reply.type("text/plain").send(content);
					}
				} catch (liveError) {
					fastify.log.error(
						{ err: liveError },
						"Failed to read from live Caddy",
					);
				}
			}

			reply.code(404).send({ error: "Caddyfile not found" });
		} else {
			fastify.log.error({ err: error }, "Failed to read Caddyfile");
			reply.code(500).send({ error: "Failed to read Caddyfile" });
		}
	}
});

// Save the Caddyfile
fastify.put("/api/caddyfile", async (request, reply) => {
	try {
		await fs.writeFile(CADDYFILE_PATH, request.body as string, "utf-8");
		return { message: "Caddyfile saved successfully" };
	} catch (error) {
		fastify.log.error({ err: error }, "Failed to save Caddyfile");
		reply.code(500).send({ error: "Failed to save Caddyfile" });
	}
});

// Get Caddyfile stats
fastify.get("/api/caddyfile/stats", async (_request, reply) => {
	try {
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");
		const stats = getEnhancedStats(content);
		return stats;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			reply.code(404).send({ error: "Caddyfile not found" });
		} else {
			fastify.log.error({ err: error }, "Failed to get Caddyfile stats");
			reply.code(500).send({ error: "Failed to get Caddyfile stats" });
		}
	}
});

// Format Caddyfile using Caddy's built-in formatter
fastify.post("/api/caddyfile/format", async (request, reply) => {
	try {
		const content =
			typeof request.body === "string" ? request.body : String(request.body);

		// Try to use `caddy fmt` CLI command if available
		try {
			const { exec } = await import("node:child_process");
			const { promisify } = await import("node:util");
			const execAsync = promisify(exec);

			// Write content to temp file, format it, read it back
			const tmpFile = `/tmp/caddyfile-${Date.now()}`;
			await fs.writeFile(tmpFile, content, "utf-8");

			const { stderr } = await execAsync(`caddy fmt --overwrite ${tmpFile}`);

			if (stderr && !stderr.includes("Caddyfile formatted")) {
				fastify.log.warn({ stderr }, "Caddy format warning");
			}

			const formatted = await fs.readFile(tmpFile, "utf-8");
			await fs.unlink(tmpFile); // Clean up temp file

			return reply.type("application/json").send({
				formatted: true,
				content: formatted,
			});
		} catch (cliError) {
			// If caddy fmt fails or is not available, validate and return original
			fastify.log.warn(
				{ err: cliError },
				"Caddy fmt not available, falling back to validation only",
			);

			const adaptResponse = await fetch(`${CADDY_API_URL}/load`, {
				method: "POST",
				headers: {
					"Content-Type": "text/caddyfile",
				},
				body: content,
			});

			if (!adaptResponse.ok) {
				const errorText = await adaptResponse.text();
				return reply.code(400).send({
					error: "Invalid Caddyfile",
					details: errorText || "Caddy could not parse the configuration",
				});
			}

			// Validation passed but formatting not available - return original with warning
			return reply.type("application/json").send({
				formatted: false,
				content: content,
				warning: "Caddy fmt not available - returning unformatted content",
			});
		}
	} catch (error) {
		fastify.log.error({ err: error }, "Failed to format Caddyfile");
		reply.code(500).send({ error: "Failed to format Caddyfile" });
	}
});

// Apply Caddyfile to Caddy via Admin API
fastify.post("/api/caddyfile/apply", async (_request, reply) => {
	try {
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");

		// Validate the Caddyfile first
		const validation = validateCaddyfile(content);
		if (!validation.valid) {
			return reply.code(400).send({
				error: "Invalid Caddyfile",
				details: validation.errors.join(", "),
			});
		}

		// First, convert Caddyfile to JSON using Caddy's adapter API
		const adaptResponse = await fetch(`${CADDY_API_URL}/load`, {
			method: "POST",
			headers: {
				"Content-Type": "text/caddyfile",
			},
			body: content,
		});

		if (!adaptResponse.ok) {
			const errorText = await adaptResponse.text();
			return reply.code(500).send({
				error: "Failed to apply configuration",
				details: errorText || "Caddy rejected the configuration",
			});
		}

		return { message: "Configuration applied successfully" };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			reply.code(404).send({ error: "Caddyfile not found" });
		} else {
			fastify.log.error({ err: error }, "Failed to apply Caddyfile");
			reply.code(500).send({
				error: "Failed to apply Caddyfile",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
});

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

// Get full Caddy JSON configuration
fastify.get("/api/caddy/config", async (_request, reply) => {
	try {
		const response = await fetch(`${CADDY_API_URL}/config/`);

		if (!response.ok) {
			return reply.code(response.status).send({
				error: "Failed to fetch configuration",
				details: await response.text(),
			});
		}

		const config = await response.json();
		return reply.type("application/json").send(config);
	} catch (error) {
		fastify.log.error({ err: error }, "Failed to fetch Caddy config");
		reply.code(500).send({
			error: "Failed to fetch configuration",
			details: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Get JSON configuration for specific @id
fastify.get<{ Params: { id: string } }>(
	"/api/caddy/config/:id",
	async (request, reply) => {
		try {
			const { id } = request.params;
			const response = await fetch(`${CADDY_API_URL}/id/${id}`);

			if (!response.ok) {
				if (response.status === 404) {
					return reply.code(404).send({
						error: "Configuration not found",
						details: `No configuration found with @id "${id}"`,
					});
				}
				return reply.code(response.status).send({
					error: "Failed to fetch configuration",
					details: await response.text(),
				});
			}

			const config = await response.json();
			return reply.type("application/json").send(config);
		} catch (error) {
			fastify.log.error({ err: error }, "Failed to fetch Caddy config by ID");
			reply.code(500).send({
				error: "Failed to fetch configuration",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

// Adapt a Caddyfile snippet to JSON
fastify.post("/api/caddy/adapt", async (request, reply) => {
	try {
		const content =
			typeof request.body === "string" ? request.body : String(request.body);

		// Use Caddy's /adapt endpoint to convert Caddyfile to JSON
		const adaptResponse = await fetch(`${CADDY_API_URL}/adapt`, {
			method: "POST",
			headers: {
				"Content-Type": "text/caddyfile",
			},
			body: content,
		});

		if (!adaptResponse.ok) {
			const errorText = await adaptResponse.text();
			return reply.code(adaptResponse.status).send({
				error: "Failed to adapt Caddyfile",
				details: errorText,
			});
		}

		const config = (await adaptResponse.json()) as Record<string, unknown>;

		// Extract just the HTTP app's server configuration for this site
		// This is more focused than returning the entire config
		const apps = config?.apps as Record<string, unknown> | undefined;
		const http = apps?.http as Record<string, unknown> | undefined;
		const servers = http?.servers as Record<string, unknown> | undefined;

		if (servers) {
			const serverKeys = Object.keys(servers);

			// If there's only one server, return its routes
			if (serverKeys.length === 1) {
				return reply.type("application/json").send({
					server: serverKeys[0],
					config: servers[serverKeys[0]],
				});
			}
		}

		// Fallback: return the entire config if we can't extract cleanly
		return reply.type("application/json").send(config);
	} catch (error) {
		fastify.log.error({ err: error }, "Failed to adapt Caddyfile");
		reply.code(500).send({
			error: "Failed to adapt Caddyfile",
			details: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Start server
const start = async () => {
	try {
		// Ensure config directory exists
		const configDir = path.dirname(CADDYFILE_PATH);
		await fs.mkdir(configDir, { recursive: true });

		// Create empty Caddyfile if it doesn't exist
		try {
			await fs.access(CADDYFILE_PATH);
		} catch {
			fastify.log.info("Creating empty Caddyfile");
			await fs.writeFile(CADDYFILE_PATH, "", "utf-8");
		}

		const port = Number(process.env.API_PORT) || 8080;
		await fastify.listen({ port, host: "0.0.0.0" });
		fastify.log.info(`Server listening on port ${port}`);
		fastify.log.info(`Using Caddyfile at: ${CADDYFILE_PATH}`);
	} catch (err) {
		fastify.log.error({ err }, "Failed to start server");
		process.exit(1);
	}
};

start();
