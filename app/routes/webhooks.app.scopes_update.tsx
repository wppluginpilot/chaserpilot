import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { prisma } from "../../server/db.server";

/** Keeps stored sessions' scope in step with what the merchant granted. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session } = await authenticate.webhook(request);
  const current = (payload as { current?: string[] }).current;
  if (session && Array.isArray(current)) {
    await prisma.session.update({ where: { id: session.id }, data: { scope: current.join(",") } });
  }
  return new Response();
};
