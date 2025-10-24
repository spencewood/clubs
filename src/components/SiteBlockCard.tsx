import {
	ExternalLink,
	FileJson,
	Globe,
	Server,
	Settings,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { InspectConfigModal } from "@/components/InspectConfigModal";
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
import { serializeCaddyfile } from "@/lib/parser/caddyfile-parser";
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
	const [showInspect, setShowInspect] = useState(false);

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

	// Get the first valid domain for the external link
	const getFirstDomain = () => {
		const domain = siteBlock.addresses.find(
			(addr) => addr.includes(".") && !addr.startsWith(":"),
		);
		if (!domain) return null;
		// Remove port if present, strip wildcards
		const cleanDomain = domain.split(":")[0].replace(/^\*\./, "");
		return cleanDomain;
	};

	const handleOpenInBrowser = () => {
		const domain = getFirstDomain();
		if (domain) {
			window.open(`https://${domain}`, "_blank", "noopener,noreferrer");
		}
	};

	// Serialize the site block to Caddyfile format for adaptation
	const getSiteBlockCaddyfile = () => {
		return serializeCaddyfile({
			siteBlocks: [siteBlock],
			globalOptions: [],
		});
	};

	return (
		<Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
			<CardContent className="p-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						{isDomain ? (
							<Globe className="h-5 w-5 text-primary flex-shrink-0" />
						) : (
							<Server className="h-5 w-5 text-muted-foreground flex-shrink-0" />
						)}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<div className="font-mono font-medium truncate">
									{siteBlock.addresses.join(", ")}
								</div>
								{isDomain && getFirstDomain() && (
									<button
										type="button"
										onClick={handleOpenInBrowser}
										className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
										title={`Open https://${getFirstDomain()} in browser`}
									>
										<ExternalLink className="h-4 w-4" />
									</button>
								)}
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
							onClick={() => setShowInspect(true)}
							title="Inspect JSON configuration"
						>
							<FileJson className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEdit(siteBlock.id)}
							title="Edit site"
						>
							<Settings className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteConfirm(true)}
							title="Delete site"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardContent>

			<InspectConfigModal
				open={showInspect}
				onOpenChange={setShowInspect}
				title={`Inspect: ${siteBlock.addresses.join(", ")}`}
				description={
					siteBlock.caddyId
						? `Configuration for @id "${siteBlock.caddyId}"`
						: "JSON configuration adapted from this site's Caddyfile"
				}
				caddyId={siteBlock.caddyId}
				caddyfileContent={
					siteBlock.caddyId ? undefined : getSiteBlockCaddyfile()
				}
			/>

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
