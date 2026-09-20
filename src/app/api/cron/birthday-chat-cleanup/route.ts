import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Expired birthday rooms remain available to the birthday person as an
    // archive. Firestore rules hide them from other members after expiry.
    const deleted = 0;

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[cron/birthday-chat-cleanup]", error);
    return NextResponse.json(
      { error: "Birthday chat cleanup is not configured on this server." },
      { status: 503 },
    );
  }
}
