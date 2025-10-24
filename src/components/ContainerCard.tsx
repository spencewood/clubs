import {
	ChevronDown,
	ChevronRight,
	Container,
	ExternalLink,
	FileJson,
	Globe,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { useState } from "react";
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

interface VirtualBlock {
	id: string;
	matcherName: string;
	hostname: string;
	description?: string;
	directives: string[];
}

interface ContainerCardProps {
	id: string;
	wildcardDomain: string;
	sharedConfig: string[];
	virtualBlocks: VirtualBlock[];
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

	return (
		<Card className="border-l-4 border-l-primary bg-muted/30">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<button
							type="button"
							onClick={() => setIsExpanded(!isExpanded)}
							className="p-1 hover:bg-accent rounded transition-colors"
							aria-label={isExpanded ? "Collapse" : "Expand"}
						>
							{isExpanded ? (
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							) : (
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
							)}
						</button>
						<Container className="h-5 w-5 text-primary flex-shrink-0" />
						<div className="flex-1 min-w-0">
							<CardTitle className="font-mono text-lg truncate">
								{wildcardDomain}
							</CardTitle>
							<div className="text-sm text-muted-foreground mt-1">
								{virtualBlocks.length} site
								{virtualBlocks.length !== 1 ? "s" : ""}
							</div>
						</div>
					</div>
					<div className="flex gap-2 flex-shrink-0">
						<Button variant="outline" size="sm" onClick={() => onEdit(id)}>
							<Settings className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteContainerConfirm(true)}
							title="Delete container"
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
						<div className="p-3 bg-muted rounded-lg border">
							<h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
								Shared Configuration
							</h4>
							<div className="space-y-1">
								{sharedConfig.map((config) => (
									<div key={config} className="text-sm font-mono">
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
									className="border-l-2 border-l-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
								>
									<CardContent className="p-4">
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-3 flex-1 min-w-0">
												<Globe className="h-5 w-5 text-primary flex-shrink-0" />
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<div className="font-mono font-medium truncate">
															{block.hostname}
														</div>
														{block.hostname && (
															<button
																type="button"
																onClick={handleOpenInBrowser}
																className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
																title={`Open ${block.hostname} in browser`}
															>
																<ExternalLink className="h-4 w-4" />
															</button>
														)}
													</div>
													<div className="text-sm text-muted-foreground truncate">
														@{block.matcherName} • {block.directives.length}{" "}
														directive{block.directives.length !== 1 ? "s" : ""}
													</div>
												</div>
											</div>
											<div className="flex gap-2 flex-shrink-0">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setInspectSiteId(block.id)}
													title="Inspect JSON configuration"
												>
													<FileJson className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => onEditSite(id, block.id)}
													title="Edit site"
												>
													<Settings className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setDeletingSiteId(block.id)}
													title="Delete site"
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
							className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-green-500 hover:bg-green-50/50 transition-colors text-muted-foreground hover:text-foreground"
						>
							<Plus className="h-4 w-4" />
							<Globe className="h-4 w-4" />
							<span className="text-sm font-medium">Site</span>
						</button>
					</div>
				</CardContent>
			)}

			<InspectConfigModal
				open={inspectSiteId !== null}
				onOpenChange={(open) => !open && setInspectSiteId(null)}
				title={`Inspect: ${virtualBlocks.find((b) => b.id === inspectSiteId)?.hostname || "Site"}`}
				description="Full Caddy JSON configuration (container sites don't have individual @id tags)"
			/>

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
