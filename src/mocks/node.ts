// MSW for server-side (Next.js API routes)
// We need to import from the compiled files directly because Next.js bundler
// doesn't resolve MSW's package.json exports correctly in instrumentation context
import { setupServer } from "../../node_modules/msw/lib/native/index.mjs";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
