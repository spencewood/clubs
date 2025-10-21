import { LinkIcon, Plus, Trash2 } from "lucide-react";
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
import type { CaddyDirective, CaddySiteBlock } from "@/types/caddyfile";

interface EditVirtualBlockDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	containerId: string;
	serviceId: string;
	siteBlock: CaddySiteBlock | null;
	onSave: (siteBlock: CaddySiteBlock) => void;
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function EditVirtualBlockDialog({
	open,
	onOpenChange,
	containerId: _containerId,
	serviceId,
	siteBlock,
	onSave,
}: EditVirtualBlockDialogProps) {
	const [hostname, setHostname] = useState("");
	const [matcherName, setMatcherName] = useState("");
	const [directives, setDirectives] = useState<CaddyDirective[]>([]);
	const [newDirective, setNewDirective] = useState("");
	const hostnameId = useId();
	const matcherNameId = useId();

	useEffect(() => {
		if (!siteBlock) return;

		// Find the handle directive by ID
		const handleDirective = siteBlock.directives.find(
			(d) => d.id === serviceId,
		);
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
	}, [siteBlock, serviceId]);

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
			(d) => d.id === serviceId,
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

	const handleAddDirective = () => {
		if (!newDirective.trim()) return;

		const parts = newDirective.trim().split(/\s+/);
		const name = parts[0];
		const args = parts.slice(1);

		const directive: CaddyDirective = {
			id: generateId(),
			name,
			args,
			raw: newDirective.trim(),
		};

		setDirectives([...directives, directive]);
		setNewDirective("");
	};

	const handleRemoveDirective = (id: string) => {
		setDirectives(directives.filter((d) => d.id !== id));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<LinkIcon className="h-5 w-5 text-purple-600" />
						Edit Virtual Service
					</DialogTitle>
					<DialogDescription>
						Configure this individual service within the virtual container
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
											onClick={() => handleRemoveDirective(directive.id)}
											className="h-8 w-8"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))
							)}
						</div>

						{/* Add Directive */}
						<div className="flex gap-2">
							<Input
								value={newDirective}
								onChange={(e) => setNewDirective(e.target.value)}
								placeholder="e.g., reverse_proxy localhost:8080"
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
							Add Caddy directives specific to this service (e.g.,
							reverse_proxy, respond)
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save Changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
