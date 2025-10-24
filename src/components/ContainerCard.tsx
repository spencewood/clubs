import {
	ChevronDown,
	ChevronRight,
	Container,
	Link as LinkIcon,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

	return (
		<Card className="border-l-4 border-l-primary">
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
							<Settings className="h-4 w-4 mr-2" />
							Edit Shared Config
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onDelete(id)}
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
						{virtualBlocks.map((block) => (
							<Card
								key={block.id}
								className="border-l-2 border-l-primary/50 bg-muted/30"
							>
								<CardContent className="p-3">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<LinkIcon className="h-4 w-4 text-primary flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-mono font-medium text-sm truncate">
													{block.hostname}
												</div>
												<div className="text-xs text-muted-foreground">
													@{block.matcherName} • {block.directives.length}{" "}
													directive{block.directives.length !== 1 ? "s" : ""}
												</div>
											</div>
										</div>
										<div className="flex gap-1 flex-shrink-0">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEditSite(id, block.id)}
												className="h-8 px-2"
											>
												<Settings className="h-3 w-3 mr-1" />
												Edit
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onDeleteSite(id, block.id)}
												className="h-8 w-8"
												title="Delete site"
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}

						{/* Add Site Button */}
						<button
							type="button"
							onClick={() => onAddSite(id)}
							className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
						>
							<Plus className="h-4 w-4" />
							<span className="text-sm font-medium">Site</span>
						</button>
					</div>
				</CardContent>
			)}
		</Card>
	);
}
