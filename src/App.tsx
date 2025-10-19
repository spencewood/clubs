import { useState } from "react";
import { CaddyfileBrowser } from "@/components/CaddyfileBrowser";
import { CaddyfileVisualizer } from "@/components/CaddyfileVisualizer";
import { SiteBlockCard } from "@/components/SiteBlockCard";
import { EditDirectiveDialog } from "@/components/EditDirectiveDialog";
import { AddDirectiveDialog } from "@/components/AddDirectiveDialog";
import { Button } from "@/components/ui/button";
import { parseCaddyfile, serializeCaddyfile } from "@/lib/parser/caddyfile-parser";
import { validateCaddyfile } from "@/lib/validator/caddyfile-validator";
import type { CaddyConfig, CaddyDirective } from "@/types/caddyfile";
import { Save, Plus, X, AlertTriangle, Eye, Edit3 } from "lucide-react";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

type ViewMode = "edit" | "visualize";

function App() {
  const [config, setConfig] = useState<CaddyConfig | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [filepath, setFilepath] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("visualize");
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [editingDirective, setEditingDirective] = useState<{
    siteBlockId: string;
    directive: CaddyDirective;
  } | null>(null);
  const [addingDirective, setAddingDirective] = useState<string | null>(null);

  const handleFileSelect = (path: string, content: string, name: string) => {
    // Validate the file first
    const validation = validateCaddyfile(content);

    if (!validation.valid) {
      alert(`Invalid Caddyfile:\n${validation.errors.join("\n")}`);
      return;
    }

    // Show warnings if any
    setValidationWarnings(validation.warnings);

    const parsed = parseCaddyfile(content);
    setConfig(parsed);
    setFilename(name);
    setFilepath(path);
  };

  const handleSave = async () => {
    if (!config || !filepath) return;

    setSaving(true);
    try {
      const content = serializeCaddyfile(config);

      if (import.meta.env.DEV) {
        // In development, just download the file
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "Caddyfile";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // In production, save via API
        const response = await fetch(`/api/caddyfiles/${encodeURIComponent(filename)}`, {
          method: "PUT",
          headers: { "Content-Type": "text/plain" },
          body: content,
        });

        if (!response.ok) throw new Error("Failed to save file");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setConfig(null);
    setFilename("");
    setFilepath("");
  };

  const handleDeleteSiteBlock = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      siteBlocks: config.siteBlocks.filter((sb) => sb.id !== id),
    });
  };

  const handleEditDirective = (siteBlockId: string, directiveId: string) => {
    if (!config) return;

    const siteBlock = config.siteBlocks.find((sb) => sb.id === siteBlockId);
    if (!siteBlock) return;

    const directive = findDirectiveById(siteBlock.directives, directiveId);
    if (directive) {
      setEditingDirective({ siteBlockId, directive });
    }
  };

  const handleSaveDirective = (updated: CaddyDirective) => {
    if (!config || !editingDirective) return;

    const newConfig = { ...config };
    const siteBlock = newConfig.siteBlocks.find(
      (sb) => sb.id === editingDirective.siteBlockId
    );

    if (siteBlock) {
      siteBlock.directives = updateDirectiveById(
        siteBlock.directives,
        updated.id,
        updated
      );
      setConfig(newConfig);
    }

    setEditingDirective(null);
  };

  const handleDeleteDirective = (siteBlockId: string, directiveId: string) => {
    if (!config) return;

    const newConfig = { ...config };
    const siteBlock = newConfig.siteBlocks.find((sb) => sb.id === siteBlockId);

    if (siteBlock) {
      siteBlock.directives = deleteDirectiveById(siteBlock.directives, directiveId);
      setConfig(newConfig);
    }
  };

  const handleAddDirective = (directive: Omit<CaddyDirective, "id">) => {
    if (!config || !addingDirective) return;

    const newConfig = { ...config };
    const siteBlock = newConfig.siteBlocks.find((sb) => sb.id === addingDirective);

    if (siteBlock) {
      siteBlock.directives.push({
        ...directive,
        id: generateId(),
      });
      setConfig(newConfig);
    }

    setAddingDirective(null);
  };

  const handleAddSiteBlock = () => {
    if (!config) return;

    const newConfig = { ...config };
    newConfig.siteBlocks.push({
      id: generateId(),
      addresses: ["example.com"],
      directives: [],
    });
    setConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full text-left cursor-pointer"
          >
            <span className="text-5xl flex-shrink-0">♣</span>
            <div>
              <h1 className="text-3xl font-bold">Clubs</h1>
              <p className="text-sm text-muted-foreground">
                Caddyfile Management System
              </p>
            </div>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!config ? (
          <div className="max-w-3xl mx-auto">
            <CaddyfileBrowser onFileSelect={handleFileSelect} />
          </div>
        ) : (
          <div className="space-y-6">
            {validationWarnings.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-1">Validation Warnings</h3>
                    <ul className="text-sm text-orange-800 space-y-1">
                      {validationWarnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">{filename}</h2>
                <p className="text-sm text-muted-foreground">
                  {config.siteBlocks.length} site block(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button onClick={handleClose} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex gap-2 border-b">
              <button
                type="button"
                onClick={() => setViewMode("visualize")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === "visualize"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-4 w-4 inline mr-2" />
                Visualize
              </button>
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === "edit"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="h-4 w-4 inline mr-2" />
                Edit
              </button>
            </div>

            {viewMode === "visualize" ? (
              <CaddyfileVisualizer config={config} />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={handleAddSiteBlock} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Site Block
                  </Button>
                </div>
                <div className="grid gap-4">
                  {config.siteBlocks.map((siteBlock) => (
                    <SiteBlockCard
                      key={siteBlock.id}
                      siteBlock={siteBlock}
                      onEdit={(id) => console.log("Edit site block", id)}
                      onDelete={handleDeleteSiteBlock}
                      onAddDirective={(id) => setAddingDirective(id)}
                      onEditDirective={handleEditDirective}
                      onDeleteDirective={handleDeleteDirective}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <EditDirectiveDialog
        directive={editingDirective?.directive || null}
        open={!!editingDirective}
        onOpenChange={(open) => !open && setEditingDirective(null)}
        onSave={handleSaveDirective}
      />

      <AddDirectiveDialog
        open={!!addingDirective}
        onOpenChange={(open) => !open && setAddingDirective(null)}
        onAdd={handleAddDirective}
      />
    </div>
  );
}

function findDirectiveById(
  directives: CaddyDirective[],
  id: string
): CaddyDirective | null {
  for (const directive of directives) {
    if (directive.id === id) return directive;
    if (directive.block) {
      const found = findDirectiveById(directive.block, id);
      if (found) return found;
    }
  }
  return null;
}

function updateDirectiveById(
  directives: CaddyDirective[],
  id: string,
  updated: CaddyDirective
): CaddyDirective[] {
  return directives.map((directive) => {
    if (directive.id === id) return updated;
    if (directive.block) {
      return {
        ...directive,
        block: updateDirectiveById(directive.block, id, updated),
      };
    }
    return directive;
  });
}

function deleteDirectiveById(
  directives: CaddyDirective[],
  id: string
): CaddyDirective[] {
  return directives
    .filter((directive) => directive.id !== id)
    .map((directive) => {
      if (directive.block) {
        return {
          ...directive,
          block: deleteDirectiveById(directive.block, id),
        };
      }
      return directive;
    });
}

export default App;
