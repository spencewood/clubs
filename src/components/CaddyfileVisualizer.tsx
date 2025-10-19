import { Server, Globe, ArrowRight, FileText, Lock } from "lucide-react";
import type { CaddyConfig } from "@/types/caddyfile";

interface CaddyfileVisualizerProps {
  config: CaddyConfig;
}

export function CaddyfileVisualizer({ config }: CaddyfileVisualizerProps) {
  return (
    <div className="space-y-6">
      {config.siteBlocks.map((block) => {
        // Determine the type of site block
        const isDomain = block.addresses.some((addr) =>
          addr.includes(".") && !addr.startsWith(":"),
        );
        const isPort = block.addresses.some((addr) => addr.startsWith(":"));
        const isLocalhost = block.addresses.some((addr) =>
          addr.startsWith("localhost"),
        );

        // Extract routing information
        const routes: Array<{ path?: string; target?: string; type: string }> =
          [];
        const features: string[] = [];

        for (const directive of block.directives) {
          if (directive.name === "reverse_proxy") {
            const target = directive.args[0] || "unknown";
            routes.push({
              target,
              type: "proxy",
            });
          } else if (directive.name === "handle" && directive.args.length > 0) {
            const path = directive.args[0];
            // Check if there's a reverse_proxy inside this handle block
            const proxyDirective = directive.block?.find(
              (d) => d.name === "reverse_proxy",
            );
            if (proxyDirective) {
              routes.push({
                path,
                target: proxyDirective.args[0],
                type: "proxy",
              });
            }
          } else if (directive.name === "file_server") {
            features.push("Static Files");
          } else if (directive.name === "encode") {
            features.push(`Compression: ${directive.args.join(", ") || "gzip"}`);
          } else if (directive.name === "log") {
            features.push("Logging");
          } else if (directive.name === "tls") {
            features.push("HTTPS/TLS");
          } else if (directive.name === "root") {
            const root = directive.args.slice(1).join(" ");
            features.push(`Root: ${root}`);
          }
        }

        return (
          <div
            key={block.id}
            className="border rounded-lg p-4 bg-card space-y-4"
          >
            {/* Site Address Header */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {isDomain ? (
                  <Globe className="h-5 w-5 text-primary" />
                ) : (
                  <Server className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {block.addresses.map((addr, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-lg font-semibold"
                    >
                      {addr}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isDomain
                    ? "Domain Site"
                    : isLocalhost
                      ? "Localhost"
                      : "Port Binding"}
                </p>
              </div>
            </div>

            {/* Routes */}
            {routes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                  Routes
                </h4>
                <div className="space-y-2">
                  {routes.map((route, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-muted"
                    >
                      {route.path && (
                        <>
                          <span className="font-mono text-sm font-medium">
                            {route.path}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </>
                      )}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Server className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-mono text-sm truncate">
                          {route.target}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                        Proxy
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                  Features
                </h4>
                <div className="flex flex-wrap gap-2">
                  {features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm"
                    >
                      {feature.includes("Root") && (
                        <FileText className="h-3 w-3" />
                      )}
                      {feature.includes("TLS") && <Lock className="h-3 w-3" />}
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Directive Count */}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              {block.directives.length} directive
              {block.directives.length !== 1 ? "s" : ""} total
            </div>
          </div>
        );
      })}

      {config.siteBlocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No site blocks found in this Caddyfile</p>
        </div>
      )}
    </div>
  );
}
