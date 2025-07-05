import { type DefaultSession, type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "~/server/db";
import Resend from "next-auth/providers/resend";
import CredentialsProvider from "next-auth/providers/credentials";
import { createId } from "@paralleldrive/cuid2";
// import { linkAnonymousUser } from "./utils";
import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      isGuest?: boolean;
      email?: string | null;
    } & Omit<DefaultSession["user"], "email">;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    Resend({
      id: "email",
      apiKey: env.AUTH_RESEND_KEY,
      from: env.EMAIL_FROM,
    }),
    CredentialsProvider({
      id: "anonymous",
      name: "Anonymous",
      credentials: {}, // No actual credentials needed for anonymous
      authorize: async () => {
        const user = await db.user.create({
          data: { id: createId(), isGuest: true, email: null, name: null },
        });
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.id = user.id; // User is available during initial sign-in
      return token;
    },
    session: async ({ session, token }) => {
      if (typeof token.id === "string") {
        session.user.id = token.id;
        // Fetch the user from the database to get their latest email status
        // This is crucial for the signIn callback's `currentUser.email` check
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { email: true, isGuest: true },
        });
        // Type-safe assignment of custom properties
        const userWithExtras = session.user as typeof session.user & {
          email?: string;
          isGuest?: boolean;
        };
        userWithExtras.email = dbUser?.email ?? "";
        userWithExtras.isGuest = !!(dbUser?.isGuest ?? false); // Augment session with isGuest
      }
      return session;
    },
    signIn: async ({ user, account }) => {
      // For anonymous sign-in, we need to check if there's already a non-anonymous session
      if (account?.provider === "anonymous") {
        // This is a simplified approach - in practice, we'd need the request context
        return true;
      }

      // For email sign-in, check if current user is anonymous and link data
      if (account?.provider === "email" && user.email) {
        // We need to get the current session user to check if they're anonymous
        // This is a limitation of the signIn callback - we don't have direct access to current session
        // For now, we'll handle the linking in the session callback or a separate API route
        return true;
      }

      return true;
    },
  },
  debug: env.NODE_ENV === "development",
};
