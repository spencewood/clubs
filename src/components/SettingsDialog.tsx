"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface AuthStatus {
	guestModeEnabled: boolean;
	isAuthenticated: boolean;
	user: {
		id: number;
		username: string;
	} | null;
}

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	authStatus: AuthStatus | null;
	onSuccess?: () => void;
}

const setupSchema = z
	.object({
		username: z
			.string()
			.min(3, "Username must be at least 3 characters")
			.max(50, "Username must be at most 50 characters"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password must be at most 100 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export function SettingsDialog({
	open,
	onOpenChange,
	authStatus,
	onSuccess,
}: SettingsDialogProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"general" | "users">("general");
	const [guestModeEnabled, setGuestModeEnabled] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});

	// Initialize state when dialog opens
	useEffect(() => {
		if (open) {
			setGuestModeEnabled(authStatus?.guestModeEnabled ?? false);
		} else {
			setActiveTab("general");
			setGuestModeEnabled(false);
			setUsername("");
			setPassword("");
			setConfirmPassword("");
			setError(null);
			setValidationErrors({});
		}
	}, [open, authStatus]);

	const handleSetup = async (e?: React.FormEvent) => {
		e?.preventDefault();
		setError(null);
		setValidationErrors({});

		// Validate form
		const validation = setupSchema.safeParse({
			username,
			password,
			confirmPassword,
		});

		if (!validation.success) {
			const errors: Record<string, string> = {};
			for (const error of validation.error.issues) {
				const path = error.path[0] as string;
				errors[path] = error.message;
			}
			setValidationErrors(errors);
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/setup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					password,
					confirmPassword,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || "Setup failed");
				return;
			}

			toast.success("Authentication enabled!", {
				description: "You are now logged in",
			});

			// Call success callback
			if (onSuccess) {
				onSuccess();
			}

			// Close dialog
			onOpenChange(false);

			// Refresh the page to update auth state
			router.refresh();
		} catch (_err) {
			setError("An error occurred during setup");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		setError(null);
		setValidationErrors({});

		// Check if guest mode setting changed
		const guestModeChanged = guestModeEnabled !== authStatus?.guestModeEnabled;

		if (!guestModeChanged) {
			// No changes, just close
			onOpenChange(false);
			return;
		}

		// If turning OFF guest mode for the first time (no users exist), need to create admin
		if (authStatus?.guestModeEnabled && !guestModeEnabled) {
			// Validate form
			const validation = setupSchema.safeParse({
				username,
				password,
				confirmPassword,
			});

			if (!validation.success) {
				const errors: Record<string, string> = {};
				for (const error of validation.error.issues) {
					const path = error.path[0] as string;
					errors[path] = error.message;
				}
				setValidationErrors(errors);
				return;
			}

			// Call handleSetup to create admin (will disable guest mode automatically)
			await handleSetup();
			return;
		}

		// Otherwise, just toggle guest mode (user is authenticated)
		setIsLoading(true);
		try {
			const response = await fetch("/api/auth/guest-mode", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ enabled: guestModeEnabled }),
			});

			if (!response.ok) {
				const data = await response.json();
				toast.error("Failed to update guest mode", {
					description: data.error || "An error occurred",
				});
				return;
			}

			toast.success(
				guestModeEnabled ? "Guest mode enabled" : "Guest mode disabled",
				{
					description: guestModeEnabled
						? "All user accounts have been deleted"
						: "Authentication is now required",
				},
			);

			// If enabling guest mode, user was logged out - redirect to home
			if (guestModeEnabled) {
				onOpenChange(false);
				router.push("/");
				router.refresh();
				return;
			}

			// Call success callback to refresh auth status
			if (onSuccess) {
				onSuccess();
			}

			// Close dialog
			onOpenChange(false);

			// Refresh the page
			router.refresh();
		} catch (_err) {
			toast.error("An error occurred while updating guest mode");
		} finally {
			setIsLoading(false);
		}
	};

	// Show credentials form when turning OFF guest mode for first time (and not authenticated)
	const showCredentialsForm =
		authStatus?.guestModeEnabled &&
		!guestModeEnabled &&
		!authStatus?.isAuthenticated;

	// Show warning when turning ON guest mode (this will wipe user data)
	const showGuestModeWarning =
		!authStatus?.guestModeEnabled && guestModeEnabled;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[550px]">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>
						Configure your Clubs preferences and user management
					</DialogDescription>
				</DialogHeader>

				{/* Tab Navigation */}
				<div className="flex gap-2 border-b border-muted-foreground/20 mb-4">
					<button
						type="button"
						onClick={() => setActiveTab("general")}
						className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
							activeTab === "general"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						General
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("users")}
						className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
							activeTab === "users"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Users
					</button>
				</div>

				{/* Tab Content */}
				{activeTab === "general" && (
					<div className="space-y-4">
						<div className="text-sm text-muted-foreground">
							General application settings will appear here.
						</div>
					</div>
				)}

				{activeTab === "users" && (
					<div className="space-y-4">
						<Alert>
							<AlertDescription className="text-sm">
								{authStatus?.guestModeEnabled
									? "Guest mode is currently enabled. Anyone can access this interface without authentication."
									: authStatus?.isAuthenticated
										? `Authentication is enabled. Logged in as ${authStatus.user?.username}`
										: "Authentication is required."}
							</AlertDescription>
						</Alert>

						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<Label htmlFor="guest-mode" className="text-base">
									Guest Mode
								</Label>
								<p className="text-sm text-muted-foreground">
									Allow unauthenticated access to the interface
								</p>
							</div>
							<Switch
								id="guest-mode"
								checked={guestModeEnabled}
								onCheckedChange={setGuestModeEnabled}
								disabled={isLoading}
							/>
						</div>

						{showGuestModeWarning && (
							<Alert variant="destructive">
								<AlertDescription className="text-sm">
									<strong>Warning:</strong> Enabling guest mode will delete all
									user accounts and authentication data. This action cannot be
									undone.
								</AlertDescription>
							</Alert>
						)}

						{showCredentialsForm && (
							<>
								<Separator />
								<form
									id="admin-form"
									onSubmit={handleSetup}
									className="space-y-4"
								>
									<div className="text-sm font-medium">
										Create Admin Account
									</div>
									<div className="text-sm text-muted-foreground">
										Set up the first admin account to enable authentication:
									</div>

									{error && (
										<Alert variant="destructive">
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									)}

									<div className="space-y-2">
										<Label htmlFor="username">
											Username <span className="text-destructive">*</span>
										</Label>
										<Input
											id="username"
											type="text"
											placeholder="Enter username"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											disabled={isLoading}
											autoFocus
										/>
										{validationErrors.username && (
											<p className="text-xs text-destructive">
												{validationErrors.username}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="password">
											Password <span className="text-destructive">*</span>
										</Label>
										<Input
											id="password"
											type="password"
											placeholder="Enter password (min 8 characters)"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											disabled={isLoading}
										/>
										{validationErrors.password && (
											<p className="text-xs text-destructive">
												{validationErrors.password}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="confirmPassword">
											Confirm Password{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="confirmPassword"
											type="password"
											placeholder="Re-enter password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											disabled={isLoading}
										/>
										{validationErrors.confirmPassword && (
											<p className="text-xs text-destructive">
												{validationErrors.confirmPassword}
											</p>
										)}
									</div>
								</form>
							</>
						)}

						{authStatus?.isAuthenticated && (
							<>
								<Separator />
								<div className="text-sm font-medium">User Management</div>
								<div className="text-sm text-muted-foreground">
									Additional user management features coming soon.
								</div>
							</>
						)}
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						type={showCredentialsForm ? "submit" : "button"}
						form={showCredentialsForm ? "admin-form" : undefined}
						onClick={showCredentialsForm ? undefined : handleSave}
						disabled={isLoading}
					>
						{isLoading ? "Saving..." : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
