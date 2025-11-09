"use client";

import { Globe, Loader2, Plus, Server, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { loadCaddyfile, saveCaddyfile } from "@/lib/api";
import {
	parseCaddyfile,
	serializeCaddyfile,
} from "@/lib/parser/caddyfile-parser";
import { type ConsolidatedServer, parseAddress } from "@/lib/upstream-utils";
import type {
	CaddyConfig,
	CaddyDirective,
	CaddySiteBlock,
} from "@/types/caddyfile";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface UpstreamPort {
	port: number;
	siteId: string;
	siteAddresses: string[];
	directiveId: string;
}

interface ManageUpstreamDialogProps {
	upstream: ConsolidatedServer | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function findPortsInDirectives(
	directives: CaddyDirective[],
	serverName: string,
	siteBlock: CaddySiteBlock,
	foundPorts: UpstreamPort[],
) {
	for (const directive of directives) {
		if (directive.name === "reverse_proxy") {
			// Check each upstream address in the reverse_proxy args
			for (const address of directive.args) {
				const { server, port } = parseAddress(address);
				if (server === serverName && port !== null) {
					foundPorts.push({
						port,
						siteId: siteBlock.id,
						siteAddresses: siteBlock.addresses,
						directiveId: directive.id,
					});
				}
			}
		}

		// Recursively check nested directives
		if (directive.block) {
			findPortsInDirectives(directive.block, serverName, siteBlock, foundPorts);
		}
	}
}

function findPortsForUpstream(
	config: CaddyConfig,
	serverName: string,
): UpstreamPort[] {
	const foundPorts: UpstreamPort[] = [];

	for (const siteBlock of config.siteBlocks) {
		findPortsInDirectives(
			siteBlock.directives,
			serverName,
			siteBlock,
			foundPorts,
		);
	}

	// Sort by port number
	return foundPorts.sort((a, b) => a.port - b.port);
}

export function ManageUpstreamDialog({
	upstream,
	open,
	onOpenChange,
	onSuccess,
}: ManageUpstreamDialogProps) {
	const [config, setConfig] = useState<CaddyConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [ports, setPorts] = useState<UpstreamPort[]>([]);
	const [newPort, setNewPort] = useState("");

	// State for delete confirmation
	const [portToDelete, setPortToDelete] = useState<UpstreamPort | null>(null);

	const loadConfigAndPorts = useCallback(async () => {
		if (!upstream) return;

		setLoading(true);
		try {
			const result = await loadCaddyfile();
			if (result.success && result.content) {
				const parsedConfig = parseCaddyfile(result.content);
				setConfig(parsedConfig);

				// Find all ports for this upstream across all sites
				const foundPorts = findPortsForUpstream(parsedConfig, upstream.server);
				setPorts(foundPorts);
			} else {
				toast.error("Failed to load configuration", {
					description: result.error,
				});
			}
		} catch (error) {
			toast.error("Error loading configuration", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setLoading(false);
		}
	}, [upstream]);

	useEffect(() => {
		if (open && upstream) {
			loadConfigAndPorts();
		}
	}, [open, upstream, loadConfigAndPorts]);

	const handleAddPort = async () => {
		const portNum = Number.parseInt(newPort.trim(), 10);
		if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
			toast.error("Invalid port number", {
				description: "Port must be between 1 and 65535",
			});
			return;
		}

		// Check if port already exists
		if (ports.some((p) => p.port === portNum)) {
			toast.error("Port already exists", {
				description: `Port ${portNum} is already configured for this upstream`,
			});
			return;
		}

		if (!config || !upstream) return;

		setSaving(true);
		try {
			// Create a new site block for this upstream
			const newSiteBlock: CaddySiteBlock = {
				id: generateId(),
				addresses: [`:${portNum}`],
				directives: [
					{
						id: generateId(),
						name: "reverse_proxy",
						args: [`${upstream.server}:${portNum}`],
					},
				],
			};

			const updatedConfig: CaddyConfig = {
				...config,
				siteBlocks: [...config.siteBlocks, newSiteBlock],
			};

			// Serialize and save
			const serialized = serializeCaddyfile(updatedConfig);
			const saveResult = await saveCaddyfile(serialized);

			if (saveResult.success) {
				toast.success("Port added successfully", {
					description: `Created new site listening on :${portNum}`,
				});
				setNewPort("");
				await loadConfigAndPorts();
				onSuccess?.();
			} else {
				toast.error("Failed to save configuration", {
					description: saveResult.error,
				});
			}
		} catch (error) {
			toast.error("Error adding port", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleRemovePort = async (portInfo: UpstreamPort) => {
		if (!config || !upstream) return;

		setSaving(true);
		try {
			// Find the site and directive
			const siteBlock = config.siteBlocks.find((s) => s.id === portInfo.siteId);
			if (!siteBlock) {
				toast.error("Site not found");
				return;
			}

			// Update the config by removing the upstream address from the directive
			const updatedConfig = removeUpstreamFromDirective(
				config,
				portInfo.siteId,
				portInfo.directiveId,
				`${upstream.server}:${portInfo.port}`,
			);

			// Serialize and save
			const serialized = serializeCaddyfile(updatedConfig);
			const saveResult = await saveCaddyfile(serialized);

			if (saveResult.success) {
				toast.success("Port removed successfully", {
					description: `Removed ${upstream.server}:${portInfo.port} from ${portInfo.siteAddresses.join(", ")}`,
				});
				await loadConfigAndPorts();
				onSuccess?.();
			} else {
				toast.error("Failed to save configuration", {
					description: saveResult.error,
				});
			}
		} catch (error) {
			toast.error("Error removing port", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setSaving(false);
			setPortToDelete(null);
		}
	};

	const removeUpstreamFromDirective = (
		config: CaddyConfig,
		siteId: string,
		directiveId: string,
		address: string,
	): CaddyConfig => {
		const updatedSiteBlocks = config.siteBlocks.map((siteBlock) => {
			if (siteBlock.id !== siteId) return siteBlock;

			return {
				...siteBlock,
				directives: updateDirectivesRecursively(
					siteBlock.directives,
					directiveId,
					address,
				),
			};
		});

		return {
			...config,
			siteBlocks: updatedSiteBlocks,
		};
	};

	const updateDirectivesRecursively = (
		directives: CaddyDirective[],
		directiveId: string,
		address: string,
	): CaddyDirective[] => {
		return directives.map((directive) => {
			if (directive.id === directiveId && directive.name === "reverse_proxy") {
				// Remove the address from args
				const newArgs = directive.args.filter((arg) => arg !== address);
				return {
					...directive,
					args: newArgs,
				};
			}

			// Recursively update nested directives
			if (directive.block) {
				return {
					...directive,
					block: updateDirectivesRecursively(
						directive.block,
						directiveId,
						address,
					),
				};
			}

			return directive;
		});
	};

	const groupedPorts = ports.reduce(
		(acc, port) => {
			const key = port.siteAddresses.join(", ");
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(port);
			return acc;
		},
		{} as Record<string, UpstreamPort[]>,
	);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Manage Upstream</DialogTitle>
						<DialogDescription>
							Configure ports for{" "}
							<span className="font-mono font-semibold text-foreground">
								{upstream?.server}
							</span>
						</DialogDescription>
					</DialogHeader>

					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="space-y-6">
							{/* Add new port section */}
							<div className="space-y-3">
								<Label className="text-base font-semibold">Add Port</Label>
								<div className="flex gap-2">
									<Input
										type="number"
										placeholder="e.g., 8080"
										value={newPort}
										onChange={(e) => setNewPort(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && !saving) {
												handleAddPort();
											}
										}}
										disabled={saving}
										min="1"
										max="65535"
									/>
									<Button
										onClick={handleAddPort}
										disabled={!newPort.trim() || saving}
									>
										{saving ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4 mr-2" />
										)}
										Add
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Adding a port will create a new site block that proxies to{" "}
									{upstream?.server}:{"{port}"}
								</p>
							</div>

							{/* Existing ports grouped by site */}
							<div className="space-y-3">
								<Label className="text-base font-semibold">
									Configured Ports ({ports.length})
								</Label>

								{ports.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
										<Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
										<p>No ports configured for this upstream</p>
										<p className="text-xs mt-1">
											Add a port above to get started
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{Object.entries(groupedPorts).map(
											([siteAddressKey, sitePorts]) => (
												<div
													key={siteAddressKey}
													className="border rounded-lg p-4 space-y-3"
												>
													<div className="flex items-center gap-2 text-sm font-medium">
														{sitePorts[0].siteAddresses.some((addr) =>
															addr.includes("."),
														) ? (
															<Globe className="h-4 w-4 text-muted-foreground" />
														) : (
															<Server className="h-4 w-4 text-muted-foreground" />
														)}
														<span className="font-mono">
															{sitePorts[0].siteAddresses.join(", ")}
														</span>
													</div>

													<div className="space-y-2">
														{sitePorts.map((portInfo) => (
															<div
																key={`${portInfo.siteId}-${portInfo.port}`}
																className="flex items-center justify-between p-2 bg-accent/50 rounded hover:bg-accent transition-colors"
															>
																<div className="flex items-center gap-2">
																	<code className="text-sm font-mono">
																		{upstream?.server}:{portInfo.port}
																	</code>
																</div>
																<Button
																	variant="ghost"
																	size="icon"
																	onClick={() => setPortToDelete(portInfo)}
																	disabled={saving}
																	className="h-8 w-8"
																>
																	<Trash2 className="h-4 w-4 text-destructive" />
																</Button>
															</div>
														))}
													</div>
												</div>
											),
										)}
									</div>
								)}
							</div>
						</div>
					)}

					<div className="flex gap-2 pt-4 border-t">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1"
						>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={!!portToDelete}
				onOpenChange={(open) => !open && setPortToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Port</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove{" "}
							<span className="font-mono font-semibold">
								{upstream?.server}:{portToDelete?.port}
							</span>{" "}
							from{" "}
							<span className="font-mono">
								{portToDelete?.siteAddresses.join(", ")}
							</span>
							?
							{portToDelete &&
								ports.filter((p) => p.siteId === portToDelete.siteId).length ===
									1 && (
									<>
										<br />
										<br />
										<span className="text-destructive font-medium">
											Warning: This is the last upstream for this site. Removing
											it may cause the site to stop working.
										</span>
									</>
								)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => portToDelete && handleRemovePort(portToDelete)}
							disabled={saving}
							className="bg-destructive hover:bg-destructive/90"
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Removing...
								</>
							) : (
								"Remove Port"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
