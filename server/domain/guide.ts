/**
 * Help content, written once and rendered by the admin Help page and the
 * public /docs page. Shared labels live in server/domain/ so component code
 * never imports a .server module.
 */
import { FREE_OPEN_LIMIT, PLAN_PRICE } from "./plan";

export interface GuideSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  steps?: string[];
}

export const APP_VERSION = "1.0.0";

export const GUIDE: GuideSection[] = [
  {
    id: "start",
    heading: "Getting started in 3 steps",
    steps: [
      "Add your first follow-up from the Follow-ups page (Add follow-up), or open any order in Shopify and choose More actions > Add follow-up.",
      "Open an order and find the Follow-ups block. If you don't see it, open the page's block settings in Shopify and add ChaserPilot's Follow-ups block.",
      "Work your queue every morning: Overdue first, then Today. Mark things Done or Snooze them. On the Paid plan, use the Today digest view and optionally turn on the daily email in Settings.",
    ],
  },
  {
    id: "extensions",
    heading: "The Add follow-up action and the Follow-ups block",
    paragraphs: [
      "On every order and customer page in Shopify admin, More actions > Add follow-up opens a small form: title, due date, notes and tags (assignee and template on the Paid plan). The follow-up is attached to that order or customer automatically.",
      "The Follow-ups block on the same pages lists the open follow-ups for that order or customer with Done and Snooze buttons, plus the last three finished ones.",
      "Draft order pages are not supported in this version.",
    ],
  },
  {
    id: "queue",
    heading: "The queue",
    paragraphs: [
      "Follow-ups are grouped into Overdue, Today, This week (the next 7 days), Later and Done (the last 30 days). Filter by assignee, tag, order, customer or text. Done removes a row at once and the counts update.",
      "Snooze moves the due date to tomorrow, in 3 days, next Monday or a date you pick, counted from today. Every change is recorded in the activity list on the follow-up's page.",
    ],
  },
  {
    id: "recurring",
    heading: "Recurring follow-ups (Paid)",
    paragraphs: [
      "A follow-up can repeat every N days, weekly on a weekday or monthly on a day of the month (31 becomes the last day of shorter months). When you mark it done, the next one is created automatically, on the next date after the one you just finished that is today or later, so finishing late never creates a pile of missed ones. Use Stop repeating on the follow-up's page to end the series.",
    ],
  },
  {
    id: "templates",
    heading: "Templates (Paid)",
    paragraphs: [
      "A template stores a title, a number of days until due, tags and notes. Pick one when adding a follow-up. We start you with Chase deposit (3 days), Check delivery (7 days) and Ask for review (14 days); edit or delete them freely. Deleting a template never changes follow-ups you already made.",
    ],
  },
  {
    id: "digest",
    heading: "Today digest view, with optional daily email (Paid)",
    paragraphs: [
      "Once a day, at the hour you choose in your store's timezone, ChaserPilot emails your store owner address (and one optional extra address) a list of what is overdue and due today. Nothing is sent on days when nothing is due. Every email has a link to turn the digest off.",
      "If email isn't available, the Today page in the app shows the same list.",
    ],
  },
  {
    id: "export",
    heading: "CSV export (Paid)",
    paragraphs: ["Settings > Export downloads your follow-ups as a CSV file: id, title, subject type, subject label, order name, assignee, tags, due date, completed date and notes."],
  },
  {
    id: "data",
    heading: "What data does ChaserPilot read?",
    paragraphs: [
      "Only the order number (for example #1043) of an order you attach a follow-up to, and the ID of a customer you attach one to. ChaserPilot never reads customer names, emails, phone numbers or addresses, and no order lines, prices or notes. What you type into a follow-up (title, notes, label) is stored so you can see it again; please don't paste card numbers or health data into notes.",
    ],
  },
  {
    id: "old-orders",
    heading: "Orders older than 60 days",
    paragraphs: [
      "Shopify only lets ChaserPilot look up the number of orders from the last 60 days. For an older order the follow-up is still created and linked, but it shows as \"Order\" instead of the order number. Type a label such as the customer's first name or the product to recognise it.",
    ],
  },
  {
    id: "plans",
    heading: "Free and Paid",
    paragraphs: [
      `Free: up to ${FREE_OPEN_LIMIT} open follow-ups, the queue, the order and customer actions and blocks, snooze and tags. Finished follow-ups don't count.`,
      `Paid: $${PLAN_PRICE.toFixed(2)} every 30 days, billed by Shopify. Unlimited open follow-ups, assignees, recurring follow-ups, templates, the Today digest view, with optional daily email, and CSV export.`,
      "If you go back to Free, everything is kept; repeating follow-ups stop creating new ones and the digest turns off.",
    ],
  },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Can I see customer names in the queue?", a: "No. Shopify classes names as protected data and ChaserPilot deliberately doesn't ask for it. For a customer follow-up you can type a label (for example the first name) and the queue shows a link that opens the customer in Shopify." },
  { q: "Why does my order show as \"Order\" instead of #1043?", a: "The order is older than 60 days, which is how far back Shopify lets the app look. Add a label to the follow-up so you recognise it." },
  { q: "What happens to my follow-ups if I uninstall?", a: "They are kept for 48 hours in case you reinstall, then deleted. See the privacy policy." },
  { q: "Is there a contract or a longer commitment?", a: "No. Free stays free, and Paid is billed month to month by Shopify. You can switch back to Free from the Plan page at any time." },
];
