import {
	AlertTriangle,
	Circle,
	Code,
	Plus,
	Save,
	Server,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { AddVirtualBlockDialog } from "@/components/AddVirtualBlockDialog";
import { EditVirtualBlockDialog } from "@/components/EditVirtualBlockDialog";
import { NewSiteBlockDialog } from "@/components/NewSiteBlockDialog";
import { SiteBlockCard } from "@/components/SiteBlockCard";
import { SiteBlockEditDialog } from "@/components/SiteBlockEditDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VirtualContainerCard } from "@/components/VirtualContainerCard";
import { VirtualContainerEditDialog } from "@/components/VirtualContainerEditDialog";
import {
	applyCaddyfileConfig,
	type CaddyAPIStatus,
	getCaddyAPIStatus,
	loadCaddyfile,
	saveCaddyfile,
} from "@/lib/api";
import {
	parseCaddyfile,
	serializeCaddyfile,
} from "@/lib/parser/caddyfile-parser";
import { validateCaddyfile } from "@/lib/validator/caddyfile-validator";
import {
	formatDirectiveForDisplay,
	getDirectiveSummary,
	isVirtualContainer,
	parseVirtualContainer,
} from "@/lib/virtual-container-utils";
import type {
	CaddyConfig,
	CaddyDirective,
	CaddySiteBlock,
} from "@/types/caddyfile";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

type ViewMode = "edit" | "raw";

function App() {
	const [config, setConfig] = useState<CaddyConfig | null>(null);
	const [rawContent, setRawContent] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("edit");
	const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
	const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
	const [editingSiteBlock, setEditingSiteBlock] =
		useState<CaddySiteBlock | null>(null);
	const [caddyStatus, setCaddyStatus] = useState<CaddyAPIStatus | null>(null);
	const [applying, setApplying] = useState(false);
	const [addServiceToContainer, setAddServiceToContainer] = useState<
		string | null
	>(null);
	const [editingService, setEditingService] = useState<{
		containerId: string;
		serviceId: string;
	} | null>(null);

	// Load Caddyfile on mount
	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const result = await loadCaddyfile();

				if (result.success && result.content) {
					// Validate the file first
					const validation = validateCaddyfile(result.content);

					if (!validation.valid) {
						toast.error("Invalid Caddyfile", {
							description: validation.errors.join(", "),
						});
						return;
					}

					// Show warnings if any
					setValidationWarnings(validation.warnings);

					const parsed = parseCaddyfile(result.content);
					setConfig(parsed);
					setRawContent(result.content);
				} else if (result.error) {
					toast.error("Failed to load Caddyfile", {
						description: result.error,
					});
				}
			} catch (error) {
				toast.error("Error loading Caddyfile", {
					description: error instanceof Error ? error.message : "Unknown error",
				});
			} finally {
				setLoading(false);
			}
		};

		load();
	}, []);

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
		setApplying(true);
		try {
			const result = await applyCaddyfileConfig();

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
			const result = await saveCaddyfile(content);

			if (result.success) {
				toast.success("Caddyfile saved!");
				// Update raw content to match what was saved
				if (viewMode === "edit") {
					setRawContent(content);
				}
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

	const handleCreateVirtualContainer = (
		domain: string,
		sharedConfig: string[],
	) => {
		if (!config) return;

		const newConfig = { ...config };
		const directives: CaddyDirective[] = sharedConfig.map((config) => ({
			id: generateId(),
			name: config.split(" ")[0],
			args: config.split(" ").slice(1),
			raw: config,
		}));

		// Add fallback handle
		directives.push({
			id: generateId(),
			name: "handle",
			args: [],
			block: [
				{
					id: generateId(),
					name: "abort",
					args: [],
					raw: "abort",
				},
			],
			raw: "handle",
		});

		newConfig.siteBlocks.push({
			id: generateId(),
			addresses: [domain],
			directives,
		});

		setConfig(newConfig);
		setRawContent(serializeCaddyfile(newConfig));
	};

	const handleAddServiceToContainer = (containerId: string) => {
		setAddServiceToContainer(containerId);
	};

	const handleCreateService = (
		containerId: string,
		service: { subdomain: string; matcherName: string; backend?: string },
	) => {
		if (!config) return;

		const newConfig = { ...config };
		const containerIndex = newConfig.siteBlocks.findIndex(
			(sb) => sb.id === containerId,
		);

		if (containerIndex === -1) return;

		const container = newConfig.siteBlocks[containerIndex];
		const baseDomain = container.addresses[0].replace(/^\*\./, "");
		const fullHostname = `${service.subdomain}.${baseDomain}`;

		// Add matcher
		container.directives.push({
			id: generateId(),
			name: `@${service.matcherName}`,
			args: ["host", fullHostname],
			raw: `@${service.matcherName} host ${fullHostname}`,
		});

		// Add handle block
		const handleDirectives: CaddyDirective[] = [];
		if (service.backend) {
			handleDirectives.push({
				id: generateId(),
				name: "reverse_proxy",
				args: [service.backend],
				raw: `reverse_proxy ${service.backend}`,
			});
		}

		container.directives.push({
			id: generateId(),
			name: "handle",
			args: [`@${service.matcherName}`],
			block: handleDirectives,
			raw: `handle @${service.matcherName}`,
		});

		setConfig(newConfig);
		setRawContent(serializeCaddyfile(newConfig));
	};

	const handleDeleteService = (containerId: string, serviceId: string) => {
		if (!config) return;

		const newConfig = { ...config };
		const container = newConfig.siteBlocks.find((sb) => sb.id === containerId);

		if (!container) return;

		// Remove the handle block with this ID
		container.directives = container.directives.filter(
			(d) => d.id !== serviceId,
		);

		// Also remove the associated matcher
		// Find the handle block to get the matcher name
		const handleBlock = container.directives.find((d) => d.id === serviceId);
		if (handleBlock && handleBlock.args.length > 0) {
			const matcherRef = handleBlock.args[0];
			container.directives = container.directives.filter(
				(d) => d.name !== matcherRef,
			);
		}

		setConfig(newConfig);
		setRawContent(serializeCaddyfile(newConfig));
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="text-6xl mb-4">♣</div>
					<p className="text-muted-foreground">Loading Caddyfile...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<Toaster position="top-right" richColors closeButton />
			<div className="min-h-screen bg-background">
				<header className="border-b bg-card">
					<div className="container mx-auto px-4 py-4">
						<div className="flex items-center gap-3">
							<span className="text-5xl flex-shrink-0">♣</span>
							<div>
								<h1 className="text-3xl font-bold">Clubs</h1>
								<p className="text-sm text-muted-foreground">
									Caddyfile Management System
								</p>
							</div>
						</div>
					</div>
				</header>

				<main className="container mx-auto px-4 py-8">
					{config && (
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
										<h2 className="text-xl font-semibold">Caddyfile</h2>
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
								</div>
							</div>

							{/* View Mode Tabs */}
							<div className="flex gap-2 border-b">
								<button
									type="button"
									onClick={() => setViewMode("edit")}
									className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
										viewMode === "edit"
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<Server className="h-4 w-4 inline mr-2" />
									Site Blocks
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

							{viewMode === "raw" ? (
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
									{/* Overview Stats */}
									{config.siteBlocks.length > 0 && (
										<div className="rounded-lg border bg-card p-4">
											<div className="flex items-center gap-6 flex-wrap text-sm">
												<div className="flex items-center gap-2">
													<Server className="h-4 w-4 text-muted-foreground" />
													<span className="font-medium">
														{config.siteBlocks.length}
													</span>
													<span className="text-muted-foreground">
														{config.siteBlocks.length === 1 ? "site" : "sites"}
													</span>
												</div>
												{config.siteBlocks.filter((b) =>
													b.directives.some((d) => d.name === "tls"),
												).length > 0 && (
													<div className="flex items-center gap-2">
														<Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
														<span className="font-medium">
															{
																config.siteBlocks.filter((b) =>
																	b.directives.some((d) => d.name === "tls"),
																).length
															}
														</span>
														<span className="text-muted-foreground">
															with HTTPS
														</span>
													</div>
												)}
												{config.siteBlocks.filter((b) =>
													b.directives.some((d) => d.name === "reverse_proxy"),
												).length > 0 && (
													<div className="flex items-center gap-2">
														<Zap className="h-4 w-4 text-primary" />
														<span className="font-medium">
															{
																config.siteBlocks.filter((b) =>
																	b.directives.some(
																		(d) => d.name === "reverse_proxy",
																	),
																).length
															}
														</span>
														<span className="text-muted-foreground">
															{config.siteBlocks.filter((b) =>
																b.directives.some(
																	(d) => d.name === "reverse_proxy",
																),
															).length === 1
																? "proxy"
																: "proxies"}
														</span>
													</div>
												)}
												{config.siteBlocks.filter((b) =>
													b.directives.some((d) => d.name === "file_server"),
												).length > 0 && (
													<div className="flex items-center gap-2">
														<Sparkles className="h-4 w-4 text-primary" />
														<span className="font-medium">
															{
																config.siteBlocks.filter((b) =>
																	b.directives.some(
																		(d) => d.name === "file_server",
																	),
																).length
															}
														</span>
														<span className="text-muted-foreground">
															static file servers
														</span>
													</div>
												)}
											</div>
										</div>
									)}

									<div className="flex justify-end">
										<Button onClick={() => setShowNewSiteDialog(true)}>
											<Plus className="h-4 w-4 mr-2" />
											Add Site Block
										</Button>
									</div>
									<div className="grid gap-3">
										{config.siteBlocks.map((siteBlock) => {
											// Check if this is a virtual container
											if (isVirtualContainer(siteBlock)) {
												const container = parseVirtualContainer(siteBlock);
												return (
													<VirtualContainerCard
														key={siteBlock.id}
														id={container.id}
														wildcardDomain={container.wildcardDomain}
														sharedConfig={container.sharedConfig.map((d) =>
															getDirectiveSummary(d),
														)}
														virtualBlocks={container.virtualBlocks.map(
															(vb) => ({
																...vb,
																directives: vb.directives.map((d) =>
																	formatDirectiveForDisplay(d),
																),
															}),
														)}
														onEdit={handleEditSiteBlock}
														onDelete={handleDeleteSiteBlock}
														onAddService={handleAddServiceToContainer}
														onEditService={(containerId, serviceId) =>
															setEditingService({ containerId, serviceId })
														}
														onDeleteService={handleDeleteService}
													/>
												);
											}

											// Regular site block
											return (
												<SiteBlockCard
													key={siteBlock.id}
													siteBlock={siteBlock}
													onEdit={handleEditSiteBlock}
													onDelete={handleDeleteSiteBlock}
												/>
											);
										})}
									</div>
								</div>
							)}
						</div>
					)}
				</main>

				{/* Use specialized dialog for virtual containers */}
				{editingSiteBlock && isVirtualContainer(editingSiteBlock) ? (
					<VirtualContainerEditDialog
						siteBlock={editingSiteBlock}
						open={!!editingSiteBlock}
						onOpenChange={(open) => !open && setEditingSiteBlock(null)}
						onSave={handleSaveSiteBlock}
					/>
				) : (
					<SiteBlockEditDialog
						siteBlock={editingSiteBlock}
						open={!!editingSiteBlock}
						onOpenChange={(open) => !open && setEditingSiteBlock(null)}
						onSave={handleSaveSiteBlock}
					/>
				)}

				<NewSiteBlockDialog
					open={showNewSiteDialog}
					onOpenChange={setShowNewSiteDialog}
					onCreateFromRecipe={handleCreateFromRecipe}
					onCreateBlank={handleCreateBlank}
					onCreateVirtualContainer={handleCreateVirtualContainer}
				/>

				{addServiceToContainer && (
					<AddVirtualBlockDialog
						open={!!addServiceToContainer}
						onOpenChange={(open) => !open && setAddServiceToContainer(null)}
						containerDomain={
							config?.siteBlocks.find((sb) => sb.id === addServiceToContainer)
								?.addresses[0] || ""
						}
						onCreateService={(service) => {
							handleCreateService(addServiceToContainer, service);
							setAddServiceToContainer(null);
						}}
					/>
				)}

				{editingService && (
					<EditVirtualBlockDialog
						open={!!editingService}
						onOpenChange={(open) => !open && setEditingService(null)}
						containerId={editingService.containerId}
						serviceId={editingService.serviceId}
						siteBlock={
							config?.siteBlocks.find(
								(sb) => sb.id === editingService.containerId,
							) || null
						}
						onSave={handleSaveSiteBlock}
					/>
				)}
			</div>
		</>
	);
}

export default App;
