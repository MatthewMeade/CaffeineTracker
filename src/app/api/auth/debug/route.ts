import { type NextRequest } from "next/server";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  return Response.json({
    email: {
      from: env.EMAIL_FROM,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    },
    nodeEnv: process.env.NODE_ENV,
    hasAuthSecret: !!env.AUTH_SECRET,
    providers: ["http-email"],
  });
} 