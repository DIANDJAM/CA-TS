import type { AppLoadContext } from "@remix-run/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * Bindings and vars this Worker expects. Secrets/vars are also mirrored onto
 * process.env by the nodejs_compat flag, but the D1 binding is only reachable
 * through the request context.
 */
export interface WorkerEnv {
  DB: D1Database;
  SHOPIFY_API_KEY?: string;
  SHOPIFY_API_SECRET?: string;
  SHOPIFY_APP_URL?: string;
  SCOPES?: string;
  SHOP_CUSTOM_DOMAIN?: string;
  PRINTNODE_API_KEY?: string;
  PRINTNODE_PRINTER_ID?: string;
}

/**
 * Resolve the environment for a request. Worker bindings win; process.env
 * fills the gaps so `shopify app dev` (which injects config as process env
 * vars into the Vite dev server) works without copying anything to .dev.vars.
 */
export function resolveEnv(context: AppLoadContext): WorkerEnv {
  const fromBindings =
    (context as { cloudflare?: { env?: Partial<WorkerEnv> } }).cloudflare
      ?.env ?? {};
  const fromProcess =
    typeof process !== "undefined"
      ? (process.env as Partial<WorkerEnv>)
      : ({} as Partial<WorkerEnv>);

  const merged: Record<string, unknown> = { ...fromProcess, ...fromBindings };
  // Prefer a non-empty value: wrangler.toml [vars] placeholders are "".
  for (const key of Object.keys(merged)) {
    const fallback = (fromProcess as Record<string, unknown>)[key];
    if (merged[key] === "" && fallback) {
      merged[key] = fallback;
    }
  }
  return merged as unknown as WorkerEnv;
}
