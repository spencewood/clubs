import { FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface CaddyfileBrowserProps {
	onFileSelect: (path: string, content: string, filename: string) => void;
}

interface CaddyfileEntry {
	name: string;
	path: string;
	stats?: {
		siteBlocks: number;
		directives: number;
	};
}

export function CaddyfileBrowser({ onFileSelect }: CaddyfileBrowserProps) {
	const [files, setFiles] = useState<CaddyfileEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadFiles = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			// In development, use mock data (only valid files)
			if (import.meta.env.DEV) {
				// Simulate API delay
				await new Promise((resolve) => setTimeout(resolve, 500));
				setFiles([
					{
						name: "example.caddy",
						path: "/caddyfiles/example.caddy",
						stats: {
							siteBlocks: 3,
							directives: 8,
						},
					},
				]);
			} else {
				// In production, fetch from API
				const response = await fetch("/api/caddyfiles");
				if (!response.ok) throw new Error("Failed to load Caddyfiles");
				const data = await response.json();
				setFiles(data);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load files");
		} finally {
			setLoading(false);
		}
	}, []);

	const handleFileClick = async (file: CaddyfileEntry) => {
		try {
			if (import.meta.env.DEV) {
				// In development, read the local example file
				const response = await fetch(`/caddyfiles/${file.name}`);
				const content = await response.text();
				onFileSelect(file.path, content, file.name);
			} else {
				// In production, fetch from API
				const response = await fetch(
					`/api/caddyfiles/${encodeURIComponent(file.name)}`,
				);
				if (!response.ok) throw new Error("Failed to load file");
				const content = await response.text();
				onFileSelect(file.path, content, file.name);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load file");
		}
	};

	useEffect(() => {
		loadFiles();

		// Refresh files when window regains focus
		const handleFocus = () => {
			loadFiles();
		};

		window.addEventListener("focus", handleFocus);
		return () => window.removeEventListener("focus", handleFocus);
	}, [loadFiles]);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Available Caddyfiles</CardTitle>
						<CardDescription>
							Select a Caddyfile from the mounted volume to edit
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={loadFiles}
						disabled={loading}
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{error && (
					<div className="text-sm text-destructive mb-4 p-3 bg-destructive/10 rounded-md">
						{error}
					</div>
				)}

				{files.length === 0 && !loading && !error && (
					<div className="text-center py-8 text-muted-foreground">
						<p>No Caddyfiles found in the mounted volume.</p>
						<p className="text-sm mt-2">
							Make sure Caddyfiles are present in the mounted directory.
						</p>
					</div>
				)}

				<div
					className={`space-y-2 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
				>
					{files.map((file) => (
						<button
							key={file.path}
							type="button"
							onClick={() => !loading && handleFileClick(file)}
							className="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left cursor-pointer"
						>
							<FileText className="h-5 w-5 text-primary flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<div className="font-medium">{file.name}</div>
								<div className="text-sm text-muted-foreground truncate">
									{file.path}
								</div>
								{file.stats && (
									<div className="flex gap-3 mt-1 text-xs text-muted-foreground">
										<span>
											{file.stats.siteBlocks} site block
											{file.stats.siteBlocks !== 1 ? "s" : ""}
										</span>
										<span>•</span>
										<span>
											{file.stats.directives} directive
											{file.stats.directives !== 1 ? "s" : ""}
										</span>
									</div>
								)}
							</div>
						</button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
