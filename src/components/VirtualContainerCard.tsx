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

interface VirtualContainerCardProps {
	id: string;
	wildcardDomain: string;
	sharedConfig: string[];
	virtualBlocks: VirtualBlock[];
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
	onAddService: (containerId: string) => void;
	onEditService: (containerId: string, serviceId: string) => void;
	onDeleteService: (containerId: string, serviceId: string) => void;
}

export function VirtualContainerCard({
	id,
	wildcardDomain,
	sharedConfig,
	virtualBlocks,
	onEdit,
	onDelete,
	onAddService,
	onEditService,
	onDeleteService,
}: VirtualContainerCardProps) {
	const [isExpanded, setIsExpanded] = useState(true);

	return (
		<Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<button
							type="button"
							onClick={() => setIsExpanded(!isExpanded)}
							className="p-1 hover:bg-blue-100 rounded transition-colors"
							aria-label={isExpanded ? "Collapse" : "Expand"}
						>
							{isExpanded ? (
								<ChevronDown className="h-4 w-4 text-blue-600" />
							) : (
								<ChevronRight className="h-4 w-4 text-blue-600" />
							)}
						</button>
						<Container className="h-5 w-5 text-blue-600 flex-shrink-0" />
						<div className="flex-1 min-w-0">
							<CardTitle className="font-mono text-lg truncate">
								{wildcardDomain}
							</CardTitle>
							<div className="text-sm text-muted-foreground mt-1">
								{virtualBlocks.length} service
								{virtualBlocks.length !== 1 ? "s" : ""}
							</div>
						</div>
					</div>
					<div className="flex gap-2 flex-shrink-0">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEdit(id)}
							className="border-blue-300 hover:bg-blue-100"
						>
							<Settings className="h-4 w-4 mr-2" />
							Edit Shared Config
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onDelete(id)}
							title="Delete virtual container"
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
						<div className="p-3 bg-blue-100/50 rounded-lg border border-blue-200">
							<h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">
								Shared Configuration
							</h4>
							<div className="space-y-1">
								{sharedConfig.map((config) => (
									<div key={config} className="text-sm font-mono text-blue-900">
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
								className="border-l-4 border-l-purple-400 bg-purple-50/30"
							>
								<CardContent className="p-3">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<LinkIcon className="h-4 w-4 text-purple-600 flex-shrink-0" />
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
												onClick={() => onEditService(id, block.id)}
												className="h-8 px-2"
											>
												<Settings className="h-3 w-3 mr-1" />
												Edit
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onDeleteService(id, block.id)}
												className="h-8 w-8"
												title="Delete service"
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}

						{/* Add Service Button */}
						<button
							type="button"
							onClick={() => onAddService(id)}
							className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50/50 transition-colors text-purple-700 hover:text-purple-900"
						>
							<Plus className="h-4 w-4" />
							<span className="text-sm font-medium">Add Service</span>
						</button>
					</div>
				</CardContent>
			)}
		</Card>
	);
}
