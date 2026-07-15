import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { getShopify } from "../shopify.server";
import { db } from "../db.server";

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } =
    await getShopify(context).authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const current = payload.current as string[];
  if (session) {
    await db().session.update({
      where: { id: session.id },
      data: { scope: current.toString() },
    });
  }

  return new Response();
};
