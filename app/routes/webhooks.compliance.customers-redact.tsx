import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { prisma } from "../../server/db.server";
import { log } from "../../server/logger.server";
import { handleCustomerRedact } from "../../server/services/compliance.server";

/** customers/redact: delete the follow-ups attached to that customer and their orders. 200 even if none. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  const deleted = await handleCustomerRedact(prisma, shop, payload as never);
  log().info({ shop, deleted }, "customer redacted");
  return new Response();
};
