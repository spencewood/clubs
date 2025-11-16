"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirect = searchParams.get("redirect") || "/";

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || "Login failed");
				return;
			}

			// Redirect to the original page or home on success
			router.push(redirect);
			router.refresh();
		} catch (_err) {
			setError("An error occurred during login");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Login to Clubs</CardTitle>
					<CardDescription>
						Enter your credentials to access the Caddy configuration manager
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								type="text"
								placeholder="Enter your username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Logging in..." : "Login"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					Loading...
				</div>
			}
		>
			<LoginForm />
		</Suspense>
	);
}
