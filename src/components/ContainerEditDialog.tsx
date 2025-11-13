import { Edit2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { AddFeatureDialog } from "@/components/AddFeatureDialog";
import { EditDirectiveDialog } from "@/components/EditDirectiveDialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	parseVirtualContainer,
	serializeVirtualContainer,
	type VirtualContainer,
} from "@/lib/container-utils";
import type { CaddyDirective, CaddySiteBlock } from "@/types/caddyfile";

interface ContainerEditDialogProps {
	siteBlock: CaddySiteBlock | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (siteBlock: CaddySiteBlock) => void;
}

export function ContainerEditDialog({
	siteBlock,
	open,
	onOpenChange,
	onSave,
}: ContainerEditDialogProps) {
	const [container, setContainer] = useState<VirtualContainer | null>(null);
	const [wildcardDomain, setWildcardDomain] = useState("");
	const [editingDirective, setEditingDirective] =
		useState<CaddyDirective | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [addFeatureDialogOpen, setAddFeatureDialogOpen] = useState(false);
	const wildcardDomainId = useId();

	useEffect(() => {
		if (siteBlock) {
			const parsed = parseVirtualContainer(siteBlock);
			setContainer(parsed);
			setWildcardDomain(parsed.wildcardDomain);
		}
	}, [siteBlock]);

	const handleSave = () => {
		if (!container) return;

		const updated: VirtualContainer = {
			...container,
			wildcardDomain,
		};

		const updatedSiteBlock = serializeVirtualContainer(updated);
		onSave(updatedSiteBlock);
		onOpenChange(false);
	};

	const handleAddDirectives = (directives: CaddyDirective[]) => {
		if (!container) return;

		setContainer({
			...container,
			sharedConfig: [...container.sharedConfig, ...directives],
		});
	};

	const handleRemoveDirective = (id: string) => {
		if (!container) return;

		setContainer({
			...container,
			sharedConfig: container.sharedConfig.filter((d) => d.id !== id),
		});
	};

	const handleStartEdit = (directive: CaddyDirective) => {
		setEditingDirective(directive);
		setEditDialogOpen(true);
	};

	const handleSaveEdit = (updatedDirective: CaddyDirective) => {
		if (!container) return;

		setContainer({
			...container,
			sharedConfig: container.sharedConfig.map((d) =>
				d.id === updatedDirective.id ? updatedDirective : d,
			),
		});
	};

	if (!container) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Container</DialogTitle>
					<DialogDescription>
						Configure shared settings that apply to all sites in this container
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Wildcard Domain */}
					<div className="space-y-2">
						<Label htmlFor={wildcardDomainId}>Wildcard Domain</Label>
						<Input
							id={wildcardDomainId}
							value={wildcardDomain}
							onChange={(e) => setWildcardDomain(e.target.value)}
							placeholder="*.sites.example.com"
						/>
						<p className="text-sm text-muted-foreground">
							{container.virtualBlocks.length} site
							{container.virtualBlocks.length !== 1 ? "s" : ""} in this
							container
						</p>
					</div>

					{/* Shared Configuration */}
					<div className="space-y-2">
						<Label>Shared Configuration</Label>
						<div className="space-y-2">
							{container.sharedConfig.length === 0 ? (
								<div className="text-sm text-muted-foreground italic p-3 border rounded-lg border-dashed">
									No shared configuration. Add directives below that will apply
									to all sites.
								</div>
							) : (
								container.sharedConfig.map((directive) => (
									<div
										key={directive.id}
										className="border rounded-lg bg-[--color-info]/5 border-[--color-info]/30"
									>
										<div className="flex items-center gap-2 p-3">
											<div className="flex-1 font-mono text-sm font-semibold text-[--color-info-dark]">
												{directive.name}{" "}
												{directive.args.length > 0 && directive.args.join(" ")}
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleStartEdit(directive)}
												className="h-8 w-8"
												title="Edit directive"
											>
												<Edit2 className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRemoveDirective(directive.id)}
												className="h-8 w-8"
												title="Delete directive"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
										{directive.block && directive.block.length > 0 && (
											<div className="px-3 pb-3 space-y-1 border-t border-[--color-info]/30 pt-2">
												{directive.block.map((subDirective) => (
													<div
														key={subDirective.id}
														className="font-mono text-xs text-[--color-info-dark] pl-4"
													>
														{subDirective.raw ||
															`${subDirective.name} ${subDirective.args.join(" ")}`}
													</div>
												))}
											</div>
										)}
									</div>
								))
							)}
						</div>

						{/* Add Directive */}
						<div>
							<Button
								onClick={() => setAddFeatureDialogOpen(true)}
								size="sm"
								className="w-full"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Directive
							</Button>
							<p className="text-sm text-muted-foreground mt-2">
								Add Caddy directives that will apply to all sites (e.g., tls,
								encode, header)
							</p>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave}>
						<Save className="h-4 w-4 mr-2" />
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>

			<EditDirectiveDialog
				directive={editingDirective}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSave={handleSaveEdit}
			/>

			<AddFeatureDialog
				open={addFeatureDialogOpen}
				onOpenChange={setAddFeatureDialogOpen}
				onAddDirectives={handleAddDirectives}
			/>
		</Dialog>
	);
}
