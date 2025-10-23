import {
	ArrowRight,
	ArrowRightLeft,
	Boxes,
	Container,
	FileText,
	Plus,
	Server,
} from "lucide-react";
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
import { type Recipe, recipes } from "@/lib/recipes/caddyfile-recipes";
import type { CaddySiteBlock } from "@/types/caddyfile";

type BlockType = "physical" | "virtual-container";

interface NewSiteBlockDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateFromRecipe: (siteBlock: CaddySiteBlock) => void;
	onCreateBlank: () => void;
	onCreateVirtualContainer?: (domain: string, sharedConfig: string[]) => void;
	initialBlockType?: BlockType | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
	ArrowRightLeft,
	FileText,
	Boxes,
	ArrowRight,
	Server,
};

export function NewSiteBlockDialog({
	open,
	onOpenChange,
	onCreateFromRecipe,
	onCreateBlank,
	onCreateVirtualContainer,
	initialBlockType = null,
}: NewSiteBlockDialogProps) {
	const [blockType, setBlockType] = useState<BlockType | null>(null);
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
	const [formValues, setFormValues] = useState<Record<string, string>>({});
	const [virtualContainerDomain, setVirtualContainerDomain] = useState("");
	const wildcardDomainId = useId();

	// Update blockType when dialog opens with initialBlockType
	useEffect(() => {
		if (open) {
			setBlockType(initialBlockType);
		}
	}, [open, initialBlockType]);

	const handleRecipeSelect = (recipe: Recipe) => {
		setSelectedRecipe(recipe);
		// Initialize form with default values
		const defaults: Record<string, string> = {};
		for (const field of recipe.fields) {
			if (field.defaultValue !== undefined) {
				defaults[field.name] = String(field.defaultValue);
			}
		}
		setFormValues(defaults);
	};

	const handleFieldChange = (name: string, value: string) => {
		setFormValues((prev) => ({ ...prev, [name]: value }));
	};

	const handleComplete = () => {
		if (!selectedRecipe) return;

		const siteBlock = selectedRecipe.generate(formValues);
		onCreateFromRecipe(siteBlock);
		handleClose();
	};

	const handleBlankCreate = () => {
		onCreateBlank();
		handleClose();
	};

	const handleClose = () => {
		setBlockType(null);
		setSelectedRecipe(null);
		setFormValues({});
		setVirtualContainerDomain("");
		onOpenChange(false);
	};


	const handleVirtualContainerCreate = () => {
		if (!onCreateVirtualContainer || !virtualContainerDomain.trim()) return;
		// Auto-prepend *. to the domain
		const fullDomain = `*.${virtualContainerDomain.trim()}`;
		// For now, create with minimal config - user can add shared config later
		onCreateVirtualContainer(fullDomain, []);
		handleClose();
	};

	const isFormValid = () => {
		if (!selectedRecipe) return false;
		return selectedRecipe.fields
			.filter((f) => f.required)
			.every((f) => formValues[f.name]?.trim());
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl">
				{blockType === "virtual-container" ? (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Container className="h-5 w-5 text-blue-600" />
								Create Container
							</DialogTitle>
							<DialogDescription>
								Create a wildcard domain to host multiple services with shared
								configuration
							</DialogDescription>
						</DialogHeader>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleVirtualContainerCreate();
							}}
						>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor={wildcardDomainId}>
										Domain
										<span className="text-destructive ml-1">*</span>
									</Label>
									<div className="flex items-center gap-2">
										<span className="text-sm font-mono text-muted-foreground">
											*.
										</span>
										<Input
											id={wildcardDomainId}
											type="text"
											placeholder="services.example.com"
											value={virtualContainerDomain}
											onChange={(e) => setVirtualContainerDomain(e.target.value)}
											className="flex-1"
										/>
									</div>
									<p className="text-sm text-muted-foreground">
										All subdomains will be matched (e.g., api.services.example.com,
										web.services.example.com)
									</p>
								</div>
							</div>

							<DialogFooter>
								<Button type="submit" disabled={!virtualContainerDomain.trim()}>
									Create Container
								</Button>
							</DialogFooter>
						</form>
					</>
				) : !selectedRecipe ? (
					<>
						<DialogHeader>
							<DialogTitle>Create Site</DialogTitle>
							<DialogDescription>
								Choose a template to get started quickly, or create a blank site
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
									Templates
								</h3>
								<div className="grid grid-cols-2 gap-3">
									{recipes.map((recipe) => {
										const Icon = iconMap[recipe.icon] || Server;
										return (
											<button
												key={recipe.id}
												type="button"
												onClick={() => handleRecipeSelect(recipe)}
												className="flex items-start gap-3 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-colors text-left"
											>
												<Icon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
												<div className="flex-1">
													<h4 className="font-semibold">{recipe.name}</h4>
													<p className="text-sm text-muted-foreground mt-1">
														{recipe.description}
													</p>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-2 text-muted-foreground">
										Or
									</span>
								</div>
							</div>

							<div>
								<button
									type="button"
									onClick={handleBlankCreate}
									className="w-full flex items-start gap-3 p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-colors text-left"
								>
									<Plus className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
									<div className="flex-1">
										<h4 className="font-semibold">Start from Scratch</h4>
										<p className="text-sm text-muted-foreground mt-1">
											Create an empty site and configure it manually
										</p>
									</div>
								</button>
							</div>
						</div>

					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								{(() => {
									const Icon = iconMap[selectedRecipe.icon] || Server;
									return <Icon className="h-5 w-5 text-primary" />;
								})()}
								{selectedRecipe.name}
							</DialogTitle>
							<DialogDescription>
								{selectedRecipe.description}
							</DialogDescription>
						</DialogHeader>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleComplete();
							}}
						>
							<div className="space-y-4 py-4">
								{selectedRecipe.fields.map((field) => (
									<div key={field.name} className="space-y-2">
										<Label htmlFor={field.name}>
											{field.label}
											{field.required && (
												<span className="text-destructive ml-1">*</span>
											)}
										</Label>
										{field.type === "text" || field.type === "number" ? (
											<Input
												id={field.name}
												type={field.type}
												placeholder={field.placeholder}
												value={formValues[field.name] || ""}
												onChange={(e) =>
													handleFieldChange(field.name, e.target.value)
												}
											/>
										) : field.type === "select" ? (
											<select
												id={field.name}
												value={formValues[field.name] || ""}
												onChange={(e) =>
													handleFieldChange(field.name, e.target.value)
												}
												className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
											>
												<option value="">Select...</option>
												{field.options?.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</select>
										) : field.type === "boolean" ? (
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													id={field.name}
													checked={formValues[field.name] === "true"}
													onChange={(e) =>
														handleFieldChange(
															field.name,
															e.target.checked ? "true" : "false",
														)
													}
													className="h-4 w-4 rounded border-input"
												/>
												<span className="text-sm text-muted-foreground">
													{field.description}
												</span>
											</div>
										) : null}
										{field.description && field.type !== "boolean" && (
											<p className="text-sm text-muted-foreground">
												{field.description}
											</p>
										)}
									</div>
								))}
							</div>

							<DialogFooter>
								<Button type="submit" disabled={!isFormValid()}>
									Create Site
								</Button>
							</DialogFooter>
						</form>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
