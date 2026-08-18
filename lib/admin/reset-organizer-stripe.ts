import { prisma } from "@/lib/db/prisma";

export interface ResetOrganizerStripeResult {
  organizerId: string;
  businessName: string;
  previousStripeAccountId: string | null;
}

/**
 * Resetea los campos Stripe de un organizador en la BD.
 * No elimina la cuenta Express en Stripe; el organizador debe re-hacer onboarding.
 */
export async function resetOrganizerStripe(
  organizerId: string
): Promise<ResetOrganizerStripeResult> {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: {
      id: true,
      businessName: true,
      stripeAccountId: true,
    },
  });

  if (!organizer) {
    throw new Error("Organizador no encontrado");
  }

  const previousStripeAccountId = organizer.stripeAccountId;

  await prisma.organizer.update({
    where: { id: organizerId },
    data: {
      stripeAccountId: null,
      stripeOnboardingStatus: "NOT_STARTED",
      chargesEnabled: false,
      payoutsEnabled: false,
    },
  });

  return {
    organizerId: organizer.id,
    businessName: organizer.businessName,
    previousStripeAccountId,
  };
}

/**
 * Resetea Stripe de todos los organizadores con cuenta conectada.
 */
export async function resetAllOrganizersStripe(): Promise<number> {
  const result = await prisma.organizer.updateMany({
    where: { stripeAccountId: { not: null } },
    data: {
      stripeAccountId: null,
      stripeOnboardingStatus: "NOT_STARTED",
      chargesEnabled: false,
      payoutsEnabled: false,
    },
  });
  return result.count;
}
