import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// We use Biome for linting instead of ESLint
	// Instrumentation is enabled by default in Next.js 16

	// Note: The turbopack root warning can be ignored or you can remove
	// the parent pnpm-lock.yaml file at /Users/tyler/Projects/pnpm-lock.yaml
};

export default nextConfig;
