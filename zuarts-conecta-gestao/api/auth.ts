import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "./db.js";

const baseURL = process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  appName: "ZUARTS SISTEMA DE GESTÃO",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: baseURL ? [baseURL] : [],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      console.warn(
        `[zuarts] Provedor de e-mail nao configurado. Link de confirmacao para ${user.email}: ${url}`,
      );
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-zuarts-client-ip"],
    },
    database: {
      generateId: "uuid",
    },
  },
});
