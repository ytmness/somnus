import { prisma } from "@/lib/db/prisma";
import { resolvePublicRegistrationRole } from "@/lib/auth/registration";

export interface SyncedPrismaUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
}

/**
 * Asegura un usuario Prisma para login OAuth (Google/Apple).
 */
export async function ensurePrismaUserFromOAuth(input: {
  email: string;
  name: string;
}): Promise<SyncedPrismaUser> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("El usuario de auth no tiene correo electrónico");
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: input.name.trim() || email.split("@")[0],
        role: resolvePublicRegistrationRole(),
        isActive: true,
        password: "",
        emailVerified: true,
      },
    });
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
  };
}

/** @deprecated Usar ensurePrismaUserFromOAuth */
export const ensurePrismaUserFromAuth = ensurePrismaUserFromOAuth;
