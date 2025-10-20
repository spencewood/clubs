import { Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface FileLoaderProps {
	onFileLoad: (content: string, filename: string) => void;
}

export function FileLoader({ onFileLoad }: FileLoaderProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleFileRead = (file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			onFileLoad(content, file.name);
		};
		reader.readAsText(file);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);

		const files = Array.from(e.dataTransfer.files);
		const caddyfile = files.find(
			(f) => f.name === "Caddyfile" || f.name.endsWith(".caddy"),
		);

		if (caddyfile) {
			handleFileRead(caddyfile);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleFileRead(file);
		}
	};

	return (
		<Card
			className={`transition-colors ${isDragging ? "border-primary bg-primary/5" : ""}`}
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
		>
			<CardHeader>
				<CardTitle>Load Caddyfile</CardTitle>
				<CardDescription>
					Upload a Caddyfile to edit and manage its configuration
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-4 py-8">
				<Upload className="h-12 w-12 text-muted-foreground" />
				<div className="text-center">
					<p className="text-sm text-muted-foreground mb-4">
						Drag and drop your Caddyfile here, or click to browse
					</p>
					<Button asChild>
						<label className="cursor-pointer">
							Choose File
							<input
								type="file"
								className="hidden"
								accept=".caddy,*"
								onChange={handleFileInput}
							/>
						</label>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
