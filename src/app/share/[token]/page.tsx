import { createHash } from "crypto";
import { db } from "@/server/db";
import ShareView from "./share-view";

async function fetchShareLink(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return db.shareLink.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      encryptedBlob: true,
      iv: true,
      entryType: true,
      label: true,
      expiresAt: true,
      viewCount: true,
      maxViews: true,
    },
  });
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const link = await fetchShareLink(rawToken);

  if (!link) {
    return <ExpiredCard reason="not-found" />;
  }

  const expired = link.expiresAt < new Date();
  const limitReached = link.maxViews !== null && link.viewCount >= link.maxViews;

  if (expired || limitReached) {
    return <ExpiredCard reason={expired ? "expired" : "view-limit"} />;
  }

  // Increment view count
  await db.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 } },
  });

  return (
    <ShareView
      rawToken={rawToken}
      encryptedBlob={link.encryptedBlob}
      iv={link.iv}
      entryType={link.entryType}
      label={link.label}
      expiresAt={link.expiresAt.toISOString()}
      viewCount={link.viewCount + 1}
      maxViews={link.maxViews}
    />
  );
}

function ExpiredCard({ reason }: { reason: "not-found" | "expired" | "view-limit" }) {
  const messages = {
    "not-found": {
      title: "Link not found",
      body: "This sharing link doesn't exist or has already been revoked.",
    },
    expired: {
      title: "Link expired",
      body: "This sharing link has expired and is no longer accessible.",
    },
    "view-limit": {
      title: "View limit reached",
      body: "This sharing link has reached its maximum number of views.",
    },
  };

  const { title, body } = messages[reason];

  return (
    <div className="w-full max-w-md rounded-2xl border border-line/60 bg-surface p-8 text-center shadow-sm">
      <div className="text-5xl mb-4 select-none" aria-hidden="true">
        🔒
      </div>
      <h1
        className="text-xl font-semibold text-default mb-2"
        style={{ fontFamily: "var(--font-playfair, serif)" }}
      >
        {title}
      </h1>
      <p className="text-sm text-muted">{body}</p>
    </div>
  );
}
