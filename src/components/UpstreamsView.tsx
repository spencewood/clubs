"use client";

import {
	Activity,
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	RefreshCw,
	Server,
	WifiOff,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCaddyUpstreams, loadCaddyfile } from "@/lib/api";
import { parseCaddyfile } from "@/lib/parser/caddyfile-parser";
import {
	type ConsolidatedServer,
	consolidateUpstreamsWithConfig,
} from "@/lib/upstream-utils";
import type { CaddyConfig, CaddyUpstream } from "@/types/caddyfile";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

function getHealthStatus(server: ConsolidatedServer): {
	status: "healthy" | "degraded" | "unhealthy" | "offline";
	label: string;
	color: string;
	icon: typeof CheckCircle | typeof WifiOff;
} {
	// Check if offline first
	if (server.isOffline) {
		return {
			status: "offline",
			label: "Offline",
			color: "text-[var(--color-muted-foreground)]",
			icon: WifiOff,
		};
	}

	// Calculate failure rate
	const failureRate =
		server.totalRequests > 0
			? (server.totalFails / server.totalRequests) * 100
			: 0;

	// Consider unhealthy if failure rate > 10% or absolute fails > 20
	if (failureRate > 10 || server.totalFails > 20) {
		return {
			status: "unhealthy",
			label: "Unhealthy",
			color: "text-[var(--color-error)]",
			icon: AlertCircle,
		};
	}

	// Consider degraded if failure rate > 1% or fails between 5-20
	if (failureRate > 1 || (server.totalFails >= 5 && server.totalFails <= 20)) {
		return {
			status: "degraded",
			label: "Degraded",
			color: "text-[var(--color-warning)]",
			icon: AlertCircle,
		};
	}

	return {
		status: "healthy",
		label: "Healthy",
		color: "text-[var(--color-success)]",
		icon: CheckCircle,
	};
}

interface UpstreamsViewProps {
	initialUpstreams: CaddyUpstream[];
	initialConfig: CaddyConfig | null;
}

export function UpstreamsView({
	initialUpstreams,
	initialConfig,
}: UpstreamsViewProps) {
	const [upstreams, setUpstreams] = useState<CaddyUpstream[]>(initialUpstreams);
	const [caddyConfig, setCaddyConfig] = useState<CaddyConfig | null>(
		initialConfig,
	);
	const [refreshing, setRefreshing] = useState(false);
	const [statusFilter, setStatusFilter] = useState<
		"all" | "healthy" | "degraded" | "unhealthy" | "offline"
	>("all");

	const fetchUpstreams = useCallback(async () => {
		setRefreshing(true);

		try {
			// Fetch both upstreams stats and Caddyfile config
			const [upstreamsResult, caddyfileResult] = await Promise.all([
				getCaddyUpstreams(),
				loadCaddyfile(),
			]);

			if (upstreamsResult.success && upstreamsResult.upstreams) {
				setUpstreams(upstreamsResult.upstreams);
			} else {
				toast.error("Failed to fetch upstreams", {
					description: upstreamsResult.error || "Unknown error",
				});
			}

			if (caddyfileResult.success && caddyfileResult.content) {
				try {
					const config = parseCaddyfile(caddyfileResult.content);
					setCaddyConfig(config);
				} catch (parseError) {
					console.error("Failed to parse Caddyfile:", parseError);
					setCaddyConfig(null);
				}
			}
		} catch (error) {
			toast.error("Error fetching upstreams", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setRefreshing(false);
		}
	}, []);

	// Consolidate upstreams by server (ignoring port) and include offline ones
	const consolidatedServers = useMemo(() => {
		const servers = consolidateUpstreamsWithConfig(upstreams, caddyConfig);

		// Sort by health status: healthy -> degraded -> unhealthy -> offline
		const statusOrder = { healthy: 0, degraded: 1, unhealthy: 2, offline: 3 };

		return servers.sort((a, b) => {
			const statusA = getHealthStatus(a).status;
			const statusB = getHealthStatus(b).status;

			const orderDiff = statusOrder[statusA] - statusOrder[statusB];
			if (orderDiff !== 0) return orderDiff;

			// Within same health status, sort alphabetically by server
			return a.server.localeCompare(b.server);
		});
	}, [upstreams, caddyConfig]);

	useEffect(() => {
		// Auto-refresh every 5 seconds (skip initial fetch since we have initialUpstreams and initialConfig)
		const interval = setInterval(() => {
			fetchUpstreams();
		}, 5000);

		return () => clearInterval(interval);
	}, [fetchUpstreams]);

	if (consolidatedServers.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center space-y-3">
					<Activity className="w-12 h-12 mx-auto text-muted-foreground" />
					<div>
						<h3 className="font-semibold">No Upstreams Found</h3>
						<p className="text-sm text-muted-foreground mt-1">
							No reverse proxy upstreams are currently configured.
						</p>
						<p className="text-xs text-muted-foreground mt-2">
							Add{" "}
							<code className="px-1 py-0.5 bg-muted rounded">
								reverse_proxy
							</code>{" "}
							directives to your site blocks to see upstream health status here.
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Filter servers based on selected status
	const filteredServers =
		statusFilter === "all"
			? consolidatedServers
			: consolidatedServers.filter(
					(s) => getHealthStatus(s).status === statusFilter,
				);

	const healthyCount = consolidatedServers.filter(
		(s) => getHealthStatus(s).status === "healthy",
	).length;
	const degradedCount = consolidatedServers.filter(
		(s) => getHealthStatus(s).status === "degraded",
	).length;
	const unhealthyCount = consolidatedServers.filter(
		(s) => getHealthStatus(s).status === "unhealthy",
	).length;
	const offlineCount = consolidatedServers.filter(
		(s) => getHealthStatus(s).status === "offline",
	).length;

	return (
		<div className="space-y-6">
			{/* Header with refresh */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Upstream Health</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Monitor the health and status of your reverse proxy backends
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => fetchUpstreams()}
					disabled={refreshing}
					title="Refresh upstreams"
				>
					<RefreshCw
						className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
					/>
					<span className="hidden sm:inline ml-2">Refresh</span>
				</Button>
			</div>

			{/* Summary stats - clickable filters */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<Card
					className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
						statusFilter === "all"
							? "border-[var(--color-info-dark)] shadow-md"
							: "hover:border-muted-foreground/40"
					}`}
					onClick={() => setStatusFilter("all")}
				>
					<Server
						className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-info)] opacity-20"
						strokeWidth={1.5}
					/>
					<div className="relative">
						<p className="text-2xl font-bold">{consolidatedServers.length}</p>
						<p className="text-xs text-muted-foreground">Upstream Hosts</p>
					</div>
				</Card>

				<Card
					className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
						statusFilter === "healthy"
							? "border-[var(--color-success-dark)] shadow-md"
							: "hover:border-muted-foreground/40"
					}`}
					onClick={() => setStatusFilter("healthy")}
				>
					<CheckCircle
						className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-success)] opacity-20"
						strokeWidth={1.5}
					/>
					<div className="relative">
						<p className="text-2xl font-bold">{healthyCount}</p>
						<p className="text-xs text-muted-foreground">Healthy</p>
					</div>
				</Card>

				<Card
					className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
						statusFilter === "degraded"
							? "border-[var(--color-warning-dark)] shadow-md"
							: "hover:border-muted-foreground/40"
					}`}
					onClick={() => setStatusFilter("degraded")}
				>
					<AlertTriangle
						className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-warning)] opacity-20"
						strokeWidth={1.5}
					/>
					<div className="relative">
						<p className="text-2xl font-bold">{degradedCount}</p>
						<p className="text-xs text-muted-foreground">Degraded</p>
					</div>
				</Card>

				<Card
					className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
						statusFilter === "unhealthy"
							? "border-[var(--color-error-dark)] shadow-md"
							: "hover:border-muted-foreground/40"
					}`}
					onClick={() => setStatusFilter("unhealthy")}
				>
					<XCircle
						className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-error)] opacity-20"
						strokeWidth={1.5}
					/>
					<div className="relative">
						<p className="text-2xl font-bold">{unhealthyCount}</p>
						<p className="text-xs text-muted-foreground">Unhealthy</p>
					</div>
				</Card>

				<Card
					className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
						statusFilter === "offline"
							? "border-[var(--color-muted-foreground)] shadow-md"
							: "hover:border-muted-foreground/40"
					}`}
					onClick={() => setStatusFilter("offline")}
				>
					<WifiOff
						className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-muted-foreground)] opacity-20"
						strokeWidth={1.5}
					/>
					<div className="relative">
						<p className="text-2xl font-bold">{offlineCount}</p>
						<p className="text-xs text-muted-foreground">Offline</p>
					</div>
				</Card>
			</div>

			{/* Servers list */}
			<div className="space-y-3">
				{filteredServers.length === 0 ? (
					<Card className="p-8">
						<div className="text-center space-y-2">
							<Server className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
							<h3 className="font-semibold text-muted-foreground">
								No Upstreams Found
							</h3>
							<p className="text-sm text-muted-foreground">
								{statusFilter === "all"
									? "No upstream servers are configured."
									: `No ${statusFilter} upstreams found.`}
							</p>
							{statusFilter !== "all" && (
								<button
									type="button"
									onClick={() => setStatusFilter("all")}
									className="text-xs text-muted-foreground hover:text-foreground underline mt-2"
								>
									Clear filter
								</button>
							)}
						</div>
					</Card>
				) : (
					filteredServers.map((server) => {
						const health = getHealthStatus(server);
						const Icon = health.icon;

						return (
							<Card key={server.server} className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3 flex-1">
										<Icon className={`w-5 h-5 ${health.color}`} />
										<div className="flex-1">
											<div className="font-mono font-semibold">
												{server.server}
											</div>
											<div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
												{server.ports.length > 0 && (
													<span>
														<span className="font-medium">Ports:</span>{" "}
														{server.ports.join(", ")}
													</span>
												)}
												{!server.isOffline && (
													<>
														<span>
															<span className="font-medium">Requests:</span>{" "}
															{server.totalRequests}
														</span>
														<span>
															<span className="font-medium">Failures:</span>{" "}
															{server.totalFails}
														</span>
													</>
												)}
												{server.isOffline && (
													<span className="text-gray-500">
														No stats available
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="text-right">
										<div
											className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${health.color} bg-opacity-10`}
										>
											{health.label}
										</div>
									</div>
								</div>
							</Card>
						);
					})
				)}
			</div>

			<div className="text-xs text-muted-foreground text-center pt-2">
				Auto-refreshing every 5 seconds
			</div>
		</div>
	);
}
