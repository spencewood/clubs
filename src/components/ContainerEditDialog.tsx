import { Check, Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
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

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function ContainerEditDialog({
	siteBlock,
	open,
	onOpenChange,
	onSave,
}: ContainerEditDialogProps) {
	const [container, setContainer] = useState<VirtualContainer | null>(null);
	const [wildcardDomain, setWildcardDomain] = useState("");
	const [newDirective, setNewDirective] = useState("");
	const [editingDirectiveId, setEditingDirectiveId] = useState<string | null>(
		null,
	);
	const [editingDirectiveText, setEditingDirectiveText] = useState("");
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

	const handleAddDirective = () => {
		if (!container || !newDirective.trim()) return;

		const parts = newDirective.trim().split(/\s+/);
		const name = parts[0];
		const args = parts.slice(1);

		const directive: CaddyDirective = {
			id: generateId(),
			name,
			args,
			raw: newDirective.trim(),
		};

		setContainer({
			...container,
			sharedConfig: [...container.sharedConfig, directive],
		});
		setNewDirective("");
	};

	const handleRemoveDirective = (id: string) => {
		if (!container) return;

		setContainer({
			...container,
			sharedConfig: container.sharedConfig.filter((d) => d.id !== id),
		});
	};

	const handleStartEdit = (directive: CaddyDirective) => {
		setEditingDirectiveId(directive.id);
		// Reconstruct the raw text from the directive
		const text =
			directive.raw || `${directive.name} ${directive.args.join(" ")}`;
		setEditingDirectiveText(text);
	};

	const handleSaveEdit = () => {
		if (!container || !editingDirectiveId) return;

		const parts = editingDirectiveText.trim().split(/\s+/);
		const name = parts[0];
		const args = parts.slice(1);

		const updatedConfig = container.sharedConfig.map((d) =>
			d.id === editingDirectiveId
				? {
						...d,
						name,
						args,
						raw: editingDirectiveText.trim(),
					}
				: d,
		);

		setContainer({
			...container,
			sharedConfig: updatedConfig,
		});

		setEditingDirectiveId(null);
		setEditingDirectiveText("");
	};

	const handleCancelEdit = () => {
		setEditingDirectiveId(null);
		setEditingDirectiveText("");
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
										className="border rounded-lg bg-[var(--color-info)]/5 border-[var(--color-info)]/30"
									>
										{editingDirectiveId === directive.id ? (
											// Edit mode
											<div className="p-3 space-y-2">
												<Input
													value={editingDirectiveText}
													onChange={(e) =>
														setEditingDirectiveText(e.target.value)
													}
													className="font-mono text-sm"
													placeholder="e.g., encode gzip"
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															handleSaveEdit();
														} else if (e.key === "Escape") {
															handleCancelEdit();
														}
													}}
													autoFocus
												/>
												<div className="flex gap-2">
													<Button
														size="sm"
														onClick={handleSaveEdit}
														disabled={!editingDirectiveText.trim()}
													>
														<Check className="h-3 w-3 mr-1" />
														Save
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={handleCancelEdit}
													>
														<X className="h-3 w-3 mr-1" />
														Cancel
													</Button>
												</div>
											</div>
										) : (
											// View mode
											<>
												<div className="flex items-center gap-2 p-3">
													<div className="flex-1 font-mono text-sm font-semibold text-[var(--color-info-dark)]">
														{directive.name}{" "}
														{directive.args.length > 0 &&
															directive.args.join(" ")}
													</div>
													{/* Only allow editing simple directives without blocks */}
													{(!directive.block ||
														directive.block.length === 0) && (
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleStartEdit(directive)}
															className="h-8 w-8"
															title="Edit directive"
														>
															<Edit2 className="h-4 w-4" />
														</Button>
													)}
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
													<div className="px-3 pb-3 space-y-1 border-t border-[var(--color-info)]/30 pt-2">
														{directive.block.map((subDirective) => (
															<div
																key={subDirective.id}
																className="font-mono text-xs text-[var(--color-info-dark)] pl-4"
															>
																{subDirective.raw ||
																	`${subDirective.name} ${subDirective.args.join(" ")}`}
															</div>
														))}
													</div>
												)}
											</>
										)}
									</div>
								))
							)}
						</div>

						{/* Add Directive */}
						<div className="flex gap-2">
							<Input
								value={newDirective}
								onChange={(e) => setNewDirective(e.target.value)}
								placeholder="e.g., encode gzip or tls internal"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddDirective();
									}
								}}
							/>
							<Button
								onClick={handleAddDirective}
								disabled={!newDirective.trim()}
								size="sm"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add
							</Button>
						</div>
						<p className="text-sm text-muted-foreground">
							Add Caddy directives that will apply to all sites (e.g., tls,
							encode, header)
						</p>
					</div>

					{/* Info about complex edits */}
					<div className="p-3 bg-muted rounded-lg border">
						<p className="text-sm text-muted-foreground">
							<strong>Note:</strong> Complex directives with nested blocks (like
							tls, header) cannot be edited inline. Use the <strong>Raw</strong>{" "}
							tab for full control over these directives.
						</p>
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
		</Dialog>
	);
}
