import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CaddySiteBlock } from "@/types/caddyfile";
import { Pencil, Trash2, Plus } from "lucide-react";
import { DirectiveItem } from "./DirectiveItem";

interface SiteBlockCardProps {
  siteBlock: CaddySiteBlock;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddDirective: (siteBlockId: string) => void;
  onEditDirective: (siteBlockId: string, directiveId: string) => void;
  onDeleteDirective: (siteBlockId: string, directiveId: string) => void;
}

export function SiteBlockCard({
  siteBlock,
  onEdit,
  onDelete,
  onAddDirective,
  onEditDirective,
  onDeleteDirective,
}: SiteBlockCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-mono">
              {siteBlock.addresses.join(", ")}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(siteBlock.id)}
              title="Edit site addresses"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(siteBlock.id)}
              title="Delete site block"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {siteBlock.directives.map((directive) => (
            <DirectiveItem
              key={directive.id}
              directive={directive}
              onEdit={() => onEditDirective(siteBlock.id, directive.id)}
              onDelete={() => onDeleteDirective(siteBlock.id, directive.id)}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => onAddDirective(siteBlock.id)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Directive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
