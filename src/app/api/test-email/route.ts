import { type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Create a test transporter
    const transporter = nodemailer.createTransport({
      host: env.EMAIL_SERVER_HOST,
      port: env.EMAIL_SERVER_PORT,
      secure: false, // Start with unencrypted connection
      auth: {
        user: env.EMAIL_SERVER_USER,
        pass: env.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      debug: true,
      logger: true,
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Test Email",
      text: "This is a test email to verify SendGrid connection.",
    });

    return Response.json({
      success: true,
      messageId: info.messageId,
      preview: nodemailer.getTestMessageUrl(info),
    });
  } catch (error) {
    console.error("Test email error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
} 