import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_KEY = process.env.GEMINI_API_KEY!;
const CLOUD_NAME = "duhsqezo3";

// ─── Retention cleanup ───────────────────────────────────────────────────────
// Keep only the N most recent simulations. Supabase `created_at` is the source
// of truth; anything older than the newest N is removed from Cloudinary and
// from Supabase.
//
// DRY RUN: while CLEANUP_DRY_RUN is true nothing is deleted — the route only
// logs what it *would* remove. Flip to false (or set CLEANUP_DRY_RUN=false in
// the environment) once the logs look right.
const KEEP_MOST_RECENT = 20;
const CLEANUP_DRY_RUN = process.env.CLEANUP_DRY_RUN !== "false";

// Turn a Cloudinary delivery URL into the public_id the Admin API expects.
//   https://res.cloudinary.com/<cloud>/video/upload/v123/folder/name.mp4
//     -> folder/name
export function extractPublicId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("cloudinary.com")) return null;
    // Path: /<cloud>/video/upload/[transformations/]v<version>/<public_id>.<ext>
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;
    let rest = parts.slice(uploadIdx + 1);
    // Everything before the version segment is transformations — drop it.
    const versionIdx = rest.findIndex((p) => /^v\d+$/.test(p));
    if (versionIdx !== -1) rest = rest.slice(versionIdx + 1);
    if (!rest.length) return null;
    // Strip the file extension, then decode percent-escapes (Cloudinary's
    // Admin API expects the raw public_id, not the URL-encoded form).
    const joined = rest.join("/").replace(/\.[^./]+$/, "");
    return decodeURIComponent(joined);
  } catch {
    return null;
  }
}

async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) {
    console.warn("CLEANUP: missing CLOUDINARY_API_KEY/SECRET — skipping Cloudinary delete");
    return false;
  }
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload?public_ids[]=${encodeURIComponent(publicId)}`,
    { method: "DELETE", headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("CLEANUP: Cloudinary delete failed", publicId, res.status, body.slice(0, 200));
    return false;
  }
  return true;
}

// Server-side Supabase client (lib/supabase.ts is client-only).
function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service-role key so deletes aren't blocked by RLS; fall back to anon.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function cleanupOldSimulations() {
  const supabase = serverSupabase();
  if (!supabase) {
    console.warn("CLEANUP: no Supabase credentials — skipping");
    return;
  }

  const { data, error } = await supabase
    .from("simulations")
    .select("id, video_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("CLEANUP: Supabase query failed:", error.message);
    return;
  }
  const rows = data ?? [];
  const stale = rows.slice(KEEP_MOST_RECENT);

  console.log(
    `CLEANUP: ${rows.length} simulations total, keeping ${Math.min(rows.length, KEEP_MOST_RECENT)}, ` +
    `${stale.length} beyond retention${CLEANUP_DRY_RUN ? " (DRY RUN — nothing deleted)" : ""}`
  );
  if (!stale.length) return;

  for (const row of stale) {
    const publicId = row.video_url ? extractPublicId(row.video_url) : null;
    if (CLEANUP_DRY_RUN) {
      console.log(
        `CLEANUP[dry-run] would delete id=${row.id} created_at=${row.created_at} ` +
        `publicId=${publicId ?? "(not a Cloudinary URL — Supabase row only)"}`
      );
      continue;
    }
    if (publicId) await deleteFromCloudinary(publicId);
    const { error: delErr } = await supabase.from("simulations").delete().eq("id", row.id);
    if (delErr) console.error("CLEANUP: Supabase delete failed", row.id, delErr.message);
    else console.log(`CLEANUP: deleted id=${row.id}`);
  }
}
// Unsigned upload preset — created once in the Cloudinary dashboard.
// Override via env if you name it differently.
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "aura_simulations";

// Fetches the freshly-generated Veo video from Google (while its link is still
// alive) and re-uploads it to Cloudinary for permanent storage, returning the
// permanent Cloudinary URL. This solves the expiring-Veo-link problem.
export async function POST(req: NextRequest) {
  try {
    const { videoUri } = await req.json();

    if (!videoUri || typeof videoUri !== "string") {
      return NextResponse.json({ error: "Missing videoUri" }, { status: 400 });
    }
    // Only accept Google's generativelanguage domain (same guard as video-proxy).
    if (!videoUri.startsWith("https://generativelanguage.googleapis.com/")) {
      return NextResponse.json({ error: "Invalid videoUri" }, { status: 400 });
    }

    // 1. Pull the video from Google while the link is still valid.
    const sep = videoUri.includes("?") ? "&" : "?";
    const videoRes = await fetch(`${videoUri}${sep}key=${API_KEY}`);
    if (!videoRes.ok) {
      const body = await videoRes.text().catch(() => "");
      console.error("Cloudinary upload — source fetch failed:", videoRes.status, body.slice(0, 200));
      return NextResponse.json({ error: "Failed to fetch source video" }, { status: 502 });
    }
    const videoBlob = await videoRes.blob();

    // 2. Unsigned upload to Cloudinary.
    const form = new FormData();
    form.append("file", videoBlob);
    form.append("upload_preset", UPLOAD_PRESET);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: "POST", body: form }
    );

    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      console.error("Cloudinary upload failed:", uploadRes.status, uploadText.slice(0, 300));
      let msg = "Cloudinary upload failed";
      try { msg = JSON.parse(uploadText)?.error?.message ?? msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = JSON.parse(uploadText);
    const url: string | undefined = data.secure_url ?? data.url;
    if (!url) {
      return NextResponse.json({ error: "No URL returned from Cloudinary" }, { status: 502 });
    }

    // 3. Retention cleanup — never let it break the upload response.
    try {
      await cleanupOldSimulations();
    } catch (cleanupErr) {
      console.error("CLEANUP: unexpected error (upload unaffected):", cleanupErr);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("upload-to-cloudinary error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 60;
