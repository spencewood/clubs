import { FileJson, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getCaddyConfig, getCaddyConfigById } from "@/lib/api";

interface InspectConfigModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	caddyId?: string; // If provided, fetch by @id, otherwise fetch full config
}

export function InspectConfigModal({
	open,
	onOpenChange,
	title,
	description,
	caddyId,
}: InspectConfigModalProps) {
	const [config, setConfig] = useState<unknown | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!open) {
			// Reset state when modal closes
			setConfig(null);
			setError(null);
			setCopied(false);
			return;
		}

		// Fetch config when modal opens
		const fetchConfig = async () => {
			setLoading(true);
			setError(null);

			try {
				const result = caddyId
					? await getCaddyConfigById(caddyId)
					: await getCaddyConfig();

				if (result.success) {
					setConfig(result.config);
				} else {
					setError(result.error || "Failed to fetch configuration");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		};

		fetchConfig();
	}, [open, caddyId]);

	const copyToClipboard = () => {
		if (config) {
			navigator.clipboard.writeText(JSON.stringify(config, null, 2));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileJson className="h-5 w-5" />
						{title}
					</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>

				<div className="flex-1 overflow-hidden flex flex-col gap-3">
					{loading && (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					)}

					{error && (
						<div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
							<p className="text-sm text-destructive font-medium">Error</p>
							<p className="text-sm text-destructive/80 mt-1">{error}</p>
						</div>
					)}

					{config !== null && !loading && (
						<>
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									JSON configuration from Caddy
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={copyToClipboard}
									className="gap-2"
								>
									{copied ? "Copied!" : "Copy JSON"}
								</Button>
							</div>

							<div className="flex-1 overflow-auto bg-muted rounded-lg p-4">
								<pre className="text-xs font-mono">
									{JSON.stringify(config as Record<string, unknown>, null, 2)}
								</pre>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
