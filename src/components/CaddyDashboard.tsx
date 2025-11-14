"use client";

import {
	Activity,
	BarChart3,
	Check,
	ChevronLeft,
	ChevronRight,
	Code,
	Container,
	Copy,
	Eye,
	FileJson,
	Globe,
	Loader2,
	RefreshCw,
	Save,
	Server,
	ShieldCheck,
	Sparkles,
	Wand2,
	Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddContainerSiteDialog } from "@/components/AddContainerSiteDialog";
import { useLeftPanel } from "@/contexts/LeftPanelContext";

// Import CaddyfileEditor dynamically to avoid SSR issues with CodeMirror
const CaddyfileEditor = dynamic(
	() =>
		import("@/components/CaddyfileEditor").then((mod) => ({
			default: mod.CaddyfileEditor,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		),
	},
);

import { CertificatesView } from "@/components/CertificatesView";
import { ContainerCard } from "@/components/ContainerCard";
import { ContainerEditDialog } from "@/components/ContainerEditDialog";
import { EditContainerSiteDialog } from "@/components/EditContainerSiteDialog";
import { MetricsView } from "@/components/MetricsView";
import { NewSiteBlockDialog } from "@/components/NewSiteBlockDialog";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ServerInfoCard } from "@/components/ServerInfoCard";
import { SiteBlockCard } from "@/components/SiteBlockCard";
import { SiteBlockEditDialog } from "@/components/SiteBlockEditDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UpstreamsView } from "@/components/UpstreamsView";
import { Button } from "@/components/ui/button";
import {
	applyCaddyfileConfig,
	type CaddyAPIStatus,
	formatCaddyfile,
	getCaddyAPIStatus,
	getCaddyConfig,
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
import type { AcmeCertificate } from "@/lib/server/cert-parser";
import { validateCaddyfile } from "@/lib/validator/caddyfile-validator";
import type {
	CaddyConfig,
	CaddyDirective,
	CaddySiteBlock,
} from "@/types/caddyfile";
import packageJson from "../../package.json";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function FullConfigView() {
	const [config, setConfig] = useState<unknown | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const fetchConfig = async () => {
			setLoading(true);
			setError(null);

			try {
				const result = await getCaddyConfig();

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
	}, []);

	const copyToClipboard = () => {
		if (config) {
			navigator.clipboard.writeText(JSON.stringify(config, null, 2));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4">
				<div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
					<p className="text-sm text-destructive font-medium">Error</p>
					<p className="text-sm text-destructive/80 mt-1">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full p-4 gap-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-muted-foreground/70">
					<Eye className="w-3.5 h-3.5" />
					<span>Internal configuration from Caddy</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={copyToClipboard}
					className="text-xs opacity-70 hover:opacity-100"
				>
					{copied ? (
						<>
							<Check className="h-3.5 w-3.5" />
							<span className="ml-1.5">Copied!</span>
						</>
					) : (
						<>
							<Copy className="h-3.5 w-3.5" />
							<span className="ml-1.5">Copy JSON</span>
						</>
					)}
				</Button>
			</div>

			<div className="flex-1 overflow-auto bg-muted/10 rounded-lg p-4 border border-muted-foreground/20 select-text">
				<pre className="text-xs font-mono select-text">
					{JSON.stringify(config as Record<string, unknown>, null, 2)}
				</pre>
			</div>
		</div>
	);
}

export interface CaddyDashboardProps {
	initialConfig: CaddyConfig;
	initialRawContent: string;
	initialIsLiveMode: boolean;
	initialCaddyStatus: CaddyAPIStatus;
	initialView: "sites" | "upstreams" | "certificates" | "analytics";
	initialUpstreams: Array<{
		address: string;
		num_requests: number;
		fails: number;
	}>;
	initialCertificates: {
		id: string;
		name: string;
		root_common_name: string;
		intermediate_common_name: string;
		root_certificate: string;
		intermediate_certificate: string;
	} | null;
	initialAcmeCertificates?: AcmeCertificate[];
}

export function CaddyDashboard({
	initialConfig,
	initialRawContent,
	initialIsLiveMode,
	initialCaddyStatus,
	initialView,
	initialUpstreams,
	initialCertificates,
	initialAcmeCertificates = [],
}: CaddyDashboardProps) {
	const [config, setConfig] = useState<CaddyConfig | null>(initialConfig);
	const [rawContent, setRawContent] = useState<string>(initialRawContent);
	const [saving, setSaving] = useState(false);
	const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
	const [newSiteBlockType, setNewSiteBlockType] = useState<
		"physical" | "virtual-container" | null
	>(null);
	const [editingSiteBlock, setEditingSiteBlock] =
		useState<CaddySiteBlock | null>(null);
	const [caddyStatus, setCaddyStatus] = useState<CaddyAPIStatus | null>(
		initialCaddyStatus,
	);
	const [applying, setApplying] = useState(false);
	const [reloading, setReloading] = useState(false);
	const [addSiteToContainer, setAddSiteToContainer] = useState<string | null>(
		null,
	);
	const [editingSite, setEditingSite] = useState<{
		containerId: string;
		siteId: string;
	} | null>(null);
	// Use initialIsLiveMode directly - don't change it based on async checks to avoid flashing
	const isLiveMode = initialIsLiveMode;
	const leftPanelView = initialView;
	const [rightPanelView, setRightPanelView] = useState<"raw" | "config">("raw");
	const { leftPanelExpanded, setLeftPanelExpanded } = useLeftPanel();
	const loadConfig = useCallback(async () => {
		setReloading(true);
		try {
			// Try to load from live Caddy if available, otherwise from file
			const result = await loadCaddyfile(isLiveMode);

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
				if (isLiveMode && result.error.includes("not found")) {
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
			setReloading(false);
		}
	}, [isLiveMode]);

	// Check Caddy API status periodically (not on mount to avoid flashing)
	useEffect(() => {
		const checkStatus = async () => {
			const status = await getCaddyAPIStatus();
			setCaddyStatus(status);

			// If mode changed significantly, could reload config
			// But we skip this to avoid flashing - rely on server-provided initial data
		};

		// Don't check on mount - only set up periodic checks
		const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

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

		// Find the handle block FIRST to get the matcher name before removing it
		const handleBlock = container.directives.find((d) => d.id === siteId);
		if (handleBlock && handleBlock.args.length > 0) {
			const matcherRef = handleBlock.args[0];
			// Remove both the matcher and the handle block
			container.directives = container.directives.filter(
				(d) => d.name !== matcherRef && d.id !== siteId,
			);
		} else {
			// No matcher found, just remove the handle block
			container.directives = container.directives.filter(
				(d) => d.id !== siteId,
			);
		}

		setConfig(newConfig);
		setRawContent(serializeCaddyfile(newConfig));
	};

	return (
		<div className="min-h-screen bg-background pb-16">
			<header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur @supports-[backdrop-filter]:bg-card/60">
				<div className="container mx-auto px-4 py-3">
					<div className="flex items-center justify-between gap-4">
						{/* Left: Logo and Title */}
						<Link
							href="/"
							className="flex items-center gap-3 hover:opacity-80 transition-opacity"
						>
							<span className="text-4xl shrink-0">♣</span>
							<div>
								<h1 className="text-2xl font-bold">Clubs</h1>
								<p className="text-xs text-muted-foreground">
									Caddyfile Management System{" "}
									<span className="opacity-60">
										{process.env.NODE_ENV === "development"
											? "dev"
											: `v${packageJson.version}`}
									</span>
								</p>
							</div>
						</Link>

						{/* Right: Server Info + Theme Toggle + Profile */}
						<div className="flex items-center gap-2">
							{caddyStatus && <ServerInfoCard initialStatus={caddyStatus} />}
							<ThemeToggle />
							<ProfileDropdown />
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-6">
				{config && (
					<div className="relative xl:flex xl:flex-row gap-8 items-start min-h-[calc(100vh-12rem)]">
						{/* Left: Sites/Upstreams Panel - Elevated "table" (content height) */}
						<div
							className={`space-y-4 bg-card border rounded-lg shadow-lg p-3 sm:p-6 min-h-[calc(100vh-12rem)] will-change-transform relative transition-all duration-500 overflow-visible ${
								leftPanelExpanded
									? "xl:static -translate-x-full opacity-0 pointer-events-none xl:translate-x-0 xl:opacity-100 xl:pointer-events-auto z-20 xl:z-10 xl:w-full xl:shrink-0"
									: "xl:static translate-x-0 opacity-100 pointer-events-auto z-20 xl:z-10 xl:w-1/2 xl:shrink-0"
							}`}
							style={{
								transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
							}}
						>
							{/* Tab Navigation with Expand/Collapse */}
							<div className="flex items-center justify-between gap-1 sm:gap-2 pb-2">
								<div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
									<Link
										href="/"
										className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
											leftPanelView === "sites"
												? "border-primary text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
										}`}
									>
										<Server className="w-4 h-4 shrink-0" />
										Sites
									</Link>
									<Link
										href="/upstreams"
										className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
											leftPanelView === "upstreams"
												? "border-primary text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
										}`}
									>
										<Activity className="w-4 h-4 shrink-0" />
										Upstreams
									</Link>
									<Link
										href="/analytics"
										className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
											leftPanelView === "analytics"
												? "border-primary text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
										}`}
									>
										<BarChart3 className="w-4 h-4 shrink-0" />
										Analytics
									</Link>
									<Link
										href="/certificates"
										className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
											leftPanelView === "certificates"
												? "border-primary text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
										}`}
									>
										<ShieldCheck className="w-4 h-4 shrink-0" />
										Certificates
									</Link>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setLeftPanelExpanded(!leftPanelExpanded)}
									className="h-8 px-2 xl:block hidden bg-muted/50 hover:bg-muted shrink-0"
									title={leftPanelExpanded ? "Collapse panel" : "Expand panel"}
								>
									{/* On desktop: left to collapse, right to expand */}
									{leftPanelExpanded ? (
										<ChevronLeft className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									)}
								</Button>
								{/* On mobile: left chevron to collapse panel and show editor */}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setLeftPanelExpanded(!leftPanelExpanded)}
									className="h-8 px-2 xl:hidden bg-muted/50 hover:bg-muted shrink-0"
									title="Hide panel / Show editor"
								>
									<ChevronLeft className="w-4 h-4" />
								</Button>
							</div>

							{leftPanelView === "upstreams" ? (
								<UpstreamsView
									initialUpstreams={initialUpstreams}
									initialConfig={config}
								/>
							) : leftPanelView === "analytics" ? (
								<MetricsView initialUpstreams={initialUpstreams} />
							) : leftPanelView === "certificates" ? (
								<CertificatesView
									initialCertificates={initialCertificates}
									initialAcmeCertificates={initialAcmeCertificates}
								/>
							) : (
								<>
									{/* Sites Header with Action Buttons */}
									<div className="flex items-center justify-between mb-4">
										<div>
											<h2 className="text-2xl font-bold">Sites</h2>
											<p className="text-sm text-muted-foreground mt-1">
												{config.siteBlocks.length === 0
													? "Create your first site or container"
													: `${config.siteBlocks.length} site${config.siteBlocks.length !== 1 ? "s" : ""} configured`}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setNewSiteBlockType("physical");
													setShowNewSiteDialog(true);
												}}
											>
												<Globe className="w-4 h-4" />
												<span className="hidden sm:inline ml-2">Add Site</span>
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setNewSiteBlockType("virtual-container");
													setShowNewSiteDialog(true);
												}}
											>
												<Container className="w-4 h-4" />
												<span className="hidden sm:inline ml-2">
													Add Container
												</span>
											</Button>
										</div>
									</div>

									{config.siteBlocks.length === 0 ? (
										// Empty state
										<div className="py-12 text-center">
											<Server className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
											<p className="text-sm text-muted-foreground">
												No sites configured yet. Click the buttons above to get
												started.
											</p>
										</div>
									) : (
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
															originalSiteBlock={siteBlock}
															onEdit={handleEditSiteBlock}
															onDelete={handleDeleteSiteBlock}
															onAddSite={handleAddSiteToContainer}
															onEditSite={(containerId, siteId) =>
																setEditingSite({ containerId, siteId })
															}
															onDeleteSite={handleDeleteSite}
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
									)}
								</>
							)}
						</div>

						{/* Right: Raw Caddyfile / Full Config - Recessed "floor" (visible when left panel collapsed on mobile, hidden when expanded on desktop) */}
						<div
							className={`flex flex-col space-y-4 xl:z-auto min-h-[calc(100vh-12rem)] ${
								leftPanelExpanded
									? "absolute inset-0 z-10 opacity-100 xl:opacity-0 xl:pointer-events-none xl:flex xl:w-0 xl:overflow-hidden"
									: "hidden xl:flex xl:relative xl:z-10 xl:opacity-60 xl:hover:opacity-100 xl:w-1/2 xl:shrink-0"
							}`}
							style={{
								transition:
									"width 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
							}}
						>
							{/* Tab Navigation */}
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									{/* Show panel restore button on mobile when panel is collapsed */}
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setLeftPanelExpanded(false)}
										className="xl:hidden h-7 px-2 bg-muted/50 hover:bg-muted"
										title="Show panel"
									>
										<ChevronRight className="w-4 h-4" />
									</Button>
									<div className="flex gap-2 border-b border-muted-foreground/20 overflow-x-auto scrollbar-hide">
										<button
											type="button"
											onClick={() => setRightPanelView("raw")}
											className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
												rightPanelView === "raw"
													? "border-primary text-foreground"
													: "border-transparent text-muted-foreground/70 hover:text-foreground"
											}`}
										>
											<Code className="w-3.5 h-3.5" />
											<span className="hidden sm:inline">Raw Caddyfile</span>
											<span className="sm:hidden">Raw</span>
										</button>
										{(caddyStatus?.available ||
											process.env.NODE_ENV === "development") && (
											<button
												type="button"
												onClick={() => setRightPanelView("config")}
												className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
													rightPanelView === "config"
														? "border-primary text-foreground"
														: "border-transparent text-muted-foreground/70 hover:text-foreground"
												}`}
											>
												<FileJson className="w-3.5 h-3.5" />
												<span className="hidden sm:inline">Full Config</span>
												<span className="sm:hidden">Config</span>
											</button>
										)}
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleFormat}
									disabled={!rawContent.trim()}
									className={`text-xs opacity-70 hover:opacity-100 ${
										rightPanelView === "raw" ? "visible" : "invisible"
									}`}
									title="Format Caddyfile"
								>
									<Wand2 className="h-3.5 w-3.5" />
									<span className="hidden sm:inline ml-2">Format</span>
								</Button>
							</div>

							{/* Tab Content */}
							{rightPanelView === "raw" ? (
								<div className="flex-1 min-h-0 border border-dashed border-muted-foreground/20 rounded-md overflow-auto bg-muted/10">
									<CaddyfileEditor
										value={rawContent}
										onChange={handleRawContentChange}
										placeholder="# Caddyfile configuration..."
									/>
								</div>
							) : (
								<div className="flex-1 min-h-0 border border-dashed border-muted-foreground/20 rounded-md overflow-auto bg-muted/10">
									<FullConfigView />
								</div>
							)}
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
			<footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur @supports-[backdrop-filter]:bg-card/60">
				<div className="container mx-auto px-4 py-3">
					<div className="flex items-center justify-between gap-4">
						{/* Left: Stats */}
						<div className="flex items-center gap-3 sm:gap-6 flex-wrap text-sm">
							{config && config.siteBlocks.length > 0 && (
								<>
									{/* Always show total sites count */}
									<div className="flex items-center gap-2">
										<Globe className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">
											{config.siteBlocks.reduce((total, block) => {
												if (isVirtualContainer(block)) {
													const container = parseVirtualContainer(block);
													return total + container.virtualBlocks.length;
												}
												return total + 1;
											}, 0)}
										</span>
										<span className="text-muted-foreground hidden sm:inline">
											total sites
										</span>
										<span className="text-muted-foreground sm:hidden">
											sites
										</span>
									</div>
									{/* Hide site blocks count on mobile */}
									<div className="hidden md:flex items-center gap-2">
										<Server className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">
											{config.siteBlocks.length}
										</span>
										<span className="text-muted-foreground">
											{config.siteBlocks.length === 1
												? "site block"
												: "site blocks"}
										</span>
									</div>
									{config.siteBlocks.filter((b) =>
										b.directives.some((d) => d.name === "tls"),
									).length > 0 && (
										<div className="flex items-center gap-2">
											<ShieldCheck className="h-4 w-4 text-[--color-success]" />
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
									{/* Hide proxy/file server counts on small screens */}
									{config.siteBlocks.filter((b) =>
										b.directives.some((d) => d.name === "reverse_proxy"),
									).length > 0 && (
										<div className="hidden lg:flex items-center gap-2">
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
													b.directives.some((d) => d.name === "reverse_proxy"),
												).length === 1
													? "proxy"
													: "proxies"}
											</span>
										</div>
									)}
									{config.siteBlocks.filter((b) =>
										b.directives.some((d) => d.name === "file_server"),
									).length > 0 && (
										<div className="hidden lg:flex items-center gap-2">
											<Sparkles className="h-4 w-4 text-primary" />
											<span className="font-medium">
												{
													config.siteBlocks.filter((b) =>
														b.directives.some((d) => d.name === "file_server"),
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
								onClick={() => loadConfig()}
								variant="ghost"
								size="sm"
								disabled={reloading}
								title={isLiveMode ? "Reload from Caddy" : "Reload from file"}
							>
								<RefreshCw
									className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`}
								/>
								<span className="hidden sm:inline ml-2">Reload</span>
							</Button>
							<Button
								onClick={handleSave}
								disabled={saving}
								variant="default"
								size="sm"
							>
								{saving ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Save className="h-4 w-4 mr-2" />
								)}
								{saving ? "Saving..." : isLiveMode ? "Save & Apply" : "Save"}
							</Button>
							{!isLiveMode && caddyStatus?.available && (
								<Button
									onClick={handleApplyToCaddy}
									disabled={applying}
									size="sm"
									variant="outline"
								>
									{applying ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Zap className="h-4 w-4 mr-2" />
									)}
									{applying ? "Applying..." : "Apply to Caddy"}
								</Button>
							)}
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
