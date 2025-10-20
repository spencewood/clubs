import { Server, Globe, Sparkles, Zap, Shield, ChevronDown } from "lucide-react";
import type { CaddyConfig, SiteBlock } from "@/types/caddyfile";
import { parseDirectiveWithFeatures } from "@/lib/caddy-features";
import { useState } from "react";

interface CaddyfileVisualizerProps {
	config: CaddyConfig;
}

interface DomainGroup {
	baseDomain: string;
	siteBlocks: SiteBlock[];
}

function extractBaseDomain(address: string): string {
	// Remove port if present (e.g., ":8080")
	if (address.startsWith(":")) {
		return "localhost";
	}

	// Extract domain from address
	const parts = address.split(".");

	// If it's a subdomain (e.g., app.example.com), get the base domain (example.com)
	if (parts.length >= 2) {
		return parts.slice(-2).join(".");
	}

	return address;
}

function DomainGroupCard({ group }: { group: DomainGroup }) {
	const [isExpanded, setIsExpanded] = useState(group.siteBlocks.length === 1);

	const isDomain = group.baseDomain !== "localhost";

	// Count HTTPS sites in this group
	const httpsCount = group.siteBlocks.filter((b) =>
		b.directives.some((d) => d.name === "tls"),
	).length;

	return (
		<div className="rounded-lg border bg-card">
			{/* Group Header */}
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-t-lg"
			>
				<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
					{isDomain ? (
						<Globe className="h-4 w-4 text-primary" />
					) : (
						<Server className="h-4 w-4 text-primary" />
					)}
				</div>
				<div className="flex-1 min-w-0 text-left">
					<div className="font-mono font-semibold truncate">
						{group.baseDomain}
					</div>
					<div className="text-sm text-muted-foreground flex items-center gap-3">
						<span>
							{group.siteBlocks.length}{" "}
							{group.siteBlocks.length === 1 ? "site" : "sites"}
						</span>
						{httpsCount > 0 && (
							<span className="flex items-center gap-1">
								<Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
								{httpsCount} secure
							</span>
						)}
					</div>
				</div>
				<ChevronDown
					className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
						isExpanded ? "rotate-180" : ""
					}`}
				/>
			</button>

			{/* Expanded Sites List */}
			{isExpanded && (
				<div className="border-t divide-y">
					{group.siteBlocks.map((block) => {
						// Get feature summary
						const features = block.directives
							.map((directive) => {
								const parsed = parseDirectiveWithFeatures(directive);
								return parsed ? parsed.feature.name : directive.name;
							})
							.filter((name, idx, arr) => arr.indexOf(name) === idx); // unique

						return (
							<div key={block.id} className="p-3 hover:bg-accent/30 transition-colors">
								<div className="flex items-start gap-3">
									<div className="flex-1 min-w-0">
										<div className="font-mono text-sm font-medium truncate">
											{block.addresses[0]}
										</div>
										{block.addresses.length > 1 && (
											<div className="text-xs text-muted-foreground">
												+{block.addresses.length - 1} more addresses
											</div>
										)}
										{features.length > 0 && (
											<div className="text-xs text-muted-foreground truncate mt-1">
												{features.slice(0, 2).join(", ")}
												{features.length > 2 && ` +${features.length - 2} more`}
											</div>
										)}
										{features.length === 0 && (
											<div className="text-xs text-muted-foreground italic mt-1">
												No configuration
											</div>
										)}
									</div>
									{block.directives.some((d) => d.name === "tls") && (
										<Shield className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

export function CaddyfileVisualizer({ config }: CaddyfileVisualizerProps) {
	// Analyze configuration for meaningful insights
	const insights = {
		httpsCount: config.siteBlocks.filter((b) =>
			b.directives.some((d) => d.name === "tls"),
		).length,
		proxyCount: config.siteBlocks.filter((b) =>
			b.directives.some((d) => d.name === "reverse_proxy"),
		).length,
		staticFileCount: config.siteBlocks.filter((b) =>
			b.directives.some((d) => d.name === "file_server"),
		).length,
	};

	// Group sites by base domain
	const domainGroups = new Map<string, SiteBlock[]>();

	for (const block of config.siteBlocks) {
		const primaryAddress = block.addresses[0] || "unknown";
		const baseDomain = extractBaseDomain(primaryAddress);

		if (!domainGroups.has(baseDomain)) {
			domainGroups.set(baseDomain, []);
		}
		domainGroups.get(baseDomain)?.push(block);
	}

	// Convert to array and sort by number of sites (descending)
	const groups: DomainGroup[] = Array.from(domainGroups.entries())
		.map(([baseDomain, siteBlocks]) => ({ baseDomain, siteBlocks }))
		.sort((a, b) => b.siteBlocks.length - a.siteBlocks.length);

	return (
		<div className="space-y-4">
			{/* Condensed Overview */}
			{config.siteBlocks.length > 0 && (
				<div className="rounded-lg border bg-card p-4">
					<div className="flex items-center gap-6 flex-wrap text-sm">
						{config.siteBlocks.length > 0 && (
							<div className="flex items-center gap-2">
								<Server className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium">{config.siteBlocks.length}</span>
								<span className="text-muted-foreground">
									{config.siteBlocks.length === 1 ? "site" : "sites"}
								</span>
							</div>
						)}
						{insights.httpsCount > 0 && (
							<div className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
								<span className="font-medium">{insights.httpsCount}</span>
								<span className="text-muted-foreground">with HTTPS</span>
							</div>
						)}
						{insights.proxyCount > 0 && (
							<div className="flex items-center gap-2">
								<Zap className="h-4 w-4 text-primary" />
								<span className="font-medium">{insights.proxyCount}</span>
								<span className="text-muted-foreground">
									{insights.proxyCount === 1 ? "proxy" : "proxies"}
								</span>
							</div>
						)}
						{insights.staticFileCount > 0 && (
							<div className="flex items-center gap-2">
								<Sparkles className="h-4 w-4 text-primary" />
								<span className="font-medium">{insights.staticFileCount}</span>
								<span className="text-muted-foreground">static file servers</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Grouped Sites */}
			<div className="space-y-3">
				{groups.map((group) => (
					<DomainGroupCard key={group.baseDomain} group={group} />
				))}
			</div>

			{/* Empty state */}
			{config.siteBlocks.length === 0 && (
				<div className="text-center py-12 rounded-lg border border-dashed">
					<div className="flex justify-center mb-3">
						<div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
							<Sparkles className="h-6 w-6 text-primary" />
						</div>
					</div>
					<div>
						<h3 className="font-semibold mb-1">No sites configured</h3>
						<p className="text-sm text-muted-foreground">
							Add your first site block to get started
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
