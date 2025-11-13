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
import type { CaddyDirective, CaddySiteBlock } from "@/types/caddyfile";

interface EditContainerSiteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	containerId: string;
	siteId: string;
	siteBlock: CaddySiteBlock | null;
	onSave: (siteBlock: CaddySiteBlock) => void;
}

export function EditContainerSiteDialog({
	open,
	onOpenChange,
	containerId: _containerId,
	siteId,
	siteBlock,
	onSave,
}: EditContainerSiteDialogProps) {
	const [hostname, setHostname] = useState("");
	const [matcherName, setMatcherName] = useState("");
	const [directives, setDirectives] = useState<CaddyDirective[]>([]);
	const [editingDirective, setEditingDirective] =
		useState<CaddyDirective | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [addFeatureDialogOpen, setAddFeatureDialogOpen] = useState(false);
	const hostnameId = useId();
	const matcherNameId = useId();

	useEffect(() => {
		if (!siteBlock) return;

		// Find the handle directive by ID
		const handleDirective = siteBlock.directives.find((d) => d.id === siteId);
		if (!handleDirective || handleDirective.name !== "handle") return;

		// Extract matcher name from handle args (e.g., "@api" -> "api")
		const matcherRef = handleDirective.args[0] || "";
		const matcher = matcherRef.startsWith("@")
			? matcherRef.substring(1)
			: matcherRef;
		setMatcherName(matcher);

		// Find the matcher directive to get hostname
		const matcherDirective = siteBlock.directives.find(
			(d) => d.name === `@${matcher}`,
		);
		if (matcherDirective && matcherDirective.args[0] === "host") {
			setHostname(matcherDirective.args[1] || "");
		}

		// Get directives from handle block
		setDirectives(handleDirective.block || []);
	}, [siteBlock, siteId]);

	const handleSave = () => {
		if (!siteBlock) return;

		const updatedSiteBlock = { ...siteBlock };

		// Update matcher directive
		const matcherDirectiveIndex = updatedSiteBlock.directives.findIndex(
			(d) => d.name === `@${matcherName}`,
		);
		if (matcherDirectiveIndex !== -1) {
			updatedSiteBlock.directives[matcherDirectiveIndex] = {
				...updatedSiteBlock.directives[matcherDirectiveIndex],
				args: ["host", hostname],
				raw: `@${matcherName} host ${hostname}`,
			};
		}

		// Update handle directive
		const handleDirectiveIndex = updatedSiteBlock.directives.findIndex(
			(d) => d.id === siteId,
		);
		if (handleDirectiveIndex !== -1) {
			updatedSiteBlock.directives[handleDirectiveIndex] = {
				...updatedSiteBlock.directives[handleDirectiveIndex],
				block: directives,
			};
		}

		onSave(updatedSiteBlock);
		onOpenChange(false);
	};

	const handleAddDirectives = (newDirectives: CaddyDirective[]) => {
		setDirectives([...directives, ...newDirectives]);
	};

	const handleStartEdit = (directive: CaddyDirective) => {
		setEditingDirective(directive);
		setEditDialogOpen(true);
	};

	const handleSaveEdit = (updatedDirective: CaddyDirective) => {
		setDirectives(
			directives.map((d) =>
				d.id === updatedDirective.id ? updatedDirective : d,
			),
		);
	};

	const handleRemoveDirective = (id: string) => {
		setDirectives(directives.filter((d) => d.id !== id));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Virtual Service</DialogTitle>
					<DialogDescription>
						Configure this individual service within the container
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Hostname */}
					<div className="space-y-2">
						<Label htmlFor={hostnameId}>Hostname</Label>
						<Input
							id={hostnameId}
							value={hostname}
							onChange={(e) => setHostname(e.target.value)}
							placeholder="api.services.example.com"
						/>
						<p className="text-sm text-muted-foreground">
							Full hostname for this service
						</p>
					</div>

					{/* Matcher Name */}
					<div className="space-y-2">
						<Label htmlFor={matcherNameId}>Matcher Name</Label>
						<Input
							id={matcherNameId}
							value={matcherName}
							onChange={(e) => setMatcherName(e.target.value)}
							placeholder="api"
						/>
						<p className="text-sm text-muted-foreground">
							Used in config as{" "}
							<span className="font-mono">@{matcherName || "matcher"}</span>
						</p>
					</div>

					{/* Directives */}
					<div className="space-y-2">
						<Label>Service Directives</Label>
						<div className="space-y-2">
							{directives.length === 0 ? (
								<div className="text-sm text-muted-foreground italic p-3 border rounded-lg border-dashed">
									No directives. Add directives below for this service.
								</div>
							) : (
								directives.map((directive) => (
									<div
										key={directive.id}
										className="flex items-center gap-2 p-3 border rounded-lg bg-purple-50/30 border-purple-200"
									>
										<div className="flex-1 font-mono text-sm">
											{directive.raw ||
												`${directive.name} ${directive.args.join(" ")}`}
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
								Add Caddy directives specific to this service (e.g.,
								reverse_proxy, respond)
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
