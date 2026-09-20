import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { getAdminApp, getAdminDb, getAdminStorage } from "@/lib/firebase-admin";

const BATCH_LIMIT = 50;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const app = getAdminApp();
    const db = getAdminDb(app);
    const storage = getAdminStorage(app);
    const snapshot = await db
      .collection("chats")
      .where("expiresAt", "<=", new Date())
      .orderBy("expiresAt")
      .limit(BATCH_LIMIT)
      .get();

    let deleted = 0;
    for (const chat of snapshot.docs.filter((item) => item.get("kind") === "birthday")) {
      const messages = await chat.ref.collection("messages").listDocuments();
      for (let index = 0; index < messages.length; index += 400) {
        const batch = db.batch();
        messages.slice(index, index + 400).forEach((message) => batch.delete(message));
        if (index + 400 >= messages.length) batch.delete(chat.ref);
        await batch.commit();
      }
      if (messages.length === 0) await chat.ref.delete();
      await storage.bucket().deleteFiles({ prefix: `chats/${chat.id}/` });
      deleted += 1;
    }

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[cron/birthday-chat-cleanup]", error);
    return NextResponse.json(
      { error: "Birthday chat cleanup is not configured on this server." },
      { status: 503 },
    );
  }
}
