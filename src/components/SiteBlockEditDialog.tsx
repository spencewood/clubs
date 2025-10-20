import { Globe, Pencil, Plus, Server, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDirectiveWithFeatures } from "@/lib/caddy-features";
import type { CaddyDirective, CaddySiteBlock } from "@/types/caddyfile";
import { AddFeatureDialog } from "./AddFeatureDialog";
import { EditDirectiveDialog } from "./EditDirectiveDialog";

interface SiteBlockEditDialogProps {
	siteBlock: CaddySiteBlock | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (siteBlock: CaddySiteBlock) => void;
}

export function SiteBlockEditDialog({
	siteBlock,
	open,
	onOpenChange,
	onSave,
}: SiteBlockEditDialogProps) {
	const [addresses, setAddresses] = useState<string[]>([]);
	const [directives, setDirectives] = useState<CaddyDirective[]>([]);
	const [showAddFeature, setShowAddFeature] = useState(false);
	const [editingDirective, setEditingDirective] =
		useState<CaddyDirective | null>(null);

	useEffect(() => {
		if (siteBlock) {
			setAddresses([...siteBlock.addresses]);
			setDirectives([...siteBlock.directives]);
		}
	}, [siteBlock]);

	const handleAddAddress = () => {
		setAddresses([...addresses, ""]);
	};

	const handleRemoveAddress = (index: number) => {
		setAddresses(addresses.filter((_, i) => i !== index));
	};

	const handleUpdateAddress = (index: number, value: string) => {
		const newAddresses = [...addresses];
		newAddresses[index] = value;
		setAddresses(newAddresses);
	};

	const handleAddDirectives = (newDirectives: CaddyDirective[]) => {
		setDirectives([...directives, ...newDirectives]);
	};

	const handleEditDirective = (directive: CaddyDirective) => {
		setEditingDirective(directive);
	};

	const handleSaveDirective = (updated: CaddyDirective) => {
		setDirectives(directives.map((d) => (d.id === updated.id ? updated : d)));
	};

	const handleDeleteDirective = (id: string) => {
		setDirectives(directives.filter((d) => d.id !== id));
	};

	const handleSave = () => {
		if (!siteBlock) return;

		const validAddresses = addresses.filter((a) => a.trim().length > 0);
		if (validAddresses.length === 0) {
			alert("Please add at least one address");
			return;
		}

		onSave({
			...siteBlock,
			addresses: validAddresses,
			directives,
		});

		onOpenChange(false);
	};

	const getFeatureName = (directive: CaddyDirective) => {
		const parsed = parseDirectiveWithFeatures(directive);
		if (parsed) {
			return parsed.feature.name;
		}
		return directive.name;
	};

	const getFeatureDescription = (directive: CaddyDirective) => {
		const parsed = parseDirectiveWithFeatures(directive);
		if (parsed) {
			return parsed.feature.description;
		}
		// Generate a basic description from args
		return directive.args.join(" ");
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Site Block</DialogTitle>
						<DialogDescription>
							Configure addresses and features for this site block
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Addresses Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label className="text-base font-semibold">Addresses</Label>
								<Button variant="outline" size="sm" onClick={handleAddAddress}>
									<Plus className="h-4 w-4 mr-2" />
									Add Address
								</Button>
							</div>
							<div className="space-y-2">
								{addresses.map((address, index) => (
									<div
										key={`address-${index}-${address}`}
										className="flex gap-2"
									>
										<div className="relative flex-1">
											{address.includes(".") && !address.startsWith(":") ? (
												<Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											) : (
												<Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											)}
											<Input
												value={address}
												onChange={(e) =>
													handleUpdateAddress(index, e.target.value)
												}
												placeholder="example.com or :8080"
												className="pl-10"
											/>
										</div>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleRemoveAddress(index)}
											disabled={addresses.length === 1}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>

						{/* Features Section */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label className="text-base font-semibold">Features</Label>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowAddFeature(true)}
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Feature
								</Button>
							</div>
							{directives.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
									No features configured. Click "Add Feature" to get started.
								</div>
							) : (
								<div className="space-y-2">
									{directives.map((directive) => (
										<div
											key={directive.id}
											className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
										>
											<div className="flex-1 min-w-0">
												<div className="font-medium">
													{getFeatureName(directive)}
												</div>
												<div className="text-sm text-muted-foreground truncate">
													{getFeatureDescription(directive)}
												</div>
											</div>
											<div className="flex gap-2 flex-shrink-0">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEditDirective(directive)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteDirective(directive.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="flex gap-2 pt-4 border-t">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} className="flex-1">
							Save Changes
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<AddFeatureDialog
				open={showAddFeature}
				onOpenChange={setShowAddFeature}
				onAddDirectives={handleAddDirectives}
			/>

			<EditDirectiveDialog
				directive={editingDirective}
				open={!!editingDirective}
				onOpenChange={(open) => !open && setEditingDirective(null)}
				onSave={handleSaveDirective}
			/>
		</>
	);
}
