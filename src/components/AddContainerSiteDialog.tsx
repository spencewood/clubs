import { LinkIcon } from "lucide-react";
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

interface AddContainerSiteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	containerDomain: string; // e.g., "*.services.example.com"
	onCreateSite: (site: {
		subdomain: string;
		matcherName: string;
		backend?: string;
	}) => void;
}

export function AddContainerSiteDialog({
	open,
	onOpenChange,
	containerDomain,
	onCreateSite,
}: AddContainerSiteDialogProps) {
	const [subdomain, setSubdomain] = useState("");
	const [matcherName, setMatcherName] = useState("");
	const [backend, setBackend] = useState("");
	const subdomainId = useId();
	const matcherNameId = useId();
	const backendId = useId();

	// Auto-generate matcher name from subdomain
	const handleSubdomainChange = (value: string) => {
		setSubdomain(value);
		// Auto-fill matcher name with sanitized subdomain
		if (
			!matcherName ||
			matcherName === subdomain.replace(/[^a-zA-Z0-9]/g, "_")
		) {
			setMatcherName(value.replace(/[^a-zA-Z0-9]/g, "_"));
		}
	};

	const handleClose = () => {
		setSubdomain("");
		setMatcherName("");
		setBackend("");
		onOpenChange(false);
	};

	const handleCreate = () => {
		if (!subdomain.trim() || !matcherName.trim()) return;

		onCreateSite({
			subdomain: subdomain.trim(),
			matcherName: matcherName.trim(),
			backend: backend.trim() || undefined,
		});
		handleClose();
	};

	// Extract base domain from wildcard (e.g., "*.services.example.com" -> "services.example.com")
	const baseDomain = containerDomain.replace(/^\*\./, "");
	const fullHostname = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;

	const isFormValid = subdomain.trim() && matcherName.trim();

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<LinkIcon className="h-5 w-5 text-purple-600" />
						Add Site to Container
					</DialogTitle>
					<DialogDescription>
						Add a new site to{" "}
						<span className="font-mono font-semibold">{containerDomain}</span>
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleCreate();
					}}
				>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor={subdomainId}>
								Subdomain
								<span className="text-destructive ml-1">*</span>
							</Label>
							<Input
								id={subdomainId}
								type="text"
								placeholder="api"
								value={subdomain}
								onChange={(e) => handleSubdomainChange(e.target.value)}
							/>
							<p className="text-sm text-muted-foreground">
								Full hostname will be:{" "}
								<span className="font-mono font-semibold text-purple-700">
									{fullHostname}
								</span>
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor={matcherNameId}>
								Matcher Name
								<span className="text-destructive ml-1">*</span>
							</Label>
							<Input
								id={matcherNameId}
								type="text"
								placeholder="api"
								value={matcherName}
								onChange={(e) => setMatcherName(e.target.value)}
							/>
							<p className="text-sm text-muted-foreground">
								Used in Caddy config as{" "}
								<span className="font-mono">@{matcherName || "matcher"}</span>
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor={backendId}>Backend Server (Optional)</Label>
							<Input
								id={backendId}
								type="text"
								placeholder="localhost:8080"
								value={backend}
								onChange={(e) => setBackend(e.target.value)}
							/>
							<p className="text-sm text-muted-foreground">
								If provided, will add a reverse_proxy directive
							</p>
						</div>

						{/* Preview */}
						<div className="p-3 bg-muted rounded-lg border">
							<h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
								Generated Config Preview
							</h4>
							<pre className="text-xs font-mono">
								{matcherName && subdomain ? (
									<>
										<span className="text-purple-600">@{matcherName}</span> host{" "}
										{fullHostname}
										{"\n"}
										handle{" "}
										<span className="text-purple-600">@{matcherName}</span>{" "}
										{"{\n"}
										{backend && `    reverse_proxy ${backend}\n`}
										{!backend && "    # Add directives here\n"}
										{"}"}
									</>
								) : (
									<span className="text-muted-foreground">
										Fill in the fields above to see a preview
									</span>
								)}
							</pre>
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={!isFormValid}>
							Add Site
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
