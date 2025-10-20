import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CaddyDirective } from "@/types/caddyfile";

interface DirectiveItemProps {
	directive: CaddyDirective;
	onEdit: () => void;
	onDelete: () => void;
	depth?: number;
}

export function DirectiveItem({
	directive,
	onEdit,
	onDelete,
	depth = 0,
}: DirectiveItemProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const hasBlock = directive.block && directive.block.length > 0;

	return (
		<div className={`${depth > 0 ? "ml-6 border-l-2 border-muted pl-4" : ""}`}>
			<div className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/50 hover:bg-muted">
				<div className="flex items-center gap-2 flex-1 min-w-0">
					{hasBlock && (
						<button
							type="button"
							onClick={() => setIsExpanded(!isExpanded)}
							className="flex-shrink-0"
						>
							{isExpanded ? (
								<ChevronDown className="h-4 w-4" />
							) : (
								<ChevronRight className="h-4 w-4" />
							)}
						</button>
					)}
					<code className="text-sm font-mono flex-1 truncate">
						<span className="font-semibold text-primary">{directive.name}</span>
						{directive.args.length > 0 && (
							<span className="text-muted-foreground ml-2">
								{directive.args.join(" ")}
							</span>
						)}
					</code>
				</div>
				<div className="flex gap-1 flex-shrink-0">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={onEdit}
					>
						<Pencil className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={onDelete}
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			</div>

			{hasBlock && isExpanded && (
				<div className="mt-2 space-y-2">
					{directive.block?.map((subDirective) => (
						<DirectiveItem
							key={subDirective.id}
							directive={subDirective}
							onEdit={onEdit}
							onDelete={onDelete}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}
