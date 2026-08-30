import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getAppUrl, isStripeEnabled } from "@/lib/payments/config";
import { getStripe } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/memberships/subscribe { planId }
 * Crea Checkout Session de Stripe si está configurado;
 * si no, crea OrgMembership ACTIVE con subscription id stub (dev).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const planId = typeof body.planId === "string" ? body.planId : "";
    if (!planId) {
      return NextResponse.json({ error: "planId requerido" }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: {
        organization: { select: { id: true, slug: true, name: true, isActive: true } },
      },
    });

    if (!plan || !plan.isActive || !plan.organization.isActive) {
      return NextResponse.json({ error: "Plan no disponible" }, { status: 404 });
    }

    const existing = await prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: plan.organizationId,
        },
      },
    });

    if (existing?.status === "ACTIVE") {
      return NextResponse.json({
        success: true,
        data: { membership: existing, alreadyActive: true },
      });
    }

    const periodEnd = new Date();
    if (plan.interval === "year") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    if (isStripeEnabled() && plan.priceCents > 0) {
      try {
        const stripe = getStripe();
        const appUrl = getAppUrl().replace(/\/$/, "");
        let priceId = plan.stripePriceId;

        if (!priceId) {
          const product =
            plan.stripeProductId
              ? await stripe.products.retrieve(plan.stripeProductId)
              : await stripe.products.create({
                  name: `${plan.organization.name} · ${plan.name}`,
                  metadata: {
                    membershipPlanId: plan.id,
                    organizationId: plan.organizationId,
                  },
                });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: plan.priceCents,
            currency: plan.currency.toLowerCase(),
            recurring: {
              interval: plan.interval === "year" ? "year" : "month",
            },
            metadata: { membershipPlanId: plan.id },
          });
          priceId = price.id;
          await prisma.membershipPlan.update({
            where: { id: plan.id },
            data: {
              stripeProductId: product.id,
              stripePriceId: price.id,
            },
          });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${appUrl}/organizaciones/${plan.organization.slug}/membresias?subscribed=1`,
          cancel_url: `${appUrl}/organizaciones/${plan.organization.slug}/membresias?canceled=1`,
          customer_email: user.email,
          metadata: {
            userId: user.id,
            planId: plan.id,
            organizationId: plan.organizationId,
          },
          subscription_data: {
            metadata: {
              userId: user.id,
              planId: plan.id,
              organizationId: plan.organizationId,
            },
          },
        });

        // Pre-create / upsert membership as ACTIVE for UX; webhook can refine later.
        // For incomplete Stripe wiring, mark ACTIVE with stub if no session id.
        const membership = await prisma.orgMembership.upsert({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: plan.organizationId,
            },
          },
          create: {
            userId: user.id,
            organizationId: plan.organizationId,
            planId: plan.id,
            status: "ACTIVE",
            stripeSubscriptionId: `pending_${session.id}`,
            currentPeriodEnd: periodEnd,
          },
          update: {
            planId: plan.id,
            status: "ACTIVE",
            stripeSubscriptionId: `pending_${session.id}`,
            currentPeriodEnd: periodEnd,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            checkoutUrl: session.url,
            membership,
          },
        });
      } catch (stripeErr) {
        console.error("[memberships subscribe] Stripe fallback:", stripeErr);
        // fall through to stub
      }
    }

    const stubId = `dev_sub_${crypto.randomBytes(8).toString("hex")}`;
    const membership = await prisma.orgMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: plan.organizationId,
        },
      },
      create: {
        userId: user.id,
        organizationId: plan.organizationId,
        planId: plan.id,
        status: "ACTIVE",
        stripeSubscriptionId: stubId,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        status: "ACTIVE",
        stripeSubscriptionId: stubId,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      data: { membership, stub: true },
    });
  } catch (error) {
    console.error("[memberships subscribe]", error);
    return NextResponse.json(
      { error: "Error al suscribirse" },
      { status: 500 }
    );
  }
}
