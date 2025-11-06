"use client";

import { Circle, Info, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { type CaddyAPIStatus, getCaddyAPIStatus } from "@/lib/api";

interface ServerInfoCardProps {
	initialStatus: CaddyAPIStatus;
}

export function ServerInfoCard({ initialStatus }: ServerInfoCardProps) {
	const [status, setStatus] = useState<CaddyAPIStatus>(initialStatus);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		// Refresh status every 30 seconds
		const interval = setInterval(async () => {
			const newStatus = await getCaddyAPIStatus();
			setStatus(newStatus);
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-muted/50"
				style={{
					backgroundColor: status.available
						? "var(--color-accent)"
						: "var(--color-muted)",
					borderColor: status.available
						? "var(--color-primary)"
						: "var(--color-border)",
					color: status.available
						? "var(--color-accent-foreground)"
						: "var(--color-muted-foreground)",
				}}
				title={status.available ? "Live Mode - Click for details" : "File Mode"}
			>
				<Circle
					className={`h-2 w-2 fill-current ${status.available ? "animate-pulse" : ""}`}
				/>
				<span className="hidden sm:inline">
					{status.available ? "Live Mode" : "File Mode"}
				</span>
				<Info className="h-3 w-3 opacity-60" />
			</button>

			{expanded && status.available && (
				<div className="absolute top-full right-0 mt-2 w-64 bg-card border rounded-lg shadow-lg p-3 z-50">
					<div className="flex items-center gap-2 mb-3 pb-2 border-b">
						<Server className="h-4 w-4 text-primary" />
						<h3 className="font-semibold text-sm">Caddy Server Info</h3>
					</div>
					<div className="space-y-2 text-xs">
						<div className="flex justify-between items-center">
							<span className="text-muted-foreground">Status</span>
							<span className="font-medium text-green-600 dark:text-green-400">
								Running
							</span>
						</div>
						{status.version && (
							<div className="flex justify-between items-center">
								<span className="text-muted-foreground">Version</span>
								<span className="font-mono font-medium">{status.version}</span>
							</div>
						)}
						<div className="flex justify-between items-center">
							<span className="text-muted-foreground">Admin API</span>
							<span className="font-mono text-[10px] opacity-70">
								{status.url}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
