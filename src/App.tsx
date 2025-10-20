import {
	AlertTriangle,
	Circle,
	Code,
	Edit3,
	Eye,
	Plus,
	Save,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { CaddyfileBrowser } from "@/components/CaddyfileBrowser";
import { CaddyfileVisualizer } from "@/components/CaddyfileVisualizer";
import { NewSiteBlockDialog } from "@/components/NewSiteBlockDialog";
import { SiteBlockCard } from "@/components/SiteBlockCard";
import { SiteBlockEditDialog } from "@/components/SiteBlockEditDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	applyCaddyfileConfig,
	type CaddyAPIStatus,
	getCaddyAPIStatus,
	saveCaddyfile,
} from "@/lib/api";
import {
	parseCaddyfile,
	serializeCaddyfile,
} from "@/lib/parser/caddyfile-parser";
import { validateCaddyfile } from "@/lib/validator/caddyfile-validator";
import type { CaddyConfig, CaddySiteBlock } from "@/types/caddyfile";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

type ViewMode = "visualize" | "edit" | "raw";

function App() {
	const [config, setConfig] = useState<CaddyConfig | null>(null);
	const [rawContent, setRawContent] = useState<string>("");
	const [filename, setFilename] = useState<string>("");
	const [filepath, setFilepath] = useState<string>("");
	const [saving, setSaving] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("visualize");
	const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
	const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
	const [editingSiteBlock, setEditingSiteBlock] =
		useState<CaddySiteBlock | null>(null);
	const [caddyStatus, setCaddyStatus] = useState<CaddyAPIStatus | null>(null);
	const [applying, setApplying] = useState(false);

	// Check Caddy API status on mount and periodically
	useEffect(() => {
		const checkStatus = async () => {
			const status = await getCaddyAPIStatus();
			setCaddyStatus(status);
		};

		checkStatus();
		const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

		return () => clearInterval(interval);
	}, []);

	const handleFileSelect = (path: string, content: string, name: string) => {
		// Validate the file first
		const validation = validateCaddyfile(content);

		if (!validation.valid) {
			toast.error("Invalid Caddyfile", {
				description: validation.errors.join(", "),
			});
			return;
		}

		// Show warnings if any
		setValidationWarnings(validation.warnings);

		const parsed = parseCaddyfile(content);
		setConfig(parsed);
		setRawContent(content);
		setFilename(name);
		setFilepath(path);
	};

	const handleRawContentChange = (content: string) => {
		setRawContent(content);
		try {
			const parsed = parseCaddyfile(content);
			setConfig(parsed);
		} catch (err) {
			// Invalid syntax, keep the raw content but don't update config
			console.error("Parse error:", err);
		}
	};

	const handleCreateFromRecipe = (siteBlock: CaddySiteBlock) => {
		if (!config) return;
		const newConfig = { ...config };
		newConfig.siteBlocks.push(siteBlock);
		setConfig(newConfig);
		setRawContent(serializeCaddyfile(newConfig));
	};

	const handleCreateBlank = () => {
		handleAddSiteBlock();
	};

	const handleApplyToCaddy = async () => {
		if (!filename) return;

		setApplying(true);
		try {
			const result = await applyCaddyfileConfig(filename);

			if (result.success) {
				toast.success("Configuration applied!");
			} else {
				toast.error("Failed to apply configuration", {
					description: result.error,
				});
			}
		} catch (error) {
			toast.error("Error applying configuration", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setApplying(false);
		}
	};

	const handleSave = async () => {
		if (!filepath) return;

		setSaving(true);
		try {
			// Use raw content if in raw mode, otherwise serialize from config
			const content =
				viewMode === "raw"
					? rawContent
					: config
						? serializeCaddyfile(config)
						: "";

			// Save via API
			const result = await saveCaddyfile(filename, content);

			if (result.success) {
				toast.success("Caddyfile saved!");
			} else {
				toast.error("Failed to save", {
					description: result.error,
				});
			}
		} catch (err) {
			toast.error("Failed to save file", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		setConfig(null);
		setFilename("");
		setFilepath("");
	};

	const handleDeleteSiteBlock = (id: string) => {
		if (!config) return;
		setConfig({
			...config,
			siteBlocks: config.siteBlocks.filter((sb) => sb.id !== id),
		});
	};

	const handleEditSiteBlock = (id: string) => {
		if (!config) return;
		const siteBlock = config.siteBlocks.find((sb) => sb.id === id);
		if (siteBlock) {
			setEditingSiteBlock(siteBlock);
		}
	};

	const handleSaveSiteBlock = (updated: CaddySiteBlock) => {
		if (!config) return;

		const newConfig = { ...config };
		const index = newConfig.siteBlocks.findIndex((sb) => sb.id === updated.id);

		if (index !== -1) {
			newConfig.siteBlocks[index] = updated;
			setConfig(newConfig);
			setRawContent(serializeCaddyfile(newConfig));
		}
	};

	const handleAddSiteBlock = () => {
		if (!config) return;

		const newConfig = { ...config };
		newConfig.siteBlocks.push({
			id: generateId(),
			addresses: ["example.com"],
			directives: [],
		});
		setConfig(newConfig);
	};

	return (
		<>
			<Toaster position="top-right" richColors closeButton />
			<div className="min-h-screen bg-background">
				<header className="border-b bg-card">
					<div className="container mx-auto px-4 py-4">
						<button
							type="button"
							onClick={handleClose}
							className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full text-left cursor-pointer"
						>
							<span className="text-5xl flex-shrink-0">♣</span>
							<div>
								<h1 className="text-3xl font-bold">Clubs</h1>
								<p className="text-sm text-muted-foreground">
									Caddyfile Management System
								</p>
							</div>
						</button>
					</div>
				</header>

				<main className="container mx-auto px-4 py-8">
					{!config ? (
						<div className="max-w-3xl mx-auto">
							<CaddyfileBrowser onFileSelect={handleFileSelect} />
						</div>
					) : (
						<div className="space-y-6">
							{validationWarnings.length > 0 && (
								<div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
										<div className="flex-1">
											<h3 className="font-semibold text-orange-900 mb-1">
												Validation Warnings
											</h3>
											<ul className="text-sm text-orange-800 space-y-1">
												{validationWarnings.map((warning) => (
													<li key={warning}>• {warning}</li>
												))}
											</ul>
										</div>
									</div>
								</div>
							)}

							<div className="flex justify-between items-center">
								<div className="flex items-center gap-4">
									<div>
										<h2 className="text-xl font-semibold">{filename}</h2>
										<p className="text-sm text-muted-foreground">
											{config.siteBlocks.length} site block(s)
										</p>
									</div>

									{/* Caddy API Status Indicator */}
									{caddyStatus && (
										<div
											className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
												caddyStatus.available
													? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
													: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
											}`}
										>
											<Circle
												className={`h-2 w-2 fill-current ${caddyStatus.available ? "animate-pulse" : ""}`}
											/>
											{caddyStatus.available ? "Live Mode" : "File Mode"}
										</div>
									)}
								</div>
								<div className="flex gap-2">
									{/* Apply to Caddy button (only show if API available) */}
									{caddyStatus?.available && (
										<Button
											onClick={handleApplyToCaddy}
											disabled={applying}
											variant="default"
										>
											<Zap className="h-4 w-4 mr-2" />
											{applying ? "Applying..." : "Apply to Caddy"}
										</Button>
									)}
									<Button
										onClick={handleSave}
										disabled={saving}
										variant={caddyStatus?.available ? "outline" : "default"}
									>
										<Save className="h-4 w-4 mr-2" />
										{saving ? "Saving..." : "Save"}
									</Button>
									<Button onClick={handleClose} variant="outline">
										<X className="h-4 w-4 mr-2" />
										Close
									</Button>
								</div>
							</div>

							{/* View Mode Tabs */}
							<div className="flex gap-2 border-b">
								<button
									type="button"
									onClick={() => setViewMode("visualize")}
									className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
										viewMode === "visualize"
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<Eye className="h-4 w-4 inline mr-2" />
									Visualize
								</button>
								<button
									type="button"
									onClick={() => setViewMode("edit")}
									className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
										viewMode === "edit"
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<Edit3 className="h-4 w-4 inline mr-2" />
									Edit
								</button>
								<button
									type="button"
									onClick={() => setViewMode("raw")}
									className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
										viewMode === "raw"
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<Code className="h-4 w-4 inline mr-2" />
									Raw
								</button>
							</div>

							{viewMode === "visualize" ? (
								<CaddyfileVisualizer config={config} />
							) : viewMode === "raw" ? (
								<div className="space-y-4">
									<div className="text-sm text-muted-foreground">
										Edit the raw Caddyfile syntax. Changes will be parsed
										automatically.
									</div>
									<Textarea
										value={rawContent}
										onChange={(e) => handleRawContentChange(e.target.value)}
										className="font-mono text-sm min-h-[400px]"
										placeholder="Enter Caddyfile configuration..."
									/>
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex justify-end">
										<Button onClick={() => setShowNewSiteDialog(true)}>
											<Plus className="h-4 w-4 mr-2" />
											Add Site Block
										</Button>
									</div>
									<div className="grid gap-3">
										{config.siteBlocks.map((siteBlock) => (
											<SiteBlockCard
												key={siteBlock.id}
												siteBlock={siteBlock}
												onEdit={handleEditSiteBlock}
												onDelete={handleDeleteSiteBlock}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</main>

				<SiteBlockEditDialog
					siteBlock={editingSiteBlock}
					open={!!editingSiteBlock}
					onOpenChange={(open) => !open && setEditingSiteBlock(null)}
					onSave={handleSaveSiteBlock}
				/>

				<NewSiteBlockDialog
					open={showNewSiteDialog}
					onOpenChange={setShowNewSiteDialog}
					onCreateFromRecipe={handleCreateFromRecipe}
					onCreateBlank={handleCreateBlank}
				/>
			</div>
		</>
	);
}

export default App;
