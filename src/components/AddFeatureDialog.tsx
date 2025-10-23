import {
	Archive,
	ArrowLeft,
	ArrowLeftRight,
	ArrowRight,
	Code,
	FileCode,
	FileText,
	FolderOpen,
	Globe,
	Lock,
} from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type CaddyFeature, caddyFeatures } from "@/lib/caddy-features";
import type { CaddyDirective } from "@/types/caddyfile";

interface AddFeatureDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddDirectives: (directives: CaddyDirective[]) => void;
}

const iconMap = {
	ArrowLeftRight,
	FolderOpen,
	Archive,
	FileCode,
	ArrowRight,
	FileText,
	Lock,
	Globe,
};

export function AddFeatureDialog({
	open,
	onOpenChange,
	onAddDirectives,
}: AddFeatureDialogProps) {
	const rawDirectiveId = useId();
	const [selectedFeature, setSelectedFeature] = useState<CaddyFeature | null>(
		null,
	);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [rawDirective, setRawDirective] = useState("");
	const [formValues, setFormValues] = useState<Record<string, unknown>>({});

	const handleFeatureSelect = (feature: CaddyFeature) => {
		setSelectedFeature(feature);
		setShowAdvanced(false);

		// Initialize form with default values
		const defaults: Record<string, unknown> = {};
		for (const field of feature.fields) {
			if (field.defaultValue !== undefined) {
				defaults[field.name] = field.defaultValue;
			}
		}
		setFormValues(defaults);
	};

	const handleAdvancedClick = () => {
		setShowAdvanced(true);
		setSelectedFeature(null);
		setRawDirective("");
	};

	const handleBack = () => {
		setSelectedFeature(null);
		setShowAdvanced(false);
		setFormValues({});
		setRawDirective("");
	};

	const handleSubmit = () => {
		if (showAdvanced) {
			// Parse raw directive
			const trimmed = rawDirective.trim();
			if (trimmed) {
				const parts = trimmed.split(/\s+/);
				const directive: CaddyDirective = {
					id: `directive-${Date.now()}-${Math.random()}`,
					name: parts[0] || "",
					args: parts.slice(1),
					raw: trimmed,
				};
				onAddDirectives([directive]);
				handleClose();
			}
		} else if (selectedFeature) {
			// Validate required fields
			const missingRequired = selectedFeature.fields.some(
				(field) => field.required && !formValues[field.name],
			);

			if (missingRequired) {
				return;
			}

			const directives = selectedFeature.generate(formValues);
			onAddDirectives(directives);
			handleClose();
		}
	};

	const handleClose = () => {
		onOpenChange(false);
		setTimeout(() => {
			handleBack();
		}, 200);
	};

	const isFormValid = () => {
		if (showAdvanced) {
			return rawDirective.trim().length > 0;
		}
		if (!selectedFeature) {
			return false;
		}
		return !selectedFeature.fields.some(
			(field) => field.required && !formValues[field.name],
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{selectedFeature
							? selectedFeature.name
							: showAdvanced
								? "Advanced: Raw Directive"
								: "Add Feature"}
					</DialogTitle>
					<DialogDescription>
						{selectedFeature
							? selectedFeature.description
							: showAdvanced
								? "Enter a raw Caddy directive for advanced configuration"
								: "Choose a feature to add to this site block"}
					</DialogDescription>
				</DialogHeader>

				{!selectedFeature && !showAdvanced && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							{caddyFeatures.map((feature) => {
								const Icon = iconMap[feature.icon as keyof typeof iconMap];
								return (
									<button
										type="button"
										key={feature.id}
										onClick={() => handleFeatureSelect(feature)}
										className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left"
									>
										<Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
										<div className="min-w-0 flex-1">
											<div className="font-medium">{feature.name}</div>
											<div className="text-sm text-muted-foreground mt-1">
												{feature.description}
											</div>
										</div>
									</button>
								);
							})}
						</div>

						<button
							type="button"
							onClick={handleAdvancedClick}
							className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-accent hover:border-primary transition-colors"
						>
							<Code className="h-5 w-5" />
							<span className="font-medium">Advanced: Enter Raw Directive</span>
						</button>
					</div>
				)}

				{selectedFeature && (
					<div className="space-y-4">
						<div className="space-y-4">
							{selectedFeature.fields.map((field) => (
								<div key={field.name} className="space-y-2">
									<Label htmlFor={field.name}>
										{field.label}
										{field.required && (
											<span className="text-destructive ml-1">*</span>
										)}
									</Label>

									{field.type === "text" && (
										<Input
											id={field.name}
											placeholder={field.placeholder}
											value={(formValues[field.name] as string) || ""}
											onChange={(e) =>
												setFormValues({
													...formValues,
													[field.name]: e.target.value,
												})
											}
										/>
									)}

									{field.type === "number" && (
										<Input
											id={field.name}
											type="number"
											placeholder={field.placeholder}
											value={(formValues[field.name] as number) || ""}
											onChange={(e) =>
												setFormValues({
													...formValues,
													[field.name]: Number.parseInt(e.target.value, 10),
												})
											}
										/>
									)}

									{field.type === "boolean" && (
										<div className="flex items-center gap-2">
											<Checkbox
												id={field.name}
												checked={(formValues[field.name] as boolean) || false}
												onCheckedChange={(checked) =>
													setFormValues({
														...formValues,
														[field.name]: checked,
													})
												}
											/>
											<Label htmlFor={field.name} className="font-normal">
												{field.helpText}
											</Label>
										</div>
									)}

									{field.type === "select" && (
										<Select
											value={(formValues[field.name] as string) || ""}
											onValueChange={(value) =>
												setFormValues({
													...formValues,
													[field.name]: value,
												})
											}
										>
											<SelectTrigger>
												<SelectValue placeholder={field.placeholder} />
											</SelectTrigger>
											<SelectContent>
												{field.options?.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}

									{field.helpText && field.type !== "boolean" && (
										<p className="text-sm text-muted-foreground">
											{field.helpText}
										</p>
									)}
								</div>
							))}
						</div>

						<div className="flex gap-2 pt-4">
							<Button variant="outline" onClick={handleBack}>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!isFormValid()}
								className="flex-1"
							>
								Add Feature
							</Button>
						</div>
					</div>
				)}

				{showAdvanced && (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={rawDirectiveId}>Directive</Label>
							<Textarea
								id={rawDirectiveId}
								placeholder="reverse_proxy localhost:8080"
								value={rawDirective}
								onChange={(e) => setRawDirective(e.target.value)}
								rows={4}
								className="font-mono text-sm"
							/>
							<p className="text-sm text-muted-foreground">
								Enter a Caddy directive exactly as it would appear in a
								Caddyfile. You can include subdirectives on new lines.
							</p>
						</div>

						<div className="flex gap-2 pt-4">
							<Button variant="outline" onClick={handleBack}>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!isFormValid()}
								className="flex-1"
							>
								Add Directive
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
