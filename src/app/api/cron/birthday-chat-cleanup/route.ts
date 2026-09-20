import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb(getAdminApp());
    const now = new Date();
    const snapshot = await db
      .collection('chats')
      .where('kind', '==', 'birthday')
      .where('expiresAt', '<=', now)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach((chat) => batch.update(chat.ref, { archived: true }));
    if (!snapshot.empty) await batch.commit();

    return NextResponse.json({ archived: snapshot.size });
  } catch (error) {
    console.error("[cron/birthday-chat-cleanup]", error);
    return NextResponse.json(
      { error: "Birthday chat cleanup is not configured on this server." },
      { status: 503 },
    );
  }
}
