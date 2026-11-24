# ChaserPilot listing copy

App name: ChaserPilot: Follow-up Tasks
Introduction (under 100 chars): Add a follow-up to any order or customer and work one due-today list.

App details (no pricing text):
Promised a customer a deposit reminder, a delivery check or a review request? ChaserPilot puts a follow-up with a due date on the order or customer page in Shopify admin and collects them into one queue: overdue, today, this week. Mark one done, snooze it, or let it repeat. Built for small stores that make custom orders, preorders and wholesale deals and do not want a heavy CRM. ChaserPilot reads only the order number and customer ID it needs to link a follow-up, and never reads customer names, emails or addresses.

Feature bullets:
1. Add follow-up action and Follow-ups block on order and customer pages
2. One queue: Overdue, Today, This week, Later, with assignee and tag filters
3. One-click Done and Snooze, with an activity history on every task
4. Recurring follow-ups, reusable templates and a Today view of what is due, with optional daily email
5. CSV export of finished follow-ups; reads only order numbers and customer IDs

Search terms: follow-up tasks, order reminders, customer follow-up, due today list, order to-do
Category: Store management

Partner pricing plans (Partner form only): exactly two.
1. Free, $0, "Up to 25 open follow-ups"
2. Paid, Monthly recurring, $9.95, trial days 0, "Unlimited follow-ups, assignees, recurring follow-ups, templates, Today digest view with optional daily email, CSV export" (the in-app plan page says "Daily digest email"; the daily email is not live yet, MAIL_PROVIDER unset, so the Partner text should match the code text or the code text should be changed to the same wording before submit)

Reviewer testing instructions:
Install on a development store; no setup needed. Open the app from Apps; the Free plan is active by default. To add the block: open any order or customer page, click + Block in the Blocks area and choose Follow-ups, then pin it. Open any order, click More actions > Add follow-up, save; the Follow-ups block on that page lists it. The queue is the app's home page. For paid features open Plan > Upgrade to Paid (templates, assignees, recurring, CSV); review-store charges are test charges and the app checks them with isTest. The Free plan allows 25 open follow-ups. The app has no storefront component. Data used: order number and customer ID only (protected data Level 1).

Assets: app icon brand/out/app-icon-1200.png. Screenshots 1600x900 and screencast: Publisher/Tester stage.


Assets (done 2026-11-24)
- Icon: brand/out/app-icon-1200.png (regenerated: the repo still had AreaPilot artwork, fixed in commit 949da17)
- Screenshots 1600x900: brand/listing/out/1-queue.png ... 6-plan.png (builder: brand/listing/make_slides.py)
- Screencast MP4 (69 s, captions only): brand/listing/screencast/build/chaserpilot-screencast.mp4
- YouTube (unlisted): https://youtu.be/UCs1a-DNuIQ
- URLs: https://chaserpilot.onrender.com/privacy /terms /support /docs
- Emergency contact / support: support@wppluginpilot.com
