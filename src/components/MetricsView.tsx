"use client";

import { BarChart3, RefreshCw, TrendingUp, XCircle, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	AreaChart,
	Area,
} from "recharts";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "./ui/chart";

// Custom tick component that truncates long names intelligently
const CustomYAxisTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
	const maxLength = 20;
	const text = payload.value;

	let displayText = text;
	if (text.length > maxLength) {
		// Try to show start and end with ellipsis in middle
		const start = text.substring(0, 10);
		const end = text.substring(text.length - 7);
		displayText = `${start}...${end}`;
	}

	return (
		<g transform={`translate(${x},${y})`}>
			<title>{text}</title>
			<text
				x={0}
				y={0}
				dy={4}
				textAnchor="end"
				fill="currentColor"
				fontSize={12}
				className="fill-muted-foreground"
			>
				{displayText}
			</text>
		</g>
	);
};

interface UpstreamMetric {
	address: string;
	num_requests: number;
	fails: number;
}

const chartConfig = {
	requests: {
		label: "Requests",
		theme: {
			light: "#2563eb",
			dark: "#60a5fa",
		},
	},
	fails: {
		label: "Failures",
		theme: {
			light: "#dc2626",
			dark: "#f87171",
		},
	},
	rate: {
		label: "Error Rate",
		theme: {
			light: "#f59e0b",
			dark: "#fbbf24",
		},
	},
} satisfies ChartConfig;

export function MetricsView() {
	const [metricsData, setMetricsData] = useState<UpstreamMetric[]>([]);
	const [historicalData, setHistoricalData] = useState<
		Array<{ time: string; requests: number; fails: number }>
	>([]);
	const [refreshing, setRefreshing] = useState(false);

	const fetchMetrics = useCallback(async () => {
		setRefreshing(true);

		try {
			const response = await fetch("/api/caddy/upstreams");
			if (!response.ok) {
				throw new Error("Failed to fetch metrics");
			}

			const upstreams = await response.json();
			setMetricsData(upstreams);

			const now = new Date();
			const hours = now.getHours();
			const mins = now.getMinutes().toString().padStart(2, "0");
			const timeLabel = hours + ":" + mins;
			const totalRequests = upstreams.reduce(
				(sum, u) => sum + u.num_requests,
				0
			);
			const totalFails = upstreams.reduce(
				(sum, u) => sum + u.fails,
				0
			);

			setHistoricalData((prev) => {
				const newData = [
					...prev,
					{ time: timeLabel, requests: totalRequests, fails: totalFails },
				];
				return newData.slice(-20);
			});
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

	const trafficData = metricsData
		.sort((a, b) => b.num_requests - a.num_requests)
		.slice(0, 10)
		.map((u) => ({
			name:
				u.address.length > 20 ? u.address.substring(0, 20) + "..." : u.address,
			requests: u.num_requests,
		}));

	const errorData = metricsData
		.filter((u) => u.fails > 0)
		.sort((a, b) => {
			const rateA = a.num_requests > 0 ? (a.fails / a.num_requests) * 100 : 0;
			const rateB = b.num_requests > 0 ? (b.fails / b.num_requests) * 100 : 0;
			return rateB - rateA;
		})
		.slice(0, 8)
		.map((u) => ({
			name:
				u.address.length > 18 ? u.address.substring(0, 18) + "..." : u.address,
			rate: u.num_requests > 0 ? Number(((u.fails / u.num_requests) * 100).toFixed(2)) : 0,
		}));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Analytics</h2>
					<p className="text-sm text-muted-foreground">
						Traffic patterns and performance trends
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={fetchMetrics}
					disabled={refreshing}
				>
					<RefreshCw
						className={"w-4 h-4 mr-2 " + (refreshing ? "animate-spin" : "")}
					/>
					Refresh
				</Button>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<Card className="p-4">
					<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
						<TrendingUp className="w-3 h-3" />
						Total Requests
					</div>
					<div className="text-2xl font-bold">
						{totalRequests.toLocaleString()}
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
					<XCircle className="w-3 h-3" />
					Total Failures
				</div>
					<div className="text-2xl font-bold text-destructive">
						{totalFails.toLocaleString()}
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
						<AlertTriangle className="w-3 h-3" />
						Overall Error Rate
					</div>
					<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
						{overallFailureRate}%
					</div>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{historicalData.length > 0 && (
					<Card className="p-6 lg:col-span-2">
						<h3 className="text-lg font-semibold mb-4">Traffic Trend</h3>
						<ChartContainer config={chartConfig}>
							<AreaChart data={historicalData}>
								<defs>
									<linearGradient id="fillRequests" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--color-requests)"
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-requests)"
											stopOpacity={0.1}
										/>
									</linearGradient>
									<linearGradient id="fillFails" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--color-fails)"
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-fails)"
											stopOpacity={0.1}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="time"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<YAxis tickLine={false} axisLine={false} tickMargin={8} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Area
									dataKey="requests"
									type="monotone"
									fill="url(#fillRequests)"
									fillOpacity={0.4}
									stroke="var(--color-requests)"
												/>
								<Area
									dataKey="fails"
									type="monotone"
									fill="url(#fillFails)"
									fillOpacity={0.4}
									stroke="var(--color-fails)"
												/>
							</AreaChart>
						</ChartContainer>
					</Card>
				)}

				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">
						Traffic Distribution
					</h3>
					<ChartContainer config={chartConfig}>
						<BarChart data={trafficData} layout="vertical">
							<CartesianGrid horizontal={false} />
							<XAxis type="number" hide />
							<YAxis
								dataKey="name"
								type="category"
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								width={140}
								tick={<CustomYAxisTick x={0} y={0} payload={{ value: "" }} />}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="requests" fill="var(--color-requests)" radius={4} />
						</BarChart>
					</ChartContainer>
				</Card>

				{errorData.length > 0 && (
					<Card className="p-6">
						<h3 className="text-lg font-semibold mb-4">Error Rates</h3>
						<ChartContainer config={chartConfig}>
							<BarChart data={errorData} layout="vertical">
								<CartesianGrid horizontal={false} />
								<XAxis type="number" hide />
								<YAxis
									dataKey="name"
									type="category"
									tickLine={false}
									tickMargin={10}
									axisLine={false}
									width={140}
									tick={<CustomYAxisTick x={0} y={0} payload={{ value: "" }} />}
								/>
								<ChartTooltip
									content={<ChartTooltipContent />}
								/>
								<Bar dataKey="rate" fill="var(--color-rate)" radius={4} />
							</BarChart>
						</ChartContainer>
					</Card>
				)}
			</div>

			<div className="text-center text-xs text-muted-foreground">
				Auto-refreshes every 5 seconds
			</div>
		</div>
	);
}
