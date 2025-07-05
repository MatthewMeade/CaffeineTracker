import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { linkAnonymousUser } from "~/server/auth/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: "Not authenticated", code: "UNAUTHORIZED" } },
        { status: 401 },
      );
    }

    // Get the previous session ID from the request parameters
    const previousSessionId =
      request.nextUrl.searchParams.get("previousSessionId");

    if (!previousSessionId) {
      return NextResponse.json(
        {
          error: {
            message: "No previous session ID provided",
            code: "MISSING_SESSION_ID",
          },
        },
        { status: 400 },
      );
    }

    // Link the anonymous user data to the new authenticated user
    await linkAnonymousUser(previousSessionId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error linking guest user:", error);
    return NextResponse.json(
      { error: { message: "Failed to link guest data", code: "LINK_FAILED" } },
      { status: 500 },
    );
  }
}
