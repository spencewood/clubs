"use client";

import { AlertTriangle, BarChart3, TrendingUp, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card } from "./ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
} from "./ui/chart";
import { ViewHeader } from "./ViewHeader";

interface UpstreamMetric {
	address: string;
	num_requests: number;
	fails: number;
}

interface MetricsViewProps {
	initialUpstreams: UpstreamMetric[];
}

const chartConfig = {
	requestsPerMin: {
		label: "Requests/min",
		theme: {
			light: "#0ea5e9", // --color-info (sky-500)
			dark: "#38bdf8", // --color-info (sky-400 for dark mode)
		},
	},
	failsPerMin: {
		label: "Failures/min",
		theme: {
			light: "#ef4444", // --color-error
			dark: "#f87171", // --color-error (dark)
		},
	},
	requests: {
		label: "Requests (Session)",
		theme: {
			light: "#0ea5e9", // --color-info (sky-500)
			dark: "#38bdf8", // --color-info (sky-400 for dark mode)
		},
	},
	rate: {
		label: "Error Rate %",
		theme: {
			light: "#f59e0b", // --color-warning
			dark: "#fbbf24", // --color-warning (dark)
		},
	},
} satisfies ChartConfig;

// Skeleton loader component
function ChartSkeleton({
	aspectRatio = "aspect-[4/3]",
}: {
	aspectRatio?: string;
}) {
	return (
		<div
			className={`w-full ${aspectRatio} animate-pulse bg-muted/30 rounded-md flex items-center justify-center`}
		>
			<BarChart3 className="w-12 h-12 text-muted-foreground/30" />
		</div>
	);
}

// Custom tooltip for pie charts
interface PieChartTooltipProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number;
		dataKey: string;
		payload: { fill: string };
	}>;
	allData?: Array<Record<string, number | string>>;
}

function PieChartTooltip({ active, payload, allData }: PieChartTooltipProps) {
	if (!active || !payload?.length) {
		return null;
	}

	const data = payload[0];

	// Calculate percentage by summing all values from the chart data
	// The dataKey tells us which field to sum (e.g., 'requests' or 'rate')
	const dataKey = data.dataKey;
	const total =
		allData?.reduce(
			(sum: number, item: Record<string, number | string>) =>
				sum +
				(typeof item[dataKey] === "number" ? (item[dataKey] as number) : 0),
			0,
		) || 0;
	const percentage =
		total > 0 ? ((data.value / total) * 100).toFixed(1) : "0.0";

	return (
		<div
			className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl"
			style={{ transition: "none" }}
		>
			<div className="font-medium text-foreground mb-1">{data.name}</div>
			<div className="flex items-center gap-2">
				<div
					className="w-3 h-3 rounded-sm"
					style={{ backgroundColor: data.payload.fill }}
				/>
				<span className="text-muted-foreground">{data.dataKey}:</span>
				<span className="font-mono font-medium text-foreground">
					{data.value.toLocaleString()}
				</span>
			</div>
			<div className="text-muted-foreground mt-1">{percentage}% of total</div>
		</div>
	);
}

// Custom tooltip for area/line charts
interface AreaChartTooltipProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number | string;
		color: string;
	}>;
	label?: string;
}

function AreaChartTooltip({ active, payload, label }: AreaChartTooltipProps) {
	if (!active || !payload?.length) {
		return null;
	}

	return (
		<div
			className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl min-w-[180px]"
			style={{ transition: "none" }}
		>
			<div className="font-medium text-foreground mb-2">{label}</div>
			<div className="space-y-1.5">
				{payload.map((entry) => (
					<div
						key={entry.name}
						className="flex items-center justify-between gap-4"
					>
						<div className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-sm"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="text-muted-foreground">{entry.name}:</span>
						</div>
						<span className="font-mono font-medium text-foreground">
							{typeof entry.value === "number"
								? entry.value.toFixed(1)
								: entry.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// Helper to merge per-upstream historical data for charting
function mergePerUpstreamData(
	upstreams: UpstreamMetric[],
	perUpstreamHistory: Map<
		string,
		Array<{ time: string; requestsPerMin: number; failsPerMin: number }>
	>,
	mode: "requests" | "failures" | "errorRate" = "requests",
): Array<Record<string, string | number>> {
	// Get all unique timestamps across all upstreams
	const allTimes = new Set<string>();
	for (const upstream of upstreams) {
		const history = perUpstreamHistory.get(upstream.address);
		if (history) {
			for (const point of history) {
				allTimes.add(point.time);
			}
		}
	}

	const sortedTimes = Array.from(allTimes).sort();

	// Build chart data with each upstream as a separate series
	return sortedTimes.map((time) => {
		const dataPoint: Record<string, string | number> = { time };

		for (const upstream of upstreams) {
			const history = perUpstreamHistory.get(upstream.address);
			const point = history?.find((p) => p.time === time);
			const shortName =
				upstream.address.length > 15
					? `${upstream.address.substring(0, 15)}...`
					: upstream.address;

			if (mode === "requests") {
				dataPoint[shortName] = point?.requestsPerMin || 0;
			} else if (mode === "failures") {
				dataPoint[shortName] = point?.failsPerMin || 0;
			} else {
				// errorRate - calculate percentage
				const reqsPerMin = point?.requestsPerMin || 0;
				const failsPerMin = point?.failsPerMin || 0;
				const errorRate = reqsPerMin > 0 ? (failsPerMin / reqsPerMin) * 100 : 0;
				dataPoint[shortName] = Math.round(errorRate * 100) / 100; // Round to 2 decimals
			}
		}

		return dataPoint;
	});
}

export function MetricsView({ initialUpstreams }: MetricsViewProps) {
	const [metricsData, setMetricsData] =
		useState<UpstreamMetric[]>(initialUpstreams);
	const [isChartReady, setIsChartReady] = useState(false);

	// Store previous cumulative totals per upstream AND overall
	const [_prevUpstreamData, setPrevUpstreamData] = useState<
		Map<string, { requests: number; fails: number; timestamp: number }>
	>(() => {
		const map = new Map();
		if (initialUpstreams.length > 0) {
			const now = Date.now();
			for (const upstream of initialUpstreams) {
				map.set(upstream.address, {
					requests: upstream.num_requests,
					fails: upstream.fails,
					timestamp: now,
				});
			}
		}
		return map;
	});

	const [_prevTotals, setPrevTotals] = useState<{
		requests: number;
		fails: number;
		timestamp: number;
	} | null>(() => {
		if (initialUpstreams.length > 0) {
			const totalRequests = initialUpstreams.reduce(
				(sum: number, u: UpstreamMetric) => sum + u.num_requests,
				0,
			);
			const totalFails = initialUpstreams.reduce(
				(sum: number, u: UpstreamMetric) => sum + u.fails,
				0,
			);
			return {
				requests: totalRequests,
				fails: totalFails,
				timestamp: Date.now(),
			};
		}
		return null;
	});

	// Store aggregate historical data - initialize with a starting point
	const [historicalData, setHistoricalData] = useState<
		Array<{ time: string; requestsPerMin: number; failsPerMin: number }>
	>(() => {
		// Start with one data point at 0 so the chart renders immediately
		if (initialUpstreams.length > 0) {
			const now = new Date();
			const hours = now.getHours();
			const mins = now.getMinutes().toString().padStart(2, "0");
			const secs = now.getSeconds().toString().padStart(2, "0");
			const timeLabel = `${hours}:${mins}:${secs}`;
			return [{ time: timeLabel, requestsPerMin: 0, failsPerMin: 0 }];
		}
		return [];
	});

	// Store per-upstream historical data
	const [perUpstreamHistory, setPerUpstreamHistory] = useState<
		Map<
			string,
			Array<{ time: string; requestsPerMin: number; failsPerMin: number }>
		>
	>(new Map());

	const [refreshing, setRefreshing] = useState(false);
	const [metricFilter, setMetricFilter] = useState<
		"all" | "requests" | "failures" | "errors"
	>("all");

	const fetchMetrics = useCallback(async () => {
		setRefreshing(true);

		try {
			const response = await fetch("/api/caddy/upstreams");
			if (!response.ok) {
				throw new Error("Failed to fetch metrics");
			}

			const upstreams = await response.json();
			setMetricsData(upstreams);

			const now = Date.now();
			const totalRequests = upstreams.reduce(
				(sum: number, u: UpstreamMetric) => sum + u.num_requests,
				0,
			);
			const totalFails = upstreams.reduce(
				(sum: number, u: UpstreamMetric) => sum + u.fails,
				0,
			);

			// Debug logging to understand what's happening
			console.log("[MetricsView] Fetched upstreams:", {
				count: upstreams.length,
				totalRequests,
				totalFails,
				upstreams: upstreams.map((u: UpstreamMetric) => ({
					address: u.address,
					requests: u.num_requests,
					fails: u.fails,
				})),
			});

			const date = new Date(now);
			const hours = date.getHours();
			const mins = date.getMinutes().toString().padStart(2, "0");
			const secs = date.getSeconds().toString().padStart(2, "0");
			const timeLabel = `${hours}:${mins}:${secs}`;

			// Calculate per-upstream deltas
			setPrevUpstreamData((prevMap) => {
				const newMap = new Map(prevMap);

				for (const upstream of upstreams) {
					const prev = prevMap.get(upstream.address);
					if (prev) {
						const timeDiffSeconds = (now - prev.timestamp) / 1000;
						if (timeDiffSeconds > 0) {
							const requestsDelta = upstream.num_requests - prev.requests;
							const failsDelta = upstream.fails - prev.fails;

							const requestsPerMin = (requestsDelta / timeDiffSeconds) * 60;
							const failsPerMin = (failsDelta / timeDiffSeconds) * 60;

							setPerUpstreamHistory((prevHistory) => {
								const newHistory = new Map(prevHistory);
								const upstreamHistory = newHistory.get(upstream.address) || [];
								const newPoint = {
									time: timeLabel,
									requestsPerMin: Math.max(0, requestsPerMin),
									failsPerMin: Math.max(0, failsPerMin),
								};
								const updatedHistory = [...upstreamHistory, newPoint].slice(
									-360,
								);
								newHistory.set(upstream.address, updatedHistory);
								return newHistory;
							});
						}
					}

					newMap.set(upstream.address, {
						requests: upstream.num_requests,
						fails: upstream.fails,
						timestamp: now,
					});
				}

				return newMap;
			});

			// Calculate aggregate rate (requests per minute) based on delta
			setPrevTotals((prev) => {
				if (prev) {
					const timeDiffSeconds = (now - prev.timestamp) / 1000;
					const requestsDelta = totalRequests - prev.requests;
					const failsDelta = totalFails - prev.fails;

					// Convert to requests per minute
					const requestsPerMin = (requestsDelta / timeDiffSeconds) * 60;
					const failsPerMin = (failsDelta / timeDiffSeconds) * 60;

					// Only add data point if we have a meaningful delta
					if (timeDiffSeconds > 0) {
						setHistoricalData((prevData) => {
							const newData = [
								...prevData,
								{
									time: timeLabel,
									requestsPerMin: Math.max(0, requestsPerMin),
									failsPerMin: Math.max(0, failsPerMin),
								},
							];
							// Keep last 360 data points (30 minutes at 5-second intervals)
							return newData.slice(-360);
						});
					}
				}

				return {
					requests: totalRequests,
					fails: totalFails,
					timestamp: now,
				};
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
		// Delay chart rendering to avoid ResponsiveContainer dimension errors
		const timer = setTimeout(() => setIsChartReady(true), 100);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		// Start auto-refresh interval (don't fetch immediately since we have server data)
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

	// Get the latest rate metrics from historical data
	const latestData = historicalData[historicalData.length - 1];
	const currentRequestsPerMin = latestData?.requestsPerMin ?? 0;
	const currentFailsPerMin = latestData?.failsPerMin ?? 0;
	const currentErrorRate =
		currentRequestsPerMin > 0
			? ((currentFailsPerMin / currentRequestsPerMin) * 100).toFixed(2)
			: "0.00";

	// Filter data based on selected metric
	const filteredMetricsData =
		metricFilter === "failures" || metricFilter === "errors"
			? metricsData.filter((u) => u.fails > 0)
			: metricsData;

	const trafficData = filteredMetricsData
		.filter((u) => u.num_requests > 0)
		.sort((a, b) => b.num_requests - a.num_requests)
		.slice(0, 10)
		.map((u) => ({
			name:
				u.address.length > 20 ? `${u.address.substring(0, 20)}...` : u.address,
			requests: u.num_requests,
		}));

	const errorData = filteredMetricsData
		.filter((u) => u.fails > 0)
		.sort((a, b) => {
			const rateA = a.num_requests > 0 ? (a.fails / a.num_requests) * 100 : 0;
			const rateB = b.num_requests > 0 ? (b.fails / b.num_requests) * 100 : 0;
			return rateB - rateA;
		})
		.slice(0, 8)
		.map((u) => ({
			name:
				u.address.length > 18 ? `${u.address.substring(0, 18)}...` : u.address,
			rate:
				u.num_requests > 0
					? Number(((u.fails / u.num_requests) * 100).toFixed(2))
					: 0,
		}));

	// Determine which data to show in the trend chart based on filter
	const chartDataToShow =
		metricFilter === "all"
			? historicalData
			: metricFilter === "requests"
				? // Show top 5 containers by request volume
					(() => {
						const top5 = filteredMetricsData
							.sort((a, b) => b.num_requests - a.num_requests)
							.slice(0, 5);
						return mergePerUpstreamData(top5, perUpstreamHistory, "requests");
					})()
				: metricFilter === "failures"
					? // Show top 5 containers by absolute failure count
						(() => {
							const withFailures = filteredMetricsData
								.filter((u) => u.fails > 0)
								.sort((a, b) => b.fails - a.fails)
								.slice(0, 5);
							return mergePerUpstreamData(
								withFailures,
								perUpstreamHistory,
								"failures",
							);
						})()
					: // errors - show top 5 containers by error rate percentage
						(() => {
							const withFailures = filteredMetricsData
								.filter((u) => u.fails > 0 && u.num_requests > 0)
								.sort((a, b) => {
									const rateA = (a.fails / a.num_requests) * 100;
									const rateB = (b.fails / b.num_requests) * 100;
									return rateB - rateA;
								})
								.slice(0, 5);
							return mergePerUpstreamData(
								withFailures,
								perUpstreamHistory,
								"errorRate",
							);
						})();

	// Build dynamic chart config for per-upstream legend labels
	const perUpstreamChartConfig: ChartConfig =
		metricFilter !== "all" && chartDataToShow.length > 0
			? Object.keys(chartDataToShow[0])
					.filter((key) => key !== "time")
					.reduce(
						(config, upstreamName) => {
							config[upstreamName] = {
								label: upstreamName,
							};
							return config;
						},
						{} as Record<string, { label: string }>,
					)
			: {};

	return (
		<div className="space-y-6">
			<ViewHeader
				title="Analytics"
				subtitle="Traffic patterns and performance trends"
				onRefresh={fetchMetrics}
				refreshing={refreshing}
				refreshTitle="Refresh metrics"
			/>

			<div className="space-y-2">
				<div className="text-xs text-muted-foreground">
					Current Traffic Rate
				</div>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<Card
						className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
							metricFilter === "requests"
								? "border-[var(--color-info-dark)] shadow-md"
								: "hover:border-muted-foreground/40"
						}`}
						onClick={() =>
							setMetricFilter(metricFilter === "requests" ? "all" : "requests")
						}
					>
						<TrendingUp
							className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-info)] opacity-20"
							strokeWidth={1.5}
						/>
						<div className="relative">
							<p className="text-2xl font-bold">
								{currentRequestsPerMin.toFixed(1)}
							</p>
							<p className="text-xs text-muted-foreground">Requests/min</p>
						</div>
					</Card>
					<Card
						className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
							metricFilter === "failures"
								? "border-[var(--color-error-dark)] shadow-md"
								: "hover:border-muted-foreground/40"
						}`}
						onClick={() =>
							setMetricFilter(metricFilter === "failures" ? "all" : "failures")
						}
					>
						<XCircle
							className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-error)] opacity-20"
							strokeWidth={1.5}
						/>
						<div className="relative">
							<p className="text-2xl font-bold">
								{currentFailsPerMin.toFixed(1)}
							</p>
							<p className="text-xs text-muted-foreground">Failures/min</p>
						</div>
					</Card>
					<Card
						className={`p-4 cursor-pointer transition-all relative overflow-hidden ${
							metricFilter === "errors"
								? "border-[var(--color-warning-dark)] shadow-md"
								: "hover:border-muted-foreground/40"
						}`}
						onClick={() =>
							setMetricFilter(metricFilter === "errors" ? "all" : "errors")
						}
					>
						<AlertTriangle
							className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[var(--color-warning)] opacity-20"
							strokeWidth={1.5}
						/>
						<div className="relative">
							<p className="text-2xl font-bold">{currentErrorRate}%</p>
							<p className="text-xs text-muted-foreground">Error Rate</p>
						</div>
					</Card>
				</div>
			</div>

			<div
				className={`transition-all duration-200 ${
					metricFilter !== "all"
						? "opacity-100 max-h-20"
						: "opacity-0 max-h-0 overflow-hidden"
				}`}
			>
				<div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
					<AlertTriangle className="w-4 h-4 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						Filtering:{" "}
						<span className="font-medium text-foreground">
							{metricFilter === "requests"
								? "Showing top 5 upstreams by request volume (per-upstream trends)"
								: metricFilter === "failures"
									? "Showing top 5 upstreams by total failure count (per-upstream trends)"
									: "Showing top 5 upstreams by error rate % (per-upstream trends)"}
						</span>
					</p>
					<button
						type="button"
						onClick={() => setMetricFilter("all")}
						className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
					>
						Clear filter
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{historicalData.length > 0 ? (
					<Card className="p-6 lg:col-span-2">
						<h3 className="text-lg font-semibold mb-4">
							{metricFilter === "all"
								? "Traffic Trend"
								: metricFilter === "requests"
									? "Traffic Trend - Requests/min"
									: metricFilter === "failures"
										? "Traffic Trend - Failures/min"
										: "Traffic Trend - Error Rate %"}
							{metricFilter !== "all" && (
								<span className="text-sm font-normal text-muted-foreground ml-2">
									(per-upstream)
								</span>
							)}
						</h3>
						<div className="w-full h-[300px]">
							{isChartReady ? (
								<ChartContainer
									config={
										metricFilter === "all"
											? chartConfig
											: perUpstreamChartConfig
									}
									className="w-full h-full"
								>
									{metricFilter === "all" ? (
										<AreaChart data={historicalData}>
											<defs>
												<linearGradient
													id="fillRequestsPerMin"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="var(--color-requestsPerMin)"
														stopOpacity={0.8}
													/>
													<stop
														offset="95%"
														stopColor="var(--color-requestsPerMin)"
														stopOpacity={0.1}
													/>
												</linearGradient>
												<linearGradient
													id="fillFailsPerMin"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="var(--color-failsPerMin)"
														stopOpacity={0.8}
													/>
													<stop
														offset="95%"
														stopColor="var(--color-failsPerMin)"
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
											<YAxis
												tickLine={false}
												axisLine={false}
												tickMargin={8}
												label={{
													value: "per minute",
													angle: -90,
													position: "insideLeft",
													style: { textAnchor: "middle" },
												}}
											/>
											<ChartTooltip
												content={<AreaChartTooltip />}
												animationDuration={0}
												isAnimationActive={false}
											/>
											<ChartLegend content={<ChartLegendContent />} />
											<Area
												dataKey="requestsPerMin"
												type="monotone"
												fill="url(#fillRequestsPerMin)"
												fillOpacity={0.4}
												stroke="var(--color-requestsPerMin)"
												strokeWidth={2}
												isAnimationActive={false}
											/>
											<Area
												dataKey="failsPerMin"
												type="monotone"
												fill="url(#fillFailsPerMin)"
												fillOpacity={0.4}
												stroke="var(--color-failsPerMin)"
												strokeWidth={2}
												isAnimationActive={false}
											/>
										</AreaChart>
									) : (
										<AreaChart data={chartDataToShow}>
											<CartesianGrid vertical={false} />
											<XAxis
												dataKey="time"
												tickLine={false}
												axisLine={false}
												tickMargin={8}
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												tickMargin={8}
												label={{
													value:
														metricFilter === "requests"
															? "requests/min"
															: metricFilter === "failures"
																? "failures/min"
																: "error rate %",
													angle: -90,
													position: "insideLeft",
													style: { textAnchor: "middle" },
												}}
											/>
											<ChartTooltip
												content={<AreaChartTooltip />}
												animationDuration={0}
												isAnimationActive={false}
											/>
											<ChartLegend content={<ChartLegendContent />} />
											{chartDataToShow.length > 0 &&
												Object.keys(chartDataToShow[0])
													.filter((key) => key !== "time")
													.sort() // Sort to ensure stable order
													.map((upstreamName, idx) => {
														// Blue = good (requests), Orange = bad (failures/errors)
														const blueColors = [
															"hsl(210, 100%, 56%)", // bright blue
															"hsl(210, 100%, 66%)", // lighter blue
															"hsl(210, 100%, 46%)", // darker blue
															"hsl(210, 90%, 76%)", // very light blue
															"hsl(210, 85%, 40%)", // deep blue
															"hsl(210, 95%, 80%)", // pale blue
														];
														const orangeColors = [
															"hsl(25, 95%, 53%)", // orange
															"hsl(25, 95%, 63%)", // lighter orange
															"hsl(25, 95%, 43%)", // darker orange
															"hsl(25, 90%, 73%)", // very light orange
															"hsl(25, 90%, 38%)", // deep orange
															"hsl(25, 85%, 78%)", // pale orange
														];
														const colors =
															metricFilter === "requests"
																? blueColors
																: orangeColors;
														const color = colors[idx % colors.length];
														return (
															<Area
																key={upstreamName}
																dataKey={upstreamName}
																name={upstreamName}
																type="monotone"
																stroke={color}
																fill={color}
																fillOpacity={0.2}
																strokeWidth={2}
																isAnimationActive={false}
															/>
														);
													})}
										</AreaChart>
									)}
								</ChartContainer>
							) : (
								<ChartSkeleton aspectRatio="aspect-[16/7]" />
							)}
						</div>
					</Card>
				) : (
					<Card className="p-6 lg:col-span-2">
						<h3 className="text-lg font-semibold mb-4">Traffic Trend</h3>
						<ChartSkeleton aspectRatio="aspect-[16/7]" />
					</Card>
				)}

				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">
						Traffic Distribution
						{metricFilter !== "all" && (
							<span className="text-sm font-normal text-muted-foreground ml-2">
								(filtered)
							</span>
						)}
					</h3>
					{trafficData.length === 0 ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-center space-y-2">
								<BarChart3 className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
								<p className="text-sm text-muted-foreground">
									No traffic data available
								</p>
							</div>
						</div>
					) : (
						<div className="w-full h-[350px]">
							{isChartReady ? (
								<ChartContainer config={chartConfig} className="w-full h-full">
									<PieChart>
										<ChartTooltip
											content={<PieChartTooltip allData={trafficData} />}
											animationDuration={0}
											isAnimationActive={false}
										/>
										<Pie
											data={trafficData}
											dataKey="requests"
											nameKey="name"
											cx="50%"
											cy="50%"
											outerRadius={120}
										>
											{trafficData.map((entry) => {
												const colors = [
													"hsl(210, 100%, 56%)",
													"hsl(210, 100%, 66%)",
													"hsl(210, 100%, 46%)",
													"hsl(200, 100%, 56%)",
													"hsl(200, 100%, 66%)",
													"hsl(220, 100%, 56%)",
													"hsl(220, 100%, 66%)",
													"hsl(190, 100%, 56%)",
													"hsl(230, 100%, 56%)",
													"hsl(180, 100%, 56%)",
												];
												const index = trafficData.indexOf(entry);
												return (
													<Cell
														key={`cell-${entry.name}`}
														fill={colors[index % colors.length]}
													/>
												);
											})}
										</Pie>
									</PieChart>
								</ChartContainer>
							) : (
								<ChartSkeleton aspectRatio="aspect-[4/3]" />
							)}
						</div>
					)}
				</Card>

				{errorData.length > 0 ? (
					<Card className="p-6">
						<h3 className="text-lg font-semibold mb-4">
							Error Rates
							{metricFilter !== "all" && (
								<span className="text-sm font-normal text-muted-foreground ml-2">
									(filtered)
								</span>
							)}
						</h3>
						<div className="w-full h-[350px]">
							{isChartReady ? (
								<ChartContainer config={chartConfig} className="w-full h-full">
									<PieChart>
										<ChartTooltip
											content={<PieChartTooltip allData={errorData} />}
											animationDuration={0}
											isAnimationActive={false}
										/>
										<Pie
											data={errorData}
											dataKey="rate"
											nameKey="name"
											cx="50%"
											cy="50%"
											outerRadius={120}
										>
											{errorData.map((entry) => {
												const colors = [
													"hsl(25, 95%, 53%)",
													"hsl(25, 95%, 63%)",
													"hsl(25, 95%, 43%)",
													"hsl(30, 95%, 53%)",
													"hsl(30, 95%, 63%)",
													"hsl(20, 95%, 53%)",
													"hsl(35, 95%, 53%)",
													"hsl(15, 95%, 53%)",
												];
												const index = errorData.indexOf(entry);
												return (
													<Cell
														key={`cell-${entry.name}`}
														fill={colors[index % colors.length]}
													/>
												);
											})}
										</Pie>
									</PieChart>
								</ChartContainer>
							) : (
								<ChartSkeleton aspectRatio="aspect-[4/3]" />
							)}
						</div>
					</Card>
				) : (
					<Card className="p-6">
						<h3 className="text-lg font-semibold mb-4">Error Rates</h3>
						<ChartSkeleton aspectRatio="aspect-[4/3]" />
					</Card>
				)}
			</div>

			<div className="text-center text-xs text-muted-foreground">
				Auto-refreshes every 5 seconds
			</div>
		</div>
	);
}
