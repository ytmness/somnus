import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
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

function resolveNameFromAuth(authUser: SupabaseAuthUser, email: string): string {
  const meta = authUser.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  if (fullName.trim()) return fullName.trim();
  return email.split("@")[0];
}

/**
 * Asegura que exista un usuario Prisma para la sesión de Supabase Auth.
 * Crea uno nuevo (ORGANIZER) si es primer login OAuth/registro social.
 */
export async function ensurePrismaUserFromAuth(
  authUser: SupabaseAuthUser
): Promise<SyncedPrismaUser> {
  const email = authUser.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("El usuario de auth no tiene correo electrónico");
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: resolveNameFromAuth(authUser, email),
        role: resolvePublicRegistrationRole(),
        isActive: true,
        password: "",
        emailVerified: true,
      } as any,
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
  }

  if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true } as any,
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
