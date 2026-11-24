/**
 * customers/data_request. ChaserPilot holds, for a customer, only the follow-ups
 * a merchant attached to that customer or their orders (title, notes, label,
 * dates). They are looked up and logged; the merchant receives them on request
 * from support. Always answers 200.
 */
import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { prisma } from "../../server/db.server";
import { log } from "../../server/logger.server";
import { handleDataRequest } from "../../server/services/compliance.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  const found = await handleDataRequest(prisma, shop, payload as never);
  log().info({ shop, records: found.length }, "customer data request received");
  return new Response();
};
