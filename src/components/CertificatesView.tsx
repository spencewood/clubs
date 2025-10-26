"use client";

import { Award, Check, Copy, FileKey, RefreshCw, Shield } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getCaddyPKICA } from "@/lib/api";
import type { CaddyPKICA } from "@/types/caddyfile";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface CertificatesViewProps {
	initialCertificates: CaddyPKICA | null;
}

export function CertificatesView({
	initialCertificates,
}: CertificatesViewProps) {
	const [ca, setCA] = useState<CaddyPKICA | null>(initialCertificates);
	const [refreshing, setRefreshing] = useState(false);
	const [copiedRoot, setCopiedRoot] = useState(false);
	const [copiedIntermediate, setCopiedIntermediate] = useState(false);

	const fetchCA = useCallback(async () => {
		setRefreshing(true);

		try {
			const result = await getCaddyPKICA();

			if (result.success && result.ca) {
				setCA(result.ca);
			} else {
				toast.error("Failed to fetch PKI CA", {
					description: result.error || "Unknown error",
				});
			}
		} catch (error) {
			toast.error("Error fetching PKI CA", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setRefreshing(false);
		}
	}, []);

	// No initial fetch - we use initialCertificates prop
	// useEffect is removed to prevent unnecessary initial fetch

	if (!ca) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center space-y-3">
					<FileKey className="w-12 h-12 mx-auto text-muted-foreground" />
					<div>
						<h3 className="font-semibold">No PKI CA Found</h3>
						<p className="text-sm text-muted-foreground mt-1">
							No PKI Certificate Authority is currently available.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with refresh */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Certificates</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Internal PKI Certificate Authority
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => fetchCA()}
					disabled={refreshing}
					title="Refresh certificates"
				>
					<RefreshCw
						className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
					/>
					<span className="hidden sm:inline ml-2">Refresh</span>
				</Button>
			</div>

			{/* CA Info Card */}
			<Card className="p-6">
				<div className="flex items-start gap-4">
					<div className="p-3 bg-primary/10 rounded-lg">
						<Shield className="w-6 h-6 text-primary" />
					</div>
					<div className="flex-1 space-y-4">
						<div>
							<h3 className="text-lg font-semibold">{ca.name}</h3>
							<p className="text-sm text-muted-foreground">CA ID: {ca.id}</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-1">
								<div className="flex items-center gap-2 text-sm font-medium">
									<Award className="w-4 h-4 text-muted-foreground" />
									Root Certificate
								</div>
								<p className="text-sm text-muted-foreground font-mono">
									{ca.root_common_name}
								</p>
							</div>

							<div className="space-y-1">
								<div className="flex items-center gap-2 text-sm font-medium">
									<FileKey className="w-4 h-4 text-muted-foreground" />
									Intermediate Certificate
								</div>
								<p className="text-sm text-muted-foreground font-mono">
									{ca.intermediate_common_name}
								</p>
							</div>
						</div>
					</div>
				</div>
			</Card>

			{/* Root Certificate */}
			<Card className="p-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="font-semibold flex items-center gap-2">
							<Award className="w-4 h-4" />
							Root Certificate (PEM)
						</h4>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								navigator.clipboard.writeText(ca.root_certificate);
								toast.success("Copied to clipboard");
								setCopiedRoot(true);
								setTimeout(() => setCopiedRoot(false), 2000);
							}}
						>
							{copiedRoot ? (
								<>
									<Check className="h-4 w-4" />
									<span className="ml-2">Copied!</span>
								</>
							) : (
								<>
									<Copy className="h-4 w-4" />
									<span className="ml-2">Copy</span>
								</>
							)}
						</Button>
					</div>
					<pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto font-mono">
						{ca.root_certificate}
					</pre>
				</div>
			</Card>

			{/* Intermediate Certificate */}
			<Card className="p-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="font-semibold flex items-center gap-2">
							<FileKey className="w-4 h-4" />
							Intermediate Certificate (PEM)
						</h4>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								navigator.clipboard.writeText(ca.intermediate_certificate);
								toast.success("Copied to clipboard");
								setCopiedIntermediate(true);
								setTimeout(() => setCopiedIntermediate(false), 2000);
							}}
						>
							{copiedIntermediate ? (
								<>
									<Check className="h-4 w-4" />
									<span className="ml-2">Copied!</span>
								</>
							) : (
								<>
									<Copy className="h-4 w-4" />
									<span className="ml-2">Copy</span>
								</>
							)}
						</Button>
					</div>
					<pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto font-mono">
						{ca.intermediate_certificate}
					</pre>
				</div>
			</Card>
		</div>
	);
}
