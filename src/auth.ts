import NextAuth from "next-auth";
import { authOptions } from "~/server/auth/config";

export const { auth, signIn, signOut, handlers } = NextAuth(authOptions); 