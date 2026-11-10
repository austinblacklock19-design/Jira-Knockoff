import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { db } from "./db";

export const devLoginEnabled =
  process.env.ALLOW_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

export const microsoftLoginEnabled = Boolean(
  process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID,
);

const providers: NextAuthOptions["providers"] = [];

if (microsoftLoginEnabled) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  );
}

if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Developer login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        if (!email) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "azure-ad") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Anyone in the company's Microsoft tenant can sign in; first sign-in creates their account.
      const existing = await db.user.findUnique({ where: { email } });
      if (existing && !existing.active) return false;
      const isFirstUser = (await db.user.count()) === 0;
      await db.user.upsert({
        where: { email },
        update: { name: user.name ?? existing?.name ?? email },
        create: { email, name: user.name ?? email, role: isFirstUser ? "ADMIN" : "MEMBER" },
      });
      return true;
    },
    async jwt({ token }) {
      if (token.email && !token.uid) {
        const u = await db.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (u) token.uid = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
};

/** Returns the signed-in user from the database, or redirects to the login page. */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/login");
  const user = await db.user.findUnique({ where: { id } });
  if (!user || !user.active) redirect("/login");
  return user;
}
