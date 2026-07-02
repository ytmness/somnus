import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/payments/stripe";
import type { Organizer } from "@prisma/client";

export type OrganizerStripeStatus = {
  stripeAccountId: string | null;
  stripeOnboardingStatus: Organizer["stripeOnboardingStatus"];
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  isReady: boolean;
};

/**
 * Sincroniza el estado de onboarding de un organizador desde Stripe.
 */
export async function syncOrganizerStripeStatus(
  organizerId: string
): Promise<OrganizerStripeStatus> {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
  });

  if (!organizer) {
    throw new Error("Organizador no encontrado");
  }

  if (!organizer.stripeAccountId) {
    return {
      stripeAccountId: null,
      stripeOnboardingStatus: organizer.stripeOnboardingStatus,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      isReady: false,
    };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(organizer.stripeAccountId);

  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const requirementsDue = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ];

  let onboardingStatus: Organizer["stripeOnboardingStatus"] = "PENDING";
  if (chargesEnabled && payoutsEnabled) {
    onboardingStatus = "ACTIVE";
  } else if (requirementsDue.length > 0) {
    onboardingStatus = "RESTRICTED";
  }

  await prisma.organizer.update({
    where: { id: organizerId },
    data: {
      chargesEnabled,
      payoutsEnabled,
      stripeOnboardingStatus: onboardingStatus,
    },
  });

  return {
    stripeAccountId: organizer.stripeAccountId,
    stripeOnboardingStatus: onboardingStatus,
    chargesEnabled,
    payoutsEnabled,
    requirementsDue,
    isReady: chargesEnabled && payoutsEnabled,
  };
}

/**
 * Crea una cuenta conectada Stripe (Connect) para un organizador.
 */
export async function createConnectedAccount(
  organizerId: string
): Promise<string> {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    include: { user: true },
  });

  if (!organizer) {
    throw new Error("Organizador no encontrado");
  }

  if (organizer.stripeAccountId) {
    return organizer.stripeAccountId;
  }

  const stripe = getStripe();

  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "MX",
      email: organizer.contactEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        organizerId: organizer.id,
        userId: organizer.userId,
        source: "somnus.live",
      },
    });

    await prisma.organizer.update({
      where: { id: organizerId },
      data: {
        stripeAccountId: account.id,
        stripeOnboardingStatus: "PENDING",
      },
    });

    return account.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("signed up for Connect")) {
      const e = new Error(
        "Stripe Connect no está activado en la cuenta de Somnus. El administrador debe activarlo en dashboard.stripe.com/connect"
      );
      (e as Error & { code: string }).code = "STRIPE_CONNECT_NOT_ENABLED";
      throw e;
    }
    throw err;
  }
}

/**
 * Genera un Account Link para onboarding de Stripe Connect.
 */
export async function createAccountLink(
  stripeAccountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

/**
 * Valida que el organizador de un evento pueda recibir pagos.
 */
export async function assertOrganizerCanReceivePayments(
  eventId: string
): Promise<{ organizerId: string; stripeAccountId: string } | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organizer: true },
  });

  if (!event?.organizerId || !event.organizer) {
    return null;
  }

  const status = await syncOrganizerStripeStatus(event.organizerId);

  if (!status.isReady || !status.stripeAccountId) {
    throw new Error(
      "El organizador de este evento aún no ha completado la configuración de pagos con Stripe."
    );
  }

  return {
    organizerId: event.organizerId,
    stripeAccountId: status.stripeAccountId,
  };
}
