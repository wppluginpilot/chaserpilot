import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { prisma } from "../../server/db.server";
import { log } from "../../server/logger.server";
import { redactShop } from "../../server/services/shop.server";

/** shop/redact (48h after uninstall): erase everything held for the shop. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);
  await redactShop(prisma, shop);
  log().info({ shop }, "shop redacted");
  return new Response();
};
