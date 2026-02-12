import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPage = ["/login", "/terms", "/privacy"].includes(
        nextUrl.pathname,
      );

      if (isPublicPage) {
        if (isLoggedIn && nextUrl.pathname === "/login")
          return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
