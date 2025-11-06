import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
	value: string | number;
	label: string;
	icon: LucideIcon;
	iconColor: string;
	borderColor?: string;
	isActive?: boolean;
	onClick?: () => void;
	className?: string;
}

export function StatCard({
	value,
	label,
	icon: Icon,
	iconColor,
	borderColor,
	isActive = false,
	onClick,
	className = "",
}: StatCardProps) {
	const isClickable = !!onClick;

	return (
		<Card
			className={`p-4 transition-all relative overflow-hidden ${
				isClickable ? "cursor-pointer" : ""
			} ${
				isActive && borderColor
					? `border-[${borderColor}] shadow-md`
					: isClickable
						? "hover:border-muted-foreground/40"
						: ""
			} ${className}`}
			onClick={onClick}
		>
			<Icon
				className={`absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 text-[${iconColor}] opacity-20`}
				strokeWidth={1.5}
			/>
			<div className="relative">
				<p className="text-2xl font-bold">{value}</p>
				<p className="text-xs text-muted-foreground">{label}</p>
			</div>
		</Card>
	);
}
