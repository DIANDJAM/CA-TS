import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { getShopify } from "../shopify.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await getShopify(context).authenticate.admin(request);

  return null;
};
