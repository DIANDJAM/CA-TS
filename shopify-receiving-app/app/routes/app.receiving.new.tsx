import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createSession } from "../services/receiving.server";

/**
 * Creating a session is a single step, so this route just creates one with a
 * timestamped default name and drops the user into the scan screen.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const name = `Receiving ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
  const receivingSession = await createSession(session.shop, name);

  throw redirect(`/app/receiving/${receivingSession.id}`);
};
