import { Globe, Server, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
							<Settings className="h-4 w-4 mr-1" />
							Edit
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowDeleteConfirm(true)}
						>
							<Trash2 className="h-4 w-4 mr-1" />
							Delete
						</Button>
					</div>
				</div>
			</CardContent>

			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete site block?</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-mono font-semibold">
								{siteBlock.addresses.join(", ")}
							</span>
							? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteConfirm(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								onDelete(siteBlock.id);
								setShowDeleteConfirm(false);
							}}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
