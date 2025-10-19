import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CaddyDirective } from "@/types/caddyfile";

interface EditDirectiveDialogProps {
  directive: CaddyDirective | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (directive: CaddyDirective) => void;
}

export function EditDirectiveDialog({
  directive,
  open,
  onOpenChange,
  onSave,
}: EditDirectiveDialogProps) {
  const [name, setName] = useState("");
  const [args, setArgs] = useState("");
  const [blockContent, setBlockContent] = useState("");

  useEffect(() => {
    if (directive) {
      setName(directive.name);
      setArgs(directive.args.join(" "));
      setBlockContent("");
    }
  }, [directive]);

  const handleSave = () => {
    if (!directive) return;

    const updated: CaddyDirective = {
      ...directive,
      name: name.trim(),
      args: args
        .trim()
        .split(/\s+/)
        .filter((a) => a),
    };

    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Directive</DialogTitle>
          <DialogDescription>
            Modify the directive name and arguments.
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
          {directive?.block && (
            <div className="grid gap-2">
              <Label htmlFor="block">Block Content</Label>
              <Textarea
                id="block"
                value={blockContent}
                onChange={(e) => setBlockContent(e.target.value)}
                placeholder="Nested directives (advanced)"
                rows={4}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
