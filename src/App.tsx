import {
	Circle,
	Code,
	Plus,
	RefreshCw,
	Save,
	Server,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { AddVirtualBlockDialog } from "@/components/AddVirtualBlockDialog";
import { CaddyfileEditor } from "@/components/CaddyfileEditor";
import { EditVirtualBlockDialog } from "@/components/EditVirtualBlockDialog";
import { NewSiteBlockDialog } from "@/components/NewSiteBlockDialog";
import { SiteBlockCard } from "@/components/SiteBlockCard";
import { SiteBlockEditDialog } from "@/components/SiteBlockEditDialog";
import { Button } from "@/components/ui/button";
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

function App() {
	const [config, setConfig] = useState<CaddyConfig | null>(null);
	const [rawContent, setRawContent] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
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
	const [isLiveMode, setIsLiveMode] = useState(false);

	// Reusable load function that checks mode and loads appropriate config
	const loadConfig = useCallback(async (showLoadingState = true) => {
		if (showLoadingState) setLoading(true);
		try {
			// Check if Caddy API is available first
			const status = await getCaddyAPIStatus();
			const liveMode = status.available;
			setIsLiveMode(liveMode);

			// Try to load from live Caddy if available, otherwise from file
			const result = await loadCaddyfile(liveMode);

			if (result.success && result.content) {
				// Validate the file first
				const validation = validateCaddyfile(result.content);

				if (!validation.valid) {
					toast.error("Invalid Caddyfile", {
						description: validation.errors.join(", "),
					});
					return;
				}

				const parsed = parseCaddyfile(result.content);
				setConfig(parsed);
				setRawContent(result.content);
			} else if (result.error) {
				// In live mode without a file, start with empty config
				if (liveMode && result.error.includes("not found")) {
					toast.info("Starting with empty configuration", {
						description:
							"No Caddyfile found. Create your first site block to get started.",
					});
					setConfig({ siteBlocks: [], globalOptions: [] });
					setRawContent("");
				} else {
					toast.error("Failed to load Caddyfile", {
						description: result.error,
					});
				}
			}
		} catch (error) {
			toast.error("Error loading Caddyfile", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			if (showLoadingState) setLoading(false);
		}
	}, []);

	// Load Caddyfile on mount
	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	// Check Caddy API status on mount and periodically
	useEffect(() => {
		const checkStatus = async () => {
			const status = await getCaddyAPIStatus();
			const wasLiveMode = isLiveMode;
			const nowLiveMode = status.available;

			setCaddyStatus(status);

			// If mode changed, reload config from new source
			if (wasLiveMode !== nowLiveMode) {
				toast.info(
					nowLiveMode
						? "Caddy API detected - switching to Live Mode"
						: "Caddy API unavailable - switching to File Mode",
				);
				loadConfig(false);
			}
		};

		checkStatus();
		const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

		return () => clearInterval(interval);
	}, [isLiveMode, loadConfig]);

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
			// Serialize current config
			const content = config ? serializeCaddyfile(config) : "";

			if (isLiveMode) {
				// In live mode: save directly to Caddy (apply the config)
				// First save to file (as backup)
				await saveCaddyfile(content);

				// Then apply to Caddy
				const applyResult = await applyCaddyfileConfig();

				if (applyResult.success) {
					toast.success("Configuration applied to Caddy!");
					setRawContent(content);
				} else {
					toast.error("Failed to apply to Caddy", {
						description: applyResult.error,
					});
				}
			} else {
				// In file mode: save to file only
				const result = await saveCaddyfile(content);

				if (result.success) {
					toast.success("Caddyfile saved!");
					setRawContent(content);
				} else {
					toast.error("Failed to save", {
						description: result.error,
					});
				}
			}
		} catch (err) {
			toast.error("Failed to save", {
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
			<div className="min-h-screen bg-background pb-16">
				<header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
					<div className="container mx-auto px-4 py-3">
						<div className="flex items-center justify-between gap-4">
							{/* Left: Logo and Title */}
							<div className="flex items-center gap-3">
								<span className="text-4xl flex-shrink-0">♣</span>
								<div>
									<h1 className="text-2xl font-bold">Clubs</h1>
									<p className="text-xs text-muted-foreground">
										Caddyfile Management System
									</p>
								</div>
							</div>

							{/* Right: Mode Indicator */}
							{caddyStatus && (
								<div
									className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border ${
										caddyStatus.available
											? "bg-green-50 border-green-200 text-green-700"
											: "bg-gray-50 border-gray-200 text-gray-600"
									}`}
								>
									<Circle
										className={`h-2 w-2 fill-current ${caddyStatus.available ? "animate-pulse" : ""}`}
									/>
									{caddyStatus.available ? "Live Mode" : "File Mode"}
								</div>
							)}
						</div>
					</div>
				</header>

				<main className="container mx-auto px-4 py-6">
					{config && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Left: Visual Editor */}
							<div className="space-y-4">
								{config.siteBlocks.length === 0 ? (
									// Empty state
									<div className="flex flex-col items-center justify-center py-16 px-4">
										<div className="text-center max-w-md space-y-6">
											<div className="text-8xl opacity-20">♣</div>
											<div className="space-y-2">
												<h2 className="text-2xl font-semibold">
													No Site Blocks Yet
												</h2>
												<p className="text-muted-foreground">
													Get started by creating your first site block. Choose
													from templates or start from scratch.
												</p>
											</div>
											<Button
												onClick={() => setShowNewSiteDialog(true)}
												size="lg"
												className="mt-4"
											>
												<Plus className="h-5 w-5 mr-2" />
												Add Your First Site Block
											</Button>
										</div>
									</div>
								) : (
									<>
										<div className="flex justify-between items-center mb-4">
											<h2 className="text-lg font-semibold">Site Blocks</h2>
											<Button
												onClick={() => setShowNewSiteDialog(true)}
												size="default"
											>
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
									</>
								)}
							</div>

							{/* Right: Raw Caddyfile */}
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
									<Code className="h-4 w-4" />
									<span>Raw Caddyfile</span>
								</div>
								<CaddyfileEditor
									value={rawContent}
									onChange={handleRawContentChange}
									placeholder="# Caddyfile configuration..."
								/>
							</div>
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

				{/* Sticky Footer with Stats and Actions */}
				<footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
					<div className="container mx-auto px-4 py-3">
						<div className="flex items-center justify-between gap-4">
							{/* Left: Stats */}
							<div className="flex items-center gap-6 flex-wrap text-sm">
								{config && config.siteBlocks.length > 0 && (
									<>
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
												<span className="text-muted-foreground">HTTPS</span>
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
													file servers
												</span>
											</div>
										)}
									</>
								)}
							</div>

							{/* Right: Actions */}
							<div className="flex items-center gap-2">
								<Button
									onClick={() => loadConfig(false)}
									variant="ghost"
									size="sm"
									title={isLiveMode ? "Reload from Caddy" : "Reload from file"}
								>
									<RefreshCw className="h-4 w-4" />
								</Button>
								<Button
									onClick={handleSave}
									disabled={saving}
									variant="default"
									size="sm"
								>
									<Save className="h-4 w-4 mr-2" />
									{saving ? "Saving..." : isLiveMode ? "Save & Apply" : "Save"}
								</Button>
								{!isLiveMode && caddyStatus?.available && (
									<Button
										onClick={handleApplyToCaddy}
										disabled={applying}
										size="sm"
										variant="outline"
									>
										<Zap className="h-4 w-4 mr-2" />
										{applying ? "Applying..." : "Apply to Caddy"}
									</Button>
								)}
							</div>
						</div>
					</div>
				</footer>
			</div>
		</>
	);
}

export default App;
