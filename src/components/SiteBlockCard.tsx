import { Globe, Server, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseDirectiveWithFeatures } from "@/lib/caddy-features";
import type { CaddySiteBlock } from "@/types/caddyfile";

interface SiteBlockCardProps {
	siteBlock: CaddySiteBlock;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function SiteBlockCard({
	siteBlock,
	onEdit,
	onDelete,
}: SiteBlockCardProps) {
	// Generate a summary of what this site block does
	const getSummary = () => {
		if (siteBlock.directives.length === 0) {
			return "No configuration";
		}

		const features: string[] = [];
		for (const directive of siteBlock.directives) {
			const parsed = parseDirectiveWithFeatures(directive);
			if (parsed) {
				features.push(parsed.feature.name);
			} else {
				features.push(directive.name);
			}
		}

		// Show first 3, then "and X more"
		if (features.length <= 3) {
			return features.join(", ");
		}
		return `${features.slice(0, 3).join(", ")}, and ${features.length - 3} more`;
	};

	const isDomain = siteBlock.addresses.some(
		(addr) => addr.includes(".") && !addr.startsWith(":"),
	);

	return (
		<Card className="hover:border-primary/50 transition-colors">
			<CardContent className="p-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						{isDomain ? (
							<Globe className="h-5 w-5 text-primary flex-shrink-0" />
						) : (
							<Server className="h-5 w-5 text-muted-foreground flex-shrink-0" />
						)}
						<div className="flex-1 min-w-0">
							<div className="font-mono font-medium truncate">
								{siteBlock.addresses.join(", ")}
							</div>
							<div className="text-sm text-muted-foreground truncate">
								{getSummary()}
							</div>
						</div>
					</div>
					<div className="flex gap-2 flex-shrink-0">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEdit(siteBlock.id)}
						>
							<Settings className="h-4 w-4 mr-2" />
							Edit
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onDelete(siteBlock.id)}
							title="Delete site block"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
