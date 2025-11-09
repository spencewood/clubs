import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./dialog";

const AlertDialog = Dialog;

const AlertDialogTrigger = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
	<Button ref={ref} className={className} {...props} />
));
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogContent = React.forwardRef<
	React.ElementRef<typeof DialogContent>,
	React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
	<DialogContent
		ref={ref}
		className={cn("sm:max-w-[425px]", className)}
		{...props}
	/>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = DialogHeader;
const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = DialogDescription;

const AlertDialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t",
			className,
		)}
		{...props}
	/>
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogAction = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
	<Button ref={ref} className={className} {...props} />
));
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
	<Button ref={ref} variant="outline" className={className} {...props} />
));
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
};
