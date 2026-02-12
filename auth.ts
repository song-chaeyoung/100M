import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { authConfig } from "./auth.config";
import { db } from "./db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  goals,
} from "./db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true, // localhost 및 프록시 환경에서 필요
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
      }
      if (trigger === "signUp") {
        try {
          await db.insert(goals).values({
            userId: user.id!,
            startDate: new Date().toISOString().split("T")[0],
            initialAmount: "0",
            targetAmount: "100000000",
            isActive: true,
          });
        } catch (error) {
          console.error("Failed to create initial goal on signUp:", error);
        }
      }
      return token;
    },
  },
});
