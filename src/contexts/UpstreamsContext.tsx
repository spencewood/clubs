"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { loadCaddyfile } from "@/lib/api";
import { parseCaddyfile } from "@/lib/parser/caddyfile-parser";
import { getConfiguredUpstreams } from "@/lib/upstream-utils";

export interface KnownUpstream {
	address: string; // Full address like "localhost:8080"
	server: string; // Just the server part like "localhost"
	port: number | null; // Port number if specified
	isCustom: boolean; // True if user-added, false if from config
}

interface UpstreamsContextType {
	upstreams: KnownUpstream[];
	loading: boolean;
	error: string | null;
	addCustomUpstream: (address: string) => void;
	removeCustomUpstream: (address: string) => void;
	refresh: () => Promise<void>;
}

const UpstreamsContext = createContext<UpstreamsContextType | undefined>(
	undefined,
);

const CUSTOM_UPSTREAMS_KEY = "clubs_custom_upstreams";

function parseUpstreamAddress(address: string): {
	server: string;
	port: number | null;
} {
	try {
		// Handle IPv6 addresses like [::1]:8080
		const ipv6Match = address.match(/^\[([^\]]+)\]:(\d+)$/);
		if (ipv6Match) {
			return { server: ipv6Match[1], port: Number.parseInt(ipv6Match[2], 10) };
		}

		// Handle regular addresses like localhost:8080 or 192.168.1.1:8080
		const parts = address.split(":");
		if (parts.length === 2) {
			return { server: parts[0], port: Number.parseInt(parts[1], 10) };
		}

		// No port specified
		return { server: address, port: null };
	} catch {
		return { server: address, port: null };
	}
}

export function UpstreamsProvider({ children }: { children: ReactNode }) {
	const [upstreams, setUpstreams] = useState<KnownUpstream[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load custom upstreams from localStorage
	const loadCustomUpstreams = useCallback((): string[] => {
		if (typeof window === "undefined") return [];
		try {
			const stored = localStorage.getItem(CUSTOM_UPSTREAMS_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}, []);

	// Save custom upstreams to localStorage
	const saveCustomUpstreams = useCallback((addresses: string[]) => {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(CUSTOM_UPSTREAMS_KEY, JSON.stringify(addresses));
		} catch (error) {
			console.error("Failed to save custom upstreams:", error);
		}
	}, []);

	// Fetch upstreams from Caddyfile
	const fetchUpstreamsFromConfig = useCallback(async (): Promise<string[]> => {
		try {
			const result = await loadCaddyfile();
			if (result.success && result.content) {
				const config = parseCaddyfile(result.content);
				return getConfiguredUpstreams(config);
			}
		} catch (error) {
			console.error("Failed to fetch upstreams from config:", error);
		}
		return [];
	}, []);

	// Consolidate all upstreams (configured + custom)
	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const [configuredAddresses, customAddresses] = await Promise.all([
				fetchUpstreamsFromConfig(),
				Promise.resolve(loadCustomUpstreams()),
			]);

			// Combine and deduplicate
			const allAddresses = new Set([
				...configuredAddresses,
				...customAddresses,
			]);

			const knownUpstreams: KnownUpstream[] = Array.from(allAddresses).map(
				(address) => {
					const { server, port } = parseUpstreamAddress(address);
					return {
						address,
						server,
						port,
						isCustom: customAddresses.includes(address),
					};
				},
			);

			// Sort: configured first, then custom; alphabetically within each group
			knownUpstreams.sort((a, b) => {
				if (a.isCustom !== b.isCustom) {
					return a.isCustom ? 1 : -1;
				}
				return a.address.localeCompare(b.address);
			});

			setUpstreams(knownUpstreams);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load upstreams");
		} finally {
			setLoading(false);
		}
	}, [fetchUpstreamsFromConfig, loadCustomUpstreams]);

	// Add a custom upstream
	const addCustomUpstream = useCallback(
		(address: string) => {
			const trimmed = address.trim();
			if (!trimmed) return;

			const current = loadCustomUpstreams();
			if (!current.includes(trimmed)) {
				const updated = [...current, trimmed];
				saveCustomUpstreams(updated);
				refresh();
			}
		},
		[loadCustomUpstreams, saveCustomUpstreams, refresh],
	);

	// Remove a custom upstream
	const removeCustomUpstream = useCallback(
		(address: string) => {
			const current = loadCustomUpstreams();
			const updated = current.filter((addr) => addr !== address);
			saveCustomUpstreams(updated);
			refresh();
		},
		[loadCustomUpstreams, saveCustomUpstreams, refresh],
	);

	// Initial load
	useEffect(() => {
		refresh();
	}, [refresh]);

	const value: UpstreamsContextType = {
		upstreams,
		loading,
		error,
		addCustomUpstream,
		removeCustomUpstream,
		refresh,
	};

	return (
		<UpstreamsContext.Provider value={value}>
			{children}
		</UpstreamsContext.Provider>
	);
}

export function useUpstreams() {
	const context = useContext(UpstreamsContext);
	if (context === undefined) {
		throw new Error("useUpstreams must be used within an UpstreamsProvider");
	}
	return context;
}
