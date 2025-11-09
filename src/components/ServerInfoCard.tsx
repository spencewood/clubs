"use client";

import { Circle, Info, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { type CaddyAPIStatus, getCaddyAPIStatus } from "@/lib/api";

interface ServerInfoCardProps {
	initialStatus: CaddyAPIStatus;
}

export function ServerInfoCard({ initialStatus }: ServerInfoCardProps) {
	const [status, setStatus] = useState<CaddyAPIStatus>(initialStatus);

	useEffect(() => {
		// Refresh status every 30 seconds
		const interval = setInterval(async () => {
			const newStatus = await getCaddyAPIStatus();
			setStatus(newStatus);
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="flex items-center gap-2 h-8 text-xs"
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
					title={
						status.available ? "Live Mode - Click for details" : "File Mode"
					}
				>
					<Circle
						className={`h-2 w-2 fill-current ${status.available ? "animate-pulse" : ""}`}
					/>
					<span className="hidden sm:inline">
						{status.available ? "Live Mode" : "File Mode"}
					</span>
					<Info className="h-3 w-3 opacity-60" />
				</Button>
			</PopoverTrigger>
			{status.available && (
				<PopoverContent className="w-64" align="end">
					<div className="flex items-center gap-2 mb-3">
						<Server className="h-4 w-4 text-primary" />
						<h3 className="font-semibold text-sm">Caddy Server Info</h3>
					</div>
					<Separator className="mb-3" />
					<div className="space-y-2 text-xs">
						<div className="flex justify-between items-center">
							<span className="text-muted-foreground">Status</span>
							<Badge
								variant="default"
								className="bg-green-600 hover:bg-green-600"
							>
								Running
							</Badge>
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
				</PopoverContent>
			)}
		</Popover>
	);
}
