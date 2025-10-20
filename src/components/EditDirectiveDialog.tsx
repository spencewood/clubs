import { useEffect, useState } from "react";
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
import {
	type CaddyFeature,
	parseDirectiveWithFeatures,
} from "@/lib/caddy-features";
import type { CaddyDirective } from "@/types/caddyfile";

interface EditDirectiveDialogProps {
	directive: CaddyDirective | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (directive: CaddyDirective) => void;
}

export function EditDirectiveDialog({
	directive,
	open,
	onOpenChange,
	onSave,
}: EditDirectiveDialogProps) {
	const [editMode, setEditMode] = useState<"feature" | "raw">("raw");
	const [detectedFeature, setDetectedFeature] = useState<CaddyFeature | null>(
		null,
	);
	const [formValues, setFormValues] = useState<Record<string, unknown>>({});
	const [name, setName] = useState("");
	const [args, setArgs] = useState("");
	const [blockContent, setBlockContent] = useState("");

	useEffect(() => {
		if (directive) {
			// Try to parse the directive as a known feature
			const parsed = parseDirectiveWithFeatures(directive);

			if (parsed) {
				// Recognized feature - show feature form
				setEditMode("feature");
				setDetectedFeature(parsed.feature);
				setFormValues(parsed.values);
			} else {
				// Unknown directive - show raw editor
				setEditMode("raw");
				setDetectedFeature(null);
				setName(directive.name);
				setArgs(directive.args.join(" "));
				setBlockContent("");
			}
		}
	}, [directive]);

	const handleSaveFeature = () => {
		if (!directive || !detectedFeature) return;

		// Generate new directive(s) from feature
		const generated = detectedFeature.generate(formValues);

		if (generated.length > 0) {
			// Use the first generated directive and preserve the original ID
			const updated: CaddyDirective = {
				...generated[0],
				id: directive.id,
			};
			onSave(updated);
			onOpenChange(false);
		}
	};

	const handleSaveRaw = () => {
		if (!directive) return;

		const updated: CaddyDirective = {
			...directive,
			name: name.trim(),
			args: args
				.trim()
				.split(/\s+/)
				.filter((a) => a),
		};

		onSave(updated);
		onOpenChange(false);
	};

	const handleSwitchToRaw = () => {
		if (directive) {
			setName(directive.name);
			setArgs(directive.args.join(" "));
		}
		setEditMode("raw");
	};

	const isFormValid = () => {
		if (editMode === "feature" && detectedFeature) {
			return !detectedFeature.fields.some(
				(field) => field.required && !formValues[field.name],
			);
		}
		return name.trim().length > 0;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{editMode === "feature" && detectedFeature
							? detectedFeature.name
							: "Edit Directive"}
					</DialogTitle>
					<DialogDescription>
						{editMode === "feature" && detectedFeature
							? detectedFeature.description
							: "Modify the directive name and arguments."}
					</DialogDescription>
				</DialogHeader>

				{editMode === "feature" && detectedFeature && (
					<div className="space-y-4">
						<div className="space-y-4">
							{detectedFeature.fields.map((field) => (
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

						<div className="flex gap-2 pt-4 border-t">
							<Button
								variant="outline"
								onClick={handleSwitchToRaw}
								className="flex-1"
							>
								Switch to Raw Edit
							</Button>
							<Button
								onClick={handleSaveFeature}
								disabled={!isFormValid()}
								className="flex-1"
							>
								Save Changes
							</Button>
						</div>
					</div>
				)}

				{editMode === "raw" && (
					<div className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Directive Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., root, file_server, reverse_proxy"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="args">Arguments</Label>
							<Input
								id="args"
								value={args}
								onChange={(e) => setArgs(e.target.value)}
								placeholder="e.g., * /var/www/html"
							/>
						</div>
						{directive?.block && (
							<div className="grid gap-2">
								<Label htmlFor="block">Block Content</Label>
								<Textarea
									id="block"
									value={blockContent}
									onChange={(e) => setBlockContent(e.target.value)}
									placeholder="Nested directives (advanced)"
									rows={4}
								/>
							</div>
						)}

						<div className="flex gap-2 pt-4 border-t">
							{detectedFeature && (
								<Button
									variant="outline"
									onClick={() => setEditMode("feature")}
									className="flex-1"
								>
									Switch to Form
								</Button>
							)}
							<Button
								variant="outline"
								onClick={() => onOpenChange(false)}
								className={detectedFeature ? "" : "flex-1"}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSaveRaw}
								disabled={!isFormValid()}
								className="flex-1"
							>
								Save Changes
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
