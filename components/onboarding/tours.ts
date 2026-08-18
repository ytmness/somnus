export type TourStep = {
  id: string;
  /** Matches data-tour="<target>" on the page. Omit for centered welcome. */
  target?: string;
  title: string;
  body: string;
};

export const ADMIN_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to the Admin panel",
    body: "This is your control room for events, organizers, staff, and revenue. A short tour will show you the main areas.",
  },
  {
    id: "sidebar",
    target: "admin-sidebar",
    title: "Grouped navigation",
    body: "Tools are organized by job: Events, People, Marketing, Finance, and Advanced. On mobile, open the menu button to reach every section.",
  },
  {
    id: "stats",
    target: "admin-stats",
    title: "Overview landing",
    body: "You land here first. These cards summarize events, tickets sold, active users, and this month’s platform commission.",
  },
  {
    id: "new-event",
    target: "admin-new-event",
    title: "Create an event",
    body: "Start the guided wizard here anytime. You’ll set basics, schedule, ticket types, poster, then review before publishing.",
  },
  {
    id: "explore",
    title: "Explore from the sidebar",
    body: "Open Needs attention or Quick actions on Overview, or pick any group in the sidebar to manage organizers, gallery, invites, revenue, and more.",
  },
];

export const ORGANIZER_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome, organizer",
    body: "Publish events under your brand, manage venues and team, then connect Stripe when you’re ready to get paid.",
  },
  {
    id: "orgs",
    target: "org-organizations",
    title: "Organizations",
    body: "Create at least one organization (your brand). Events are published under an organization.",
  },
  {
    id: "venues",
    target: "org-venues",
    title: "Venues",
    body: "Save venues you reuse so you don’t retype address details every time.",
  },
  {
    id: "team",
    target: "org-team",
    title: "Team roles",
    body: "Invite staff for scanning access, selling, or supervising your events.",
  },
  {
    id: "create-event",
    target: "org-create-event",
    title: "Create event",
    body: "Once Stripe is connected and you have an organization, start the same guided wizard from this button.",
  },
  {
    id: "tabs",
    target: "org-tabs",
    title: "Events & messages",
    body: "Switch between your event list and conversations with attendees or the platform.",
  },
  {
    id: "stripe",
    target: "org-stripe",
    title: "Payments (Stripe)",
    body: "Connect Stripe to receive payouts. You can skip this until you’re ready to sell paid tickets.",
  },
];

export const CLIENT_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Somnus",
    body: "A quick tour of how to find events, buy tickets, and manage your account.",
  },
  {
    id: "view-events",
    target: "client-view-events",
    title: "Browse events",
    body: "Tap View events anytime to jump to the upcoming nights carousel.",
  },
  {
    id: "events",
    target: "client-events",
    title: "Upcoming events",
    body: "Swipe through events, open one, and pick your tickets from there.",
  },
  {
    id: "cart",
    target: "client-cart",
    title: "Your cart",
    body: "Tickets you add appear here. Open the cart to review totals and continue to checkout.",
  },
  {
    id: "bell",
    target: "client-bell",
    title: "Notifications",
    body: "Order updates and event news show up in the bell.",
  },
  {
    id: "profile",
    target: "client-profile",
    title: "Your profile",
    body: "Open your name for My tickets (QR codes after purchase) and Sign out.",
  },
];
