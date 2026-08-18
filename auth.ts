import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { createPrivateKey } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { ensurePrismaUserFromOAuth } from "@/lib/auth/sync-user";
import { hashToken } from "@/lib/services/email";
import type { Provider } from "next-auth/providers";

async function buildAppleClientSecret(): Promise<string | null> {
  if (process.env.APPLE_SECRET) return process.env.APPLE_SECRET;
  const {
    APPLE_ID,
    APPLE_TEAM_ID,
    APPLE_KEY_ID,
    APPLE_PRIVATE_KEY,
  } = process.env;
  if (!APPLE_ID || !APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    return null;
  }
  const key = createPrivateKey(
    APPLE_PRIVATE_KEY.replace(/\\n/g, "\n")
  );
  return new SignJWT({})
    .setAudience("https://appleid.apple.com")
    .setIssuer(APPLE_TEAM_ID)
    .setSubject(APPLE_ID)
    .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(key);
}

function buildProviders(appleSecret: string | null): Provider[] {
  const list: Provider[] = [
    Credentials({
      id: "credentials",
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otpCode: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        if (!email) return null;

        const otpCode = credentials?.otpCode
          ? String(credentials.otpCode).trim()
          : "";
        const password = credentials?.password
          ? String(credentials.password)
          : "";

        if (otpCode) {
          const codeHash = hashToken(otpCode);
          const record = await prisma.otpCode.findFirst({
            where: {
              email,
              codeHash,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
          });
          if (!record) return null;

          await prisma.otpCode.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
          });

          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: email.split("@")[0],
                role: "CLIENTE",
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

          if (!user.isActive) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        if (!password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive || !user.password || !user.emailVerified) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  if (process.env.APPLE_ID && appleSecret) {
    list.push(
      Apple({
        clientId: process.env.APPLE_ID,
        clientSecret: appleSecret,
      })
    );
  }

  return list;
}

const appleSecretPromise = buildAppleClientSecret();

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const appleSecret = await appleSecretPromise;
  return {
    // Evita choque con /api/auth/login|session|logout propios de la app
    basePath: "/api/authjs",
    providers: buildProviders(appleSecret),
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
    secret: process.env.AUTH_SECRET || process.env.JWT_SECRET,
    trustHost: true,
    pages: {
      signIn: "/login",
      error: "/login",
    },
    callbacks: {
      async signIn({ user, account, profile }) {
        if (account?.provider === "google" || account?.provider === "apple") {
          const email =
            user.email?.trim().toLowerCase() ||
            (typeof profile?.email === "string"
              ? profile.email.trim().toLowerCase()
              : "");
          if (!email) return false;
          const synced = await ensurePrismaUserFromOAuth({
            email,
            name: user.name || email.split("@")[0],
          });
          if (!synced.isActive) return "/login?error=account_inactive";
          user.id = synced.id;
          (user as { role?: string }).role = synced.role;
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.uid = user.id;
          token.role = (user as { role?: string }).role;
          token.email = user.email;
          token.name = user.name;
        }

        if (token.email && !token.uid) {
          const dbUser = await prisma.user.findUnique({
            where: { email: String(token.email).toLowerCase() },
          });
          if (dbUser) {
            token.uid = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = String(token.uid || token.sub || "");
          (session.user as { role?: string }).role = String(token.role || "");
        }
        return session;
      },
    },
  };
});
