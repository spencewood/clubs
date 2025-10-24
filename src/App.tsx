import {
	Circle,
	Code,
	Container,
	Globe,
	Plus,
	RefreshCw,
	Save,
	Server,
	Shield,
	Sparkles,
	Wand2,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { AddContainerSiteDialog } from "@/components/AddContainerSiteDialog";
import { CaddyfileEditor } from "@/components/CaddyfileEditor";
import { ContainerCard } from "@/components/ContainerCard";
import { ContainerEditDialog } from "@/components/ContainerEditDialog";
import { EditContainerSiteDialog } from "@/components/EditContainerSiteDialog";
import { NewSiteBlockDialog } from "@/components/NewSiteBlockDialog";
import { SiteBlockCard } from "@/components/SiteBlockCard";
import { SiteBlockEditDialog } from "@/components/SiteBlockEditDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
	applyCaddyfileConfig,
	type CaddyAPIStatus,
	formatCaddyfile,
	getCaddyAPIStatus,
	loadCaddyfile,
	saveCaddyfile,
} from "@/lib/api";
import {
	formatDirectiveForDisplay,
	getDirectiveSummary,
	isVirtualContainer,
	parseVirtualContainer,
} from "@/lib/container-utils";
import {
	parseCaddyfile,
	serializeCaddyfile,
} from "@/lib/parser/caddyfile-parser";
import { validateCaddyfile } from "@/lib/validator/caddyfile-validator";
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
	const [newSiteBlockType, setNewSiteBlockType] = useState<
		"physical" | "virtual-container" | null
	>(null);
	const [editingSiteBlock, setEditingSiteBlock] =
		useState<CaddySiteBlock | null>(null);
	const [caddyStatus, setCaddyStatus] = useState<CaddyAPIStatus | null>(null);
	const [applying, setApplying] = useState(false);
	const [addSiteToContainer, setAddSiteToContainer] = useState<string | null>(
		null,
	);
	const [editingSite, setEditingSite] = useState<{
		containerId: string;
		siteId: string;
	} | null>(null);
	const [isLiveMode, setIsLiveMode] = useState(false);
	const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

	// Calculate line range for hovered block
	const getHoveredBlockLineRange = (): { from: number; to: number } | null => {
		if (!hoveredBlockId || !config || !rawContent) return null;

		const block = config.siteBlocks.find((sb) => sb.id === hoveredBlockId);
		if (!block) return null;

		// Find the block in the raw content
		const lines = rawContent.split("\n");
		const addressLine = block.addresses.join(", ");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			// Check if this line contains the address
			if (
				line.includes(addressLine) ||
				block.addresses.some((addr) => line.includes(addr))
			) {
				// Found the start - now find the matching closing brace
				let braceCount = 0;
				const startLine = i;

				for (let j = i; j < lines.length; j++) {
					const currentLine = lines[j];
					braceCount += (currentLine.match(/{/g) || []).length;
					braceCount -= (currentLine.match(/}/g) || []).length;

					if (braceCount === 0 && j > i) {
						// Found the closing brace
						return { from: startLine + 1, to: j + 1 }; // 1-indexed
					}
				}
			}
		}

		return null;
	};

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

	const handleFormat = async () => {
		try {
			const result = await formatCaddyfile(rawContent);

			if (result.success && result.formatted) {
				setRawContent(result.formatted);
				// Try to parse the formatted content
				try {
					const parsed = parseCaddyfile(result.formatted);
					setConfig(parsed);
				} catch (err) {
					console.error("Parse error after format:", err);
				}

				// Show appropriate toast based on whether formatting actually happened
				if (result.warning) {
					toast.warning("Caddyfile validated", {
						description: result.warning,
					});
				} else {
					toast.success("Caddyfile formatted!");
				}
			} else {
				toast.error("Failed to format", {
					description: result.error,
				});
			}
		} catch (error) {
			toast.error("Error formatting", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			// Use raw content directly (preserves comments and formatting)
			const content = rawContent;

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

	const handleAddSiteToContainer = (containerId: string) => {
		setAddSiteToContainer(containerId);
	};

	const handleCreateSite = (
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

	const handleDeleteSite = (containerId: string, siteId: string) => {
		if (!config) return;

		const newConfig = { ...config };
		const container = newConfig.siteBlocks.find((sb) => sb.id === containerId);

		if (!container) return;

		// Remove the handle block with this ID
		container.directives = container.directives.filter((d) => d.id !== siteId);

		// Also remove the associated matcher
		// Find the handle block to get the matcher name
		const handleBlock = container.directives.find((d) => d.id === siteId);
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

							{/* Right: Mode Indicator + Theme Toggle */}
							<div className="flex items-center gap-2">
								{caddyStatus && (
									<div
										className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border"
										style={{
											backgroundColor: caddyStatus.available
												? "var(--color-accent)"
												: "var(--color-muted)",
											borderColor: caddyStatus.available
												? "var(--color-primary)"
												: "var(--color-border)",
											color: caddyStatus.available
												? "var(--color-accent-foreground)"
												: "var(--color-muted-foreground)",
										}}
									>
										<Circle
											className={`h-2 w-2 fill-current ${caddyStatus.available ? "animate-pulse" : ""}`}
										/>
										{caddyStatus.available ? "Live Mode" : "File Mode"}
									</div>
								)}
								<ThemeToggle />
							</div>
						</div>
					</div>
				</header>

				<main className="container mx-auto px-4 py-6">
					{config && (
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							{/* Left: Visual Editor */}
							<div className="space-y-4">
								{config.siteBlocks.length === 0 ? (
									// Empty state - Show two add options
									<div className="space-y-6">
										<div className="text-center space-y-2 pt-8">
											<h2 className="text-lg font-semibold">Get Started</h2>
											<p className="text-sm text-muted-foreground">
												Create your first site or container
											</p>
										</div>
										<div className="grid gap-3 max-w-md mx-auto">
											<button
												type="button"
												onClick={() => {
													setNewSiteBlockType("physical");
													setShowNewSiteDialog(true);
												}}
												className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-green-500 hover:bg-green-50/50 transition-colors text-left"
											>
												<Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
												<Globe className="h-6 w-6 text-green-600 flex-shrink-0" />
												<div className="flex-1">
													<h4 className="font-semibold">Site</h4>
													<p className="text-xs text-muted-foreground mt-0.5">
														Single domain with its own configuration
													</p>
												</div>
											</button>
											<button
												type="button"
												onClick={() => {
													setNewSiteBlockType("virtual-container");
													setShowNewSiteDialog(true);
												}}
												className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-left"
											>
												<Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
												<Container className="h-6 w-6 text-blue-600 flex-shrink-0" />
												<div className="flex-1">
													<h4 className="font-semibold">Container</h4>
													<p className="text-xs text-muted-foreground mt-0.5">
														Wildcard domain hosting multiple services
													</p>
												</div>
											</button>
										</div>
									</div>
								) : (
									<>
										<h2 className="text-lg font-semibold mb-4">Sites</h2>
										<div className="grid gap-3">
											{config.siteBlocks.map((siteBlock) => {
												// Check if this is a container
												if (isVirtualContainer(siteBlock)) {
													const container = parseVirtualContainer(siteBlock);
													return (
														<ContainerCard
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
															onAddSite={handleAddSiteToContainer}
															onEditSite={(containerId, siteId) =>
																setEditingSite({ containerId, siteId })
															}
															onDeleteSite={handleDeleteSite}
															onSiteHoverStart={setHoveredBlockId}
															onSiteHoverEnd={() => setHoveredBlockId(null)}
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
														onHoverStart={setHoveredBlockId}
														onHoverEnd={() => setHoveredBlockId(null)}
													/>
												);
											})}

											{/* Inline Add Buttons (Trello-style) */}
											<div className="grid grid-cols-2 gap-3">
												<button
													type="button"
													onClick={() => {
														setNewSiteBlockType("physical");
														setShowNewSiteDialog(true);
													}}
													className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-green-500 hover:bg-green-50/50 transition-colors text-muted-foreground hover:text-foreground"
												>
													<Plus className="h-4 w-4" />
													<Globe className="h-4 w-4" />
													<span className="text-sm font-medium">Site</span>
												</button>
												<button
													type="button"
													onClick={() => {
														setNewSiteBlockType("virtual-container");
														setShowNewSiteDialog(true);
													}}
													className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-muted-foreground hover:text-foreground"
												>
													<Plus className="h-4 w-4" />
													<Container className="h-4 w-4" />
													<span className="text-sm font-medium">Container</span>
												</button>
											</div>
										</div>
									</>
								)}
							</div>

							{/* Right: Raw Caddyfile */}
							<div className="flex flex-col space-y-4 min-h-[calc(100vh-12rem)]">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Code className="h-4 w-4" />
										<span>Raw Caddyfile</span>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={handleFormat}
										disabled={!rawContent.trim()}
									>
										<Wand2 className="h-4 w-4 mr-1" />
										Format
									</Button>
								</div>
								<div className="flex-1">
									<CaddyfileEditor
										value={rawContent}
										onChange={handleRawContentChange}
										placeholder="# Caddyfile configuration..."
										highlightLines={getHoveredBlockLineRange()}
									/>
								</div>
							</div>
						</div>
					)}
				</main>

				{/* Use specialized dialog for containers */}
				{editingSiteBlock && isVirtualContainer(editingSiteBlock) ? (
					<ContainerEditDialog
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
					onOpenChange={(open) => {
						setShowNewSiteDialog(open);
						if (!open) {
							setNewSiteBlockType(null); // Reset when closing
						}
					}}
					onCreateFromRecipe={handleCreateFromRecipe}
					onCreateBlank={handleCreateBlank}
					onCreateVirtualContainer={handleCreateVirtualContainer}
					initialBlockType={newSiteBlockType}
				/>

				{addSiteToContainer && (
					<AddContainerSiteDialog
						open={!!addSiteToContainer}
						onOpenChange={(open) => !open && setAddSiteToContainer(null)}
						containerDomain={
							config?.siteBlocks.find((sb) => sb.id === addSiteToContainer)
								?.addresses[0] || ""
						}
						onCreateSite={(site) => {
							handleCreateSite(addSiteToContainer, site);
							setAddSiteToContainer(null);
						}}
					/>
				)}

				{editingSite && (
					<EditContainerSiteDialog
						open={!!editingSite}
						onOpenChange={(open) => !open && setEditingSite(null)}
						containerId={editingSite.containerId}
						siteId={editingSite.siteId}
						siteBlock={
							config?.siteBlocks.find(
								(sb) => sb.id === editingSite.containerId,
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
