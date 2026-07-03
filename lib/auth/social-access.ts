import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/supabase-auth";
import { userOwnsOrganization } from "@/lib/auth/event-access";

export async function userCanAccessConversation(
  user: SessionUser,
  conversationId: string
): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      participantUserId: true,
      organizationId: true,
      organization: { select: { organizer: { select: { userId: true } } } },
    },
  });

  if (!conversation) return false;
  if (user.role === "ADMIN") return true;
  if (conversation.participantUserId === user.id) return true;
  return conversation.organization.organizer.userId === user.id;
}

export async function userCanMessageAsOrganization(
  user: SessionUser,
  organizationId: string
): Promise<boolean> {
  return userOwnsOrganization(user, organizationId);
}

export async function getConversationCounterpartyUserId(
  user: SessionUser,
  conversation: {
    participantUserId: string;
    organization: { organizer: { userId: string } };
  }
): Promise<string> {
  if (conversation.participantUserId === user.id) {
    return conversation.organization.organizer.userId;
  }
  return conversation.participantUserId;
}
