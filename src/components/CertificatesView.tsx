"use client";

import {
	AlertCircle,
	Check,
	CheckCircle,
	Copy,
	FileKey,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getCaddyPKICA } from "@/lib/api";
import type { CaddyPKICA } from "@/types/caddyfile";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ViewHeader } from "./ViewHeader";

interface CertificateInfo {
	subject: string;
	issuer: string;
	validFrom: string;
	validTo: string;
	daysUntilExpiry: number;
	serialNumber: string;
	fingerprint: string;
	subjectAltNames: string[];
	keyAlgorithm: string;
	signatureAlgorithm: string;
}

type CertificateType = "letsencrypt" | "zerossl" | "custom" | "local";

interface AcmeCertificate {
	domain: string;
	certificate: CertificateInfo;
	certPath: string;
	hasPrivateKey: boolean;
	type: CertificateType;
	provider: string;
}

interface CertificatesViewProps {
	initialCertificates: CaddyPKICA | null;
	initialAcmeCertificates?: AcmeCertificate[];
}

export function CertificatesView({
	initialCertificates,
	initialAcmeCertificates = [],
}: CertificatesViewProps) {
	const [ca, setCA] = useState<CaddyPKICA | null>(initialCertificates);
	const [acmeCertificates, setAcmeCertificates] = useState<AcmeCertificate[]>(
		initialAcmeCertificates,
	);
	const [refreshing, setRefreshing] = useState(false);
	const [copiedRoot, setCopiedRoot] = useState(false);
	const [copiedIntermediate, setCopiedIntermediate] = useState(false);
	const [copiedCerts, setCopiedCerts] = useState<Set<string>>(new Set());

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

	const fetchAcmeCertificates = useCallback(async () => {
		try {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			if (data.success && data.certificates) {
				setAcmeCertificates(data.certificates);
			}
		} catch (error) {
			console.error("Error fetching ACME certificates:", error);
		}
	}, []);

	const refresh = useCallback(async () => {
		setRefreshing(true);
		await Promise.all([fetchCA(), fetchAcmeCertificates()]);
		setRefreshing(false);
	}, [fetchCA, fetchAcmeCertificates]);

	const getCertStatusColor = (daysUntilExpiry: number) => {
		if (daysUntilExpiry < 0) return "text-[--color-error]";
		if (daysUntilExpiry <= 7) return "text-[--color-error]";
		if (daysUntilExpiry <= 30) return "text-[--color-warning]";
		return "text-[--color-success]";
	};

	const getCertStatusIcon = (daysUntilExpiry: number) => {
		if (daysUntilExpiry < 0) return <XCircle className="w-5 h-5" />;
		if (daysUntilExpiry <= 30) return <AlertCircle className="w-5 h-5" />;
		return <CheckCircle className="w-5 h-5" />;
	};

	const getCertStatusMessage = (daysUntilExpiry: number) => {
		if (daysUntilExpiry < 0) return "Expired";
		if (daysUntilExpiry === 0) return "Expires today";
		if (daysUntilExpiry === 1) return "Expires tomorrow";
		if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
		if (daysUntilExpiry <= 30) return `Expires in ${daysUntilExpiry} days`;
		return `Valid for ${daysUntilExpiry} days`;
	};

	const renderCertificateCard = (cert: AcmeCertificate) => (
		<Card key={cert.domain} className="p-6">
			<div className="space-y-4">
				{/* Domain and Status */}
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<h4 className="text-lg font-semibold">{cert.domain}</h4>
							<span className="text-xs bg-muted px-2 py-0.5 rounded">
								{cert.provider}
							</span>
						</div>
						<div
							className={`flex items-center gap-2 mt-1 ${getCertStatusColor(cert.certificate.daysUntilExpiry)}`}
						>
							{getCertStatusIcon(cert.certificate.daysUntilExpiry)}
							<span className="text-sm font-medium">
								{getCertStatusMessage(cert.certificate.daysUntilExpiry)}
							</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const certText = `Domain: ${cert.domain}\nIssuer: ${cert.certificate.issuer}\nValid From: ${cert.certificate.validFrom}\nValid To: ${cert.certificate.validTo}\nSerial: ${cert.certificate.serialNumber}\nFingerprint: ${cert.certificate.fingerprint}`;
							navigator.clipboard.writeText(certText);
							toast.success("Certificate info copied");
							setCopiedCerts((prev) => new Set(prev).add(cert.domain));
							setTimeout(
								() =>
									setCopiedCerts(
										(prev) =>
											new Set([...prev].filter((d) => d !== cert.domain)),
									),
								2000,
							);
						}}
					>
						{copiedCerts.has(cert.domain) ? (
							<>
								<Check className="h-4 w-4" />
								<span className="ml-2">Copied!</span>
							</>
						) : (
							<>
								<Copy className="h-4 w-4" />
								<span className="ml-2">Copy Info</span>
							</>
						)}
					</Button>
				</div>

				{/* Certificate Details Grid */}
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-1">
						<div className="text-sm font-medium text-muted-foreground">
							Issuer
						</div>
						<p className="text-sm font-mono break-all">
							{cert.certificate.issuer}
						</p>
					</div>

					<div className="space-y-1">
						<div className="text-sm font-medium text-muted-foreground">
							Valid Period
						</div>
						<p className="text-sm">
							{new Date(cert.certificate.validFrom).toLocaleDateString()} -{" "}
							{new Date(cert.certificate.validTo).toLocaleDateString()}
						</p>
					</div>

					{cert.certificate.subjectAltNames.length > 0 && (
						<div className="space-y-1 md:col-span-2">
							<div className="text-sm font-medium text-muted-foreground">
								Subject Alternative Names
							</div>
							<div className="flex flex-wrap gap-2">
								{cert.certificate.subjectAltNames.map((san) => (
									<span
										key={san}
										className="text-xs bg-muted px-2 py-1 rounded font-mono"
									>
										{san}
									</span>
								))}
							</div>
						</div>
					)}

					<div className="space-y-1">
						<div className="text-sm font-medium text-muted-foreground">
							Serial Number
						</div>
						<p className="text-xs font-mono break-all">
							{cert.certificate.serialNumber}
						</p>
					</div>

					<div className="space-y-1">
						<div className="text-sm font-medium text-muted-foreground">
							Fingerprint (SHA-256)
						</div>
						<p className="text-xs font-mono break-all">
							{cert.certificate.fingerprint}
						</p>
					</div>

					<div className="space-y-1">
						<div className="text-sm font-medium text-muted-foreground">
							Key Algorithm
						</div>
						<p className="text-sm uppercase">{cert.certificate.keyAlgorithm}</p>
					</div>

					<div className="space-y-1">
						<div className="text-sm font-medium text-muted-foreground">
							Private Key
						</div>
						<p className="text-sm">
							{cert.hasPrivateKey ? (
								<span className="text-[--color-success]">Available</span>
							) : (
								<span className="text-[--color-error]">Not found</span>
							)}
						</p>
					</div>
				</div>
			</div>
		</Card>
	);

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

	// Use ACME certificates directly (already flat)
	const allCerts = acmeCertificates;

	return (
		<div className="space-y-6">
			<ViewHeader
				title="Certificates"
				subtitle="SSL/TLS Certificates and Internal PKI"
				onRefresh={refresh}
				refreshing={refreshing}
				refreshTitle="Refresh certificates"
			/>

			{/* SSL Certificates Section */}
			<div className="border-b pb-3">
				<h3 className="text-lg font-semibold">SSL Certificates</h3>
				<p className="text-sm text-muted-foreground">
					Production SSL/TLS certificates
				</p>
			</div>

			{allCerts.length > 0 ? (
				<div className="space-y-4">{allCerts.map(renderCertificateCard)}</div>
			) : (
				<Card className="p-6">
					<div className="flex items-center justify-center py-8">
						<div className="text-center space-y-3">
							<ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground" />
							<div>
								<h4 className="font-semibold">No SSL Certificates Found</h4>
								<p className="text-sm text-muted-foreground mt-1 max-w-md">
									No production SSL/TLS certificates are currently available.
									This may be because the certificate storage volume is not
									mounted, or no certificates have been issued yet.
								</p>
							</div>
						</div>
					</div>
				</Card>
			)}

			{/* Internal PKI Section */}
			<div className="border-b pb-3">
				<h3 className="text-lg font-semibold">Internal PKI</h3>
				<p className="text-sm text-muted-foreground">
					Caddy's local certificate authority for development
				</p>
			</div>

			{/* CA Info Card */}
			<Card className="p-6">
				<div className="flex items-start gap-4">
					<div className="p-3 bg-primary/10 rounded-lg">
						<ShieldCheck className="w-6 h-6 text-primary" />
					</div>
					<div className="flex-1 space-y-4">
						<div>
							<h4 className="text-base font-semibold">{ca.name}</h4>
							<p className="text-xs text-muted-foreground">CA ID: {ca.id}</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-1">
								<div className="flex items-center gap-2 text-sm font-medium">
									<ShieldCheck className="w-4 h-4 text-muted-foreground" />
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
							<ShieldCheck className="w-4 h-4" />
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
