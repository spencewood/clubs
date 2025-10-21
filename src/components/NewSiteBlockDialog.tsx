import {
	ArrowRight,
	ArrowRightLeft,
	Boxes,
	ChevronLeft,
	Container,
	FileText,
	Globe,
	Plus,
	Server,
} from "lucide-react";
import { useId, useState } from "react";
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
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
	ArrowRightLeft,
	FileText,
	Boxes,
	ArrowRight,
	Server,
};

function _generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function NewSiteBlockDialog({
	open,
	onOpenChange,
	onCreateFromRecipe,
	onCreateBlank,
	onCreateVirtualContainer,
}: NewSiteBlockDialogProps) {
	const [blockType, setBlockType] = useState<BlockType | null>(null);
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
	const [formValues, setFormValues] = useState<Record<string, string>>({});
	const [virtualContainerDomain, setVirtualContainerDomain] = useState("");
	const wildcardDomainId = useId();

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

	const handleBack = () => {
		if (selectedRecipe) {
			setSelectedRecipe(null);
			setFormValues({});
		} else {
			setBlockType(null);
			setVirtualContainerDomain("");
		}
	};

	const handleVirtualContainerCreate = () => {
		if (!onCreateVirtualContainer || !virtualContainerDomain.trim()) return;
		// For now, create with minimal config - user can add shared config later
		onCreateVirtualContainer(virtualContainerDomain, []);
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
				{!blockType ? (
					<>
						<DialogHeader>
							<DialogTitle>Choose Block Type</DialogTitle>
							<DialogDescription>
								Select the type of configuration block you want to create
							</DialogDescription>
						</DialogHeader>

						<div className="grid grid-cols-2 gap-4 py-6">
							<button
								type="button"
								onClick={() => setBlockType("physical")}
								className="flex flex-col items-start gap-3 p-6 rounded-lg border-2 border-green-200 hover:border-green-500 hover:bg-green-50/50 transition-colors text-left"
							>
								<div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
									<Globe className="h-6 w-6 text-green-600" />
								</div>
								<div>
									<h4 className="font-semibold text-lg">Physical Block</h4>
									<p className="text-sm text-muted-foreground mt-1">
										Traditional site block with its own independent
										configuration
									</p>
								</div>
								<div className="text-xs text-muted-foreground mt-2">
									Example: blog.example.com, api.example.com
								</div>
							</button>

							<button
								type="button"
								onClick={() => setBlockType("virtual-container")}
								className="flex flex-col items-start gap-3 p-6 rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-left"
							>
								<div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
									<Container className="h-6 w-6 text-blue-600" />
								</div>
								<div>
									<h4 className="font-semibold text-lg">Virtual Container</h4>
									<p className="text-sm text-muted-foreground mt-1">
										Wildcard domain with shared config for multiple services
									</p>
								</div>
								<div className="text-xs text-muted-foreground mt-2">
									Example: *.services.example.com
								</div>
							</button>
						</div>
					</>
				) : blockType === "virtual-container" ? (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Container className="h-5 w-5 text-blue-600" />
								Create Virtual Container
							</DialogTitle>
							<DialogDescription>
								Create a wildcard domain to host multiple services with shared
								configuration
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor={wildcardDomainId}>
									Wildcard Domain
									<span className="text-destructive ml-1">*</span>
								</Label>
								<Input
									id={wildcardDomainId}
									type="text"
									placeholder="*.services.example.com"
									value={virtualContainerDomain}
									onChange={(e) => setVirtualContainerDomain(e.target.value)}
								/>
								<p className="text-sm text-muted-foreground">
									Use wildcard notation (e.g., *.services.example.com) to match
									all subdomains
								</p>
							</div>
						</div>

						<DialogFooter className="gap-2">
							<Button variant="outline" onClick={handleBack}>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Back
							</Button>
							<Button
								onClick={handleVirtualContainerCreate}
								disabled={
									!virtualContainerDomain.trim() ||
									!virtualContainerDomain.includes("*")
								}
							>
								Create Virtual Container
							</Button>
						</DialogFooter>
					</>
				) : !selectedRecipe ? (
					<>
						<DialogHeader>
							<DialogTitle>Create Physical Site Block</DialogTitle>
							<DialogDescription>
								Choose a template to get started quickly, or create a blank site
								block
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
												className="flex flex-col items-start gap-3 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-colors text-left"
											>
												<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
													<Icon className="h-5 w-5 text-primary" />
												</div>
												<div>
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
									className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-colors text-left"
								>
									<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
										<Plus className="h-5 w-5 text-muted-foreground" />
									</div>
									<div>
										<h4 className="font-semibold">Start from Scratch</h4>
										<p className="text-sm text-muted-foreground mt-1">
											Create an empty site block and configure it manually
										</p>
									</div>
								</button>
							</div>
						</div>

						<DialogFooter>
							<Button variant="outline" onClick={handleBack}>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Back
							</Button>
						</DialogFooter>
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

						<DialogFooter className="gap-2">
							<Button variant="outline" onClick={handleBack}>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Back
							</Button>
							<Button onClick={handleComplete} disabled={!isFormValid()}>
								Create Site Block
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
