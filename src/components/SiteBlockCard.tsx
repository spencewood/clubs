import {
	ExternalLink,
	FileJson,
	Globe,
	MoreVertical,
	Server,
	Settings,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InspectConfigModal } from "@/components/InspectConfigModal";
import { Badge } from "@/components/ui/badge";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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
		<Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
			<CardContent className="p-2 sm:p-4">
				<div className="flex items-center justify-between gap-1 sm:gap-4">
					<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
						{isDomain ? (
							<Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
						) : (
							<Server className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
						)}
						<div className="flex-1 min-w-0 overflow-hidden">
							<div className="flex items-center gap-2">
								<div className="font-mono text-sm sm:text-base font-medium truncate break-all">
									{siteBlock.addresses.join(", ")}
								</div>
								{siteBlock.directives.length > 0 && (
									<Badge variant="secondary" className="text-xs shrink-0">
										{siteBlock.directives.length}
									</Badge>
								)}
							</div>
							<div className="hidden sm:block text-sm text-muted-foreground truncate">
								{getSummary()}
							</div>
						</div>
					</div>
					{isDomain && getFirstDomain() && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleOpenInBrowser}
										className="h-8 w-8 shrink-0"
									>
										<ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Open https://{getFirstDomain()}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
					{/* Mobile: Single menu button */}
					{mounted && (
						<div className="flex gap-1 shrink-0 sm:hidden">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0"
										title="Actions"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setShowInspect(true)}>
										<FileJson className="h-4 w-4 mr-2" />
										Inspect
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => onEdit(siteBlock.id)}>
										<Settings className="h-4 w-4 mr-2" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setShowDeleteConfirm(true)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}

					{/* Desktop: All buttons visible */}
					<div className="hidden sm:flex gap-2 shrink-0">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowInspect(true)}
							title="Inspect JSON configuration"
							className="h-9 w-auto px-3"
						>
							<FileJson className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEdit(siteBlock.id)}
							title="Edit site"
							className="h-9 w-auto px-3"
						>
							<Settings className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteConfirm(true)}
							title="Delete site"
							className="h-9 w-auto px-3"
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
