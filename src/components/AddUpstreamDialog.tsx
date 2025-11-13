"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUpstreams } from "@/contexts/UpstreamsContext";
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

interface AddUpstreamDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddUpstreamDialog({
	open,
	onOpenChange,
}: AddUpstreamDialogProps) {
	const { addCustomUpstream } = useUpstreams();
	const [address, setAddress] = useState("");

	const handleAdd = () => {
		const trimmed = address.trim();
		if (!trimmed) {
			toast.error("Please enter an upstream address");
			return;
		}

		addCustomUpstream(trimmed);
		toast.success("Upstream added to quick list", {
			description: `${trimmed} will now appear in autocomplete suggestions`,
		});

		setAddress("");
		onOpenChange(false);
	};

	const handleClose = () => {
		setAddress("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Upstream to Quick List</DialogTitle>
					<DialogDescription>
						Add an upstream address to your quick list for easy access when
						creating reverse proxies
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="upstream-address">Upstream Address</Label>
						<Input
							id="upstream-address"
							placeholder="e.g., localhost, 192.168.1.10, myserver.local"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleAdd();
								}
							}}
						/>
						<p className="text-xs text-muted-foreground">
							Enter an upstream hostname or IP address (with or without port)
						</p>
					</div>

					<div className="flex gap-2 pt-4 border-t">
						<Button variant="outline" onClick={handleClose} className="flex-1">
							Cancel
						</Button>
						<Button
							onClick={handleAdd}
							disabled={!address.trim()}
							className="flex-1"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add to Quick List
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
