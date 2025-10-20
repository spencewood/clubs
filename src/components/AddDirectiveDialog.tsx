import { useState } from "react";
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
import type { CaddyDirective } from "@/types/caddyfile";

interface AddDirectiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (directive: Omit<CaddyDirective, "id">) => void;
}

export function AddDirectiveDialog({
	open,
	onOpenChange,
	onAdd,
}: AddDirectiveDialogProps) {
	const [name, setName] = useState("");
	const [args, setArgs] = useState("");

	const handleAdd = () => {
		if (!name.trim()) return;

		const directive: Omit<CaddyDirective, "id"> = {
			name: name.trim(),
			args: args
				.trim()
				.split(/\s+/)
				.filter((a) => a),
		};

		onAdd(directive);
		setName("");
		setArgs("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>Add Directive</DialogTitle>
					<DialogDescription>
						Add a new directive to this site block.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Directive Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., root, file_server, reverse_proxy"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="args">Arguments</Label>
						<Input
							id="args"
							value={args}
							onChange={(e) => setArgs(e.target.value)}
							placeholder="e.g., * /var/www/html"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleAdd}>Add Directive</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
