import { Activity, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getCaddyUpstreams } from "@/lib/api";
import type { CaddyUpstream } from "@/types/caddyfile";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

function getHealthStatus(upstream: CaddyUpstream): {
	status: "healthy" | "degraded" | "unhealthy";
	label: string;
	color: string;
	icon: typeof CheckCircle;
} {
	// Consider unhealthy if fails > 5
	if (upstream.fails > 5) {
		return {
			status: "unhealthy",
			label: "Unhealthy",
			color: "text-red-500",
			icon: AlertCircle,
		};
	}

	// Consider degraded if fails > 0 or high request count
	if (upstream.fails > 0 || upstream.num_requests > 100) {
		return {
			status: "degraded",
			label: "Degraded",
			color: "text-yellow-500",
			icon: AlertCircle,
		};
	}

	return {
		status: "healthy",
		label: "Healthy",
		color: "text-green-500",
		icon: CheckCircle,
	};
}

export function UpstreamsView() {
	const [upstreams, setUpstreams] = useState<CaddyUpstream[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchUpstreams = useCallback(async (showLoadingState = true) => {
		if (showLoadingState) setLoading(true);
		setRefreshing(true);

		try {
			const result = await getCaddyUpstreams();

			if (result.success && result.upstreams) {
				setUpstreams(result.upstreams);
			} else {
				toast.error("Failed to fetch upstreams", {
					description: result.error || "Unknown error",
				});
			}
		} catch (error) {
			toast.error("Error fetching upstreams", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			if (showLoadingState) setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchUpstreams();

		// Auto-refresh every 5 seconds
		const interval = setInterval(() => {
			fetchUpstreams(false);
		}, 5000);

		return () => clearInterval(interval);
	}, [fetchUpstreams]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center space-y-2">
					<Activity className="w-8 h-8 mx-auto animate-pulse text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Loading upstreams...</p>
				</div>
			</div>
		);
	}

	if (upstreams.length === 0) {
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

	const healthyCount = upstreams.filter(
		(u) => getHealthStatus(u).status === "healthy",
	).length;
	const degradedCount = upstreams.filter(
		(u) => getHealthStatus(u).status === "degraded",
	).length;
	const unhealthyCount = upstreams.filter(
		(u) => getHealthStatus(u).status === "unhealthy",
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
				>
					<RefreshCw
						className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			{/* Summary stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<Activity className="w-5 h-5 text-muted-foreground" />
						<div>
							<p className="text-2xl font-bold">{upstreams.length}</p>
							<p className="text-xs text-muted-foreground">Total Upstreams</p>
						</div>
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center gap-3">
						<CheckCircle className="w-5 h-5 text-green-500" />
						<div>
							<p className="text-2xl font-bold">{healthyCount}</p>
							<p className="text-xs text-muted-foreground">Healthy</p>
						</div>
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-yellow-500" />
						<div>
							<p className="text-2xl font-bold">{degradedCount}</p>
							<p className="text-xs text-muted-foreground">Degraded</p>
						</div>
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-red-500" />
						<div>
							<p className="text-2xl font-bold">{unhealthyCount}</p>
							<p className="text-xs text-muted-foreground">Unhealthy</p>
						</div>
					</div>
				</Card>
			</div>

			{/* Upstreams list */}
			<div className="space-y-3">
				{upstreams.map((upstream, index) => {
					const health = getHealthStatus(upstream);
					const Icon = health.icon;

					return (
						<Card key={`${upstream.address}-${index}`} className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3 flex-1">
									<Icon className={`w-5 h-5 ${health.color}`} />
									<div className="flex-1">
										<div className="font-mono font-semibold">
											{upstream.address}
										</div>
										<div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
											<span>
												<span className="font-medium">Requests:</span>{" "}
												{upstream.num_requests}
											</span>
											<span>
												<span className="font-medium">Failures:</span>{" "}
												{upstream.fails}
											</span>
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
				})}
			</div>

			<div className="text-xs text-muted-foreground text-center pt-2">
				Auto-refreshing every 5 seconds
			</div>
		</div>
	);
}
