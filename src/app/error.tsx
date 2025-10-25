"use client";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
				<p className="text-muted-foreground mb-4">{error.message}</p>
				<button
					onClick={reset}
					type="button"
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Try again
				</button>
			</div>
		</div>
	);
}
