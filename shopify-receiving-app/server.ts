// Cloudflare Workers entry point. Static assets are served by the ASSETS
// binding (configured in wrangler.toml) before the Worker runs, so this
// handler only sees document/data/API requests.
import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
import type { ExecutionContext } from "@cloudflare/workers-types";
// eslint-disable-next-line import/no-unresolved -- virtual module emitted by `remix vite:build`
import * as build from "./build/server";

const handleRequest = createRequestHandler(build as unknown as ServerBuild);

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return handleRequest(request, { cloudflare: { env, ctx } });
  },
};
