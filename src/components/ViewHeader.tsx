import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewHeaderProps {
	title: string;
	subtitle?: string;
	onRefresh?: () => void;
	refreshing?: boolean;
	refreshTitle?: string;
}

export function ViewHeader({
	title,
	subtitle,
	onRefresh,
	refreshing = false,
	refreshTitle = "Refresh",
}: ViewHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h2 className="text-2xl font-bold">{title}</h2>
				{subtitle && (
					<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
				)}
			</div>
			{onRefresh && (
				<Button
					variant="outline"
					size="sm"
					onClick={onRefresh}
					disabled={refreshing}
					title={refreshTitle}
				>
					<RefreshCw
						className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
					/>
					<span className="hidden sm:inline ml-2">Refresh</span>
				</Button>
			)}
		</div>
	);
}
