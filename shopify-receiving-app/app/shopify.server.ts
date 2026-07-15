// Runtime adapter for Cloudflare Workers (sets up fetch/crypto abstractions
// used by the Shopify SDK). workerd and the Vite dev server both satisfy it.
import "@shopify/shopify-api/adapters/cf-worker";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { initDb } from "./db.server";
import { resolveEnv } from "./env.server";

export const apiVersion = ApiVersion.January25;

type ShopifyAppInstance = ReturnType<typeof shopifyApp>;

let shopify: ShopifyAppInstance | undefined;

/**
 * Build (once per isolate) the configured Shopify app from the request
 * context. On Workers, secrets and the D1 binding arrive with the request
 * rather than existing at module scope, so this replaces the usual
 * module-level `const shopify = shopifyApp(...)` from the Node template.
 */
export function getShopify(context: AppLoadContext): ShopifyAppInstance {
  if (shopify) return shopify;

  const env = resolveEnv(context);
  const prisma = initDb(env.DB);

  shopify = shopifyApp({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET || "",
    apiVersion,
    scopes: env.SCOPES?.split(","),
    appUrl: env.SHOPIFY_APP_URL || "",
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
    distribution: AppDistribution.AppStore,
    future: {
      unstable_newEmbeddedAuthStrategy: true,
      removeRest: true,
    },
    ...(env.SHOP_CUSTOM_DOMAIN
      ? { customShopDomains: [env.SHOP_CUSTOM_DOMAIN] }
      : {}),
  });

  return shopify;
}
