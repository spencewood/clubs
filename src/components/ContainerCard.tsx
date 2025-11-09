import {
	ChevronDown,
	ChevronRight,
	Container,
	ExternalLink,
	FileJson,
	Globe,
	MoreVertical,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InspectConfigModal } from "@/components/InspectConfigModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { serializeCaddyfile } from "@/lib/parser/caddyfile-parser";

interface VirtualBlock {
	id: string;
	matcherName: string;
	hostname: string;
	description?: string;
	directives: string[];
	caddyId?: string;
}

interface ContainerCardProps {
	id: string;
	wildcardDomain: string;
	sharedConfig: string[];
	virtualBlocks: VirtualBlock[];
	originalSiteBlock?: import("@/types/caddyfile").CaddySiteBlock; // Original site block for inspection
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
	onAddSite: (containerId: string) => void;
	onEditSite: (containerId: string, siteId: string) => void;
	onDeleteSite: (containerId: string, siteId: string) => void;
}

export function ContainerCard({
	id,
	wildcardDomain,
	sharedConfig,
	virtualBlocks,
	originalSiteBlock,
	onEdit,
	onDelete,
	onAddSite,
	onEditSite,
	onDeleteSite,
}: ContainerCardProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [inspectSiteId, setInspectSiteId] = useState<string | null>(null);
	const [showDeleteContainerConfirm, setShowDeleteContainerConfirm] =
		useState(false);
	const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Helper to get the Caddyfile content for a specific handle block
	const getHandleBlockCaddyfile = (handleId: string) => {
		if (!originalSiteBlock) return undefined;

		// Find the handle directive in the original site block
		const handleDirective = originalSiteBlock.directives.find(
			(d) => d.id === handleId && d.name === "handle",
		);

		if (!handleDirective || !handleDirective.block) return undefined;

		// Get the matcher from the handle args (e.g., "@clubs")
		const matcher = handleDirective.args[0];
		if (!matcher) return undefined;

		// Find the corresponding @matcher definition
		const matcherDef = originalSiteBlock.directives.find(
			(d) => d.name === matcher && d.args[0] === "host",
		);

		if (!matcherDef || matcherDef.args.length < 2) return undefined;

		const hostname = matcherDef.args[1];

		// Create a simple site block with the handle's contents
		return serializeCaddyfile({
			siteBlocks: [
				{
					id: handleId,
					addresses: [hostname],
					directives: handleDirective.block,
				},
			],
			globalOptions: [],
		});
	};

	return (
		<Card className="border-l-4 border-l-primary bg-muted/30">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-2 sm:gap-4">
					<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setIsExpanded(!isExpanded)}
										className="h-8 w-8 flex-shrink-0"
										aria-label={isExpanded ? "Collapse" : "Expand"}
									>
										{isExpanded ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{isExpanded ? "Collapse" : "Expand"}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<Container className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
						<div className="flex-1 min-w-0">
							<CardTitle className="font-mono text-sm sm:text-lg truncate">
								{wildcardDomain}
							</CardTitle>
							<div className="text-xs sm:text-sm text-muted-foreground mt-1">
								{virtualBlocks.length} site
								{virtualBlocks.length !== 1 ? "s" : ""}
							</div>
						</div>
					</div>
					{/* Mobile: Single menu button */}
					{mounted && (
						<div className="flex gap-1 flex-shrink-0 sm:hidden">
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
									<DropdownMenuItem onClick={() => onEdit(id)}>
										<Settings className="h-4 w-4 mr-2" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setShowDeleteContainerConfirm(true)}
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
					<div className="hidden sm:flex gap-2 flex-shrink-0">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEdit(id)}
							className="h-9 w-auto px-3"
						>
							<Settings className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteContainerConfirm(true)}
							title="Delete container"
							className="h-9 w-auto px-3"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>

			{isExpanded && (
				<CardContent className="pt-0 space-y-3">
					{/* Shared Configuration Section */}
					{sharedConfig.length > 0 && (
						<div className="p-2 sm:p-3 bg-muted rounded-lg border">
							<h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
								Shared Configuration
							</h4>
							<div className="space-y-1 overflow-x-auto">
								{sharedConfig.map((config) => (
									<div
										key={config}
										className="text-xs sm:text-sm font-mono break-all sm:break-normal"
									>
										{config}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Virtual Blocks */}
					<div className="space-y-2">
						{virtualBlocks.map((block) => {
							const handleOpenInBrowser = () => {
								if (block.hostname) {
									window.open(
										`https://${block.hostname}`,
										"_blank",
										"noopener,noreferrer",
									);
								}
							};

							return (
								<Card
									key={block.id}
									className="border-l-2 border-l-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
								>
									<CardContent className="p-2 sm:p-4">
										<div className="flex items-center justify-between gap-1 sm:gap-4">
											<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
												<Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
												<div className="flex-1 min-w-0 overflow-hidden">
													<div className="font-mono text-sm sm:text-base font-medium truncate break-all">
														{block.hostname}
													</div>
													<div className="hidden sm:block text-sm text-muted-foreground truncate">
														@{block.matcherName} • {block.directives.length}{" "}
														directive{block.directives.length !== 1 ? "s" : ""}
													</div>
												</div>
											</div>
											{block.hostname && (
												<button
													type="button"
													onClick={handleOpenInBrowser}
													className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
													title={`Open ${block.hostname} in browser`}
												>
													<ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
												</button>
											)}
											{/* Mobile: Single menu button */}
											{mounted && (
												<div className="flex gap-1 flex-shrink-0 sm:hidden">
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
															<DropdownMenuItem
																onClick={() => setInspectSiteId(block.id)}
															>
																<FileJson className="h-4 w-4 mr-2" />
																Inspect
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => onEditSite(id, block.id)}
															>
																<Settings className="h-4 w-4 mr-2" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => setDeletingSiteId(block.id)}
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
											<div className="hidden sm:flex gap-2 flex-shrink-0">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setInspectSiteId(block.id)}
													title="Inspect JSON configuration"
													className="h-9 w-auto px-3"
												>
													<FileJson className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => onEditSite(id, block.id)}
													title="Edit site"
													className="h-9 w-auto px-3"
												>
													<Settings className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setDeletingSiteId(block.id)}
													title="Delete site"
													className="h-9 w-auto px-3"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}

						{/* Add Site Button */}
						<button
							type="button"
							onClick={() => onAddSite(id)}
							className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-[var(--color-success)] hover:bg-[var(--color-success)]/5 transition-colors text-muted-foreground hover:text-foreground"
						>
							<Plus className="h-4 w-4" />
							<Globe className="h-4 w-4" />
							<span className="text-sm font-medium">Site</span>
						</button>
					</div>
				</CardContent>
			)}

			{inspectSiteId !== null &&
				(() => {
					const block = virtualBlocks.find((b) => b.id === inspectSiteId);
					if (!block) return null;

					return (
						<InspectConfigModal
							open={true}
							onOpenChange={(open) => !open && setInspectSiteId(null)}
							title={`Inspect: ${block.hostname}`}
							description={
								block.caddyId
									? `Configuration for @id "${block.caddyId}"`
									: "JSON configuration adapted from this site's Caddyfile"
							}
							caddyId={block.caddyId}
							caddyfileContent={
								block.caddyId ? undefined : getHandleBlockCaddyfile(block.id)
							}
						/>
					);
				})()}

			{/* Container Delete Confirmation */}
			<Dialog
				open={showDeleteContainerConfirm}
				onOpenChange={setShowDeleteContainerConfirm}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete container?</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete the container{" "}
							<span className="font-mono font-semibold">{wildcardDomain}</span>{" "}
							and all {virtualBlocks.length} site
							{virtualBlocks.length !== 1 ? "s" : ""} inside it? This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteContainerConfirm(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								onDelete(id);
								setShowDeleteContainerConfirm(false);
							}}
						>
							Delete Container
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Site Delete Confirmation */}
			<Dialog
				open={deletingSiteId !== null}
				onOpenChange={(open) => !open && setDeletingSiteId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete site?</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-mono font-semibold">
								{virtualBlocks.find((b) => b.id === deletingSiteId)?.hostname}
							</span>{" "}
							from this container? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingSiteId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deletingSiteId) {
									onDeleteSite(id, deletingSiteId);
									setDeletingSiteId(null);
								}
							}}
						>
							Delete Site
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
