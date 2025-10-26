"use client";

import { BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface UpstreamMetric {
	address: string;
	num_requests: number;
	fails: number;
	failureRate: number;
	healthStatus: "healthy" | "degraded" | "unhealthy" | "offline";
}

const HEALTH_COLORS = {
	healthy: "hsl(142, 76%, 36%)",
	degraded: "hsl(48, 96%, 53%)",
	unhealthy: "hsl(0, 84%, 60%)",
	offline: "hsl(240, 5%, 34%)",
};

function calculateHealthStatus(
	numRequests: number,
	fails: number
): "healthy" | "degraded" | "unhealthy" | "offline" {
	if (numRequests === 0 && fails === 0) {
		return "offline";
	}

	const failureRate = numRequests > 0 ? (fails / numRequests) * 100 : 0;

	if (failureRate > 10 || fails > 20) {
		return "unhealthy";
	} else if (failureRate > 1) {
		return "degraded";
	} else {
		return "healthy";
	}
}

export function MetricsView() {
	const [metricsData, setMetricsData] = useState<UpstreamMetric[]>([]);
	const [refreshing, setRefreshing] = useState(false);

	const fetchMetrics = useCallback(async () => {
		setRefreshing(true);

		try {
			const response = await fetch("/api/caddy/upstreams");
			if (!response.ok) {
				throw new Error("Failed to fetch metrics");
			}

			const upstreams = await response.json();

			const processedUpstreams: UpstreamMetric[] = upstreams.map(
				(upstream: { address: string; num_requests: number; fails: number }) => {
					const failureRate =
						upstream.num_requests > 0
							? (upstream.fails / upstream.num_requests) * 100
							: 0;
					const healthStatus = calculateHealthStatus(
						upstream.num_requests,
						upstream.fails
					);

					return {
						address: upstream.address,
						num_requests: upstream.num_requests,
						fails: upstream.fails,
						failureRate,
						healthStatus,
					};
				}
			);

			setMetricsData(processedUpstreams);
		} catch (err) {
			toast.error("Failed to fetch metrics", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchMetrics();
		const interval = setInterval(fetchMetrics, 5000);
		return () => clearInterval(interval);
	}, [fetchMetrics]);

	if (metricsData.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center space-y-3">
					<BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
					<div>
						<h3 className="font-semibold">No Metrics Available</h3>
						<p className="text-sm text-muted-foreground mt-1">
							No upstream metrics found.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const totalRequests = metricsData.reduce((sum, u) => sum + u.num_requests, 0);
	const totalFails = metricsData.reduce((sum, u) => sum + u.fails, 0);
	const overallFailureRate =
		totalRequests > 0
			? ((totalFails / totalRequests) * 100).toFixed(2)
			: "0.00";

	const healthyCounts = metricsData.reduce(
		(counts, u) => {
			counts[u.healthStatus]++;
			return counts;
		},
		{ healthy: 0, degraded: 0, unhealthy: 0, offline: 0 }
	);

	const pieData = [
		{
			name: "Healthy",
			value: healthyCounts.healthy,
			color: HEALTH_COLORS.healthy,
		},
		{
			name: "Degraded",
			value: healthyCounts.degraded,
			color: HEALTH_COLORS.degraded,
		},
		{
			name: "Unhealthy",
			value: healthyCounts.unhealthy,
			color: HEALTH_COLORS.unhealthy,
		},
		{
			name: "Offline",
			value: healthyCounts.offline,
			color: HEALTH_COLORS.offline,
		},
	].filter((item) => item.value > 0);

	const topUpstreamsData = metricsData
		.sort((a, b) => b.num_requests - a.num_requests)
		.slice(0, 8)
		.map((u) => ({
			name:
				u.address.length > 20 ? u.address.substring(0, 20) + "..." : u.address,
			requests: u.num_requests,
			fails: u.fails,
		}));

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Metrics</h2>
					<p className="text-sm text-muted-foreground">
						Upstream performance and health metrics
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={fetchMetrics}
					disabled={refreshing}
				>
					<RefreshCw
						className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			{/* Summary Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="p-4">
					<div className="text-xs text-muted-foreground mb-1">Upstreams</div>
					<div className="text-2xl font-bold">{metricsData.length}</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs text-muted-foreground mb-1">
						Total Requests
					</div>
					<div className="text-2xl font-bold">
						{totalRequests.toLocaleString()}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs text-muted-foreground mb-1">Failures</div>
					<div className="text-2xl font-bold text-destructive">
						{totalFails.toLocaleString()}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs text-muted-foreground mb-1">Failure Rate</div>
					<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
						{overallFailureRate}%
					</div>
				</Card>
			</div>

			{/* Charts Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Health Distribution */}
				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">Health Distribution</h3>
					<ResponsiveContainer width="100%" height={250}>
						<PieChart>
							<Pie
								data={pieData}
								cx="50%"
								cy="50%"
								labelLine={false}
								label={({ name, percent }) =>
									`${name}: ${(percent * 100).toFixed(0)}%`
								}
								outerRadius={80}
								fill="#8884d8"
								dataKey="value"
							>
								{pieData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.color} />
								))}
							</Pie>
							<Tooltip
								contentStyle={{
									backgroundColor: "hsl(var(--card))",
									border: "1px solid hsl(var(--border))",
									borderRadius: "var(--radius)",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
				</Card>

				{/* Top Upstreams */}
				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">
						Top Upstreams by Traffic
					</h3>
					<ResponsiveContainer width="100%" height={250}>
						<BarChart data={topUpstreamsData}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="hsl(var(--border))"
							/>
							<XAxis
								dataKey="name"
								stroke="hsl(var(--muted-foreground))"
								tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
								angle={-45}
								textAnchor="end"
								height={80}
							/>
							<YAxis
								stroke="hsl(var(--muted-foreground))"
								tick={{ fill: "hsl(var(--muted-foreground))" }}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: "hsl(var(--card))",
									border: "1px solid hsl(var(--border))",
									borderRadius: "var(--radius)",
								}}
							/>
							<Legend />
							<Bar dataKey="requests" fill="hsl(217, 91%, 60%)" name="Requests" />
							<Bar dataKey="fails" fill="hsl(0, 84%, 60%)" name="Failures" />
						</BarChart>
					</ResponsiveContainer>
				</Card>
			</div>

			{/* Detailed Metrics Table */}
			<Card className="p-6">
				<h3 className="text-lg font-semibold mb-4">All Upstreams</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className="text-left py-2 px-3 font-medium text-muted-foreground">
									Address
								</th>
								<th className="text-right py-2 px-3 font-medium text-muted-foreground">
									Requests
								</th>
								<th className="text-right py-2 px-3 font-medium text-muted-foreground">
									Failures
								</th>
								<th className="text-right py-2 px-3 font-medium text-muted-foreground">
									Failure Rate
								</th>
								<th className="text-right py-2 px-3 font-medium text-muted-foreground">
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{metricsData
								.sort((a, b) => b.num_requests - a.num_requests)
								.map((upstream) => {
									const statusColors = {
										healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
										degraded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
										unhealthy: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
										offline: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
									};

									return (
										<tr
											key={upstream.address}
											className="border-b last:border-0 hover:bg-muted/50"
										>
											<td className="py-2 px-3 font-mono text-xs">
												{upstream.address}
											</td>
											<td className="py-2 px-3 text-right">
												{upstream.num_requests.toLocaleString()}
											</td>
											<td className="py-2 px-3 text-right text-destructive">
												{upstream.fails}
											</td>
											<td className="py-2 px-3 text-right">
												{upstream.failureRate.toFixed(2)}%
											</td>
											<td className="py-2 px-3 text-right">
												<span
													className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[upstream.healthStatus]}`}
												>
													{upstream.healthStatus}
												</span>
											</td>
										</tr>
									);
								})}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Auto-refresh indicator */}
			<div className="text-center text-xs text-muted-foreground">
				Auto-refreshes every 5 seconds
			</div>
		</div>
	);
}
