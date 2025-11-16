"use client";

import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuthStatus {
	guestModeEnabled: boolean;
	isAuthenticated: boolean;
	user: {
		id: number;
		username: string;
	} | null;
}

export function ProfileDropdown() {
	const router = useRouter();
	const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch auth status
	const fetchStatus = useCallback(async () => {
		try {
			const response = await fetch("/api/auth/status");
			if (response.ok) {
				const data = await response.json();
				setAuthStatus(data);
			}
		} catch (error) {
			console.error("Failed to fetch auth status:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Fetch on mount
	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	// Re-fetch whenever settings dialog opens to ensure fresh data
	useEffect(() => {
		if (showSettings) {
			fetchStatus();
		}
	}, [showSettings, fetchStatus]);

	const handleLogout = async () => {
		try {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
			});

			if (response.ok) {
				toast.success("Logged out successfully");
				router.push("/login");
				router.refresh();
			} else {
				toast.error("Failed to logout");
			}
		} catch (_error) {
			toast.error("An error occurred during logout");
		}
	};

	const handleSettingsSuccess = () => {
		// Refresh auth status after settings change
		fetchStatus();
	};

	if (isLoading) {
		return null;
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="relative">
						<User className="h-5 w-5" />
						<span className="sr-only">Profile menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					{authStatus?.isAuthenticated && authStatus.user && (
						<>
							<div className="px-2 py-1.5 text-sm font-medium">
								{authStatus.user.username}
							</div>
							<DropdownMenuSeparator />
						</>
					)}
					{authStatus?.guestModeEnabled && (
						<div className="px-2 py-1.5 text-xs text-muted-foreground">
							Guest Mode
						</div>
					)}
					<DropdownMenuItem onClick={() => setShowSettings(true)}>
						<Settings className="mr-2 h-4 w-4" />
						<span>Settings</span>
					</DropdownMenuItem>
					{authStatus?.isAuthenticated && (
						<DropdownMenuItem onClick={handleLogout}>
							<LogOut className="mr-2 h-4 w-4" />
							<span>Logout</span>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<SettingsDialog
				open={showSettings}
				onOpenChange={setShowSettings}
				authStatus={authStatus}
				onSuccess={handleSettingsSuccess}
			/>
		</>
	);
}
