import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Uploads the freshly-generated Veo video to Cloudinary (unsigned preset) for
// permanent hosting, solving the expiring-Veo-link problem. The Supabase table
// still stores the resulting permanent URL and drives retention cleanup.

const API_KEY = process.env.GEMINI_API_KEY!;

// Cloudinary account + unsigned upload preset.
const CLOUD_NAME = "duhsqezo3";
const UPLOAD_PRESET = "aura_simulations";

// ─── Retention cleanup ───────────────────────────────────────────────────────
// Keep only the N most recent simulations. Row `id` is the source of truth for
// recency; anything older is removed from Cloudinary and from the table.
//
// DRY RUN: while CLEANUP_DRY_RUN is true nothing is deleted — the route only
// logs what it *would* remove. Set CLEANUP_DRY_RUN=false to enable deletion.
const KEEP_MOST_RECENT = 20;
const CLEANUP_DRY_RUN = process.env.CLEANUP_DRY_RUN !== "false";

// Created lazily so a missing env var returns a clean 500 instead of crashing
// the route at import time. Used only for the DB row bookkeeping/cleanup — the
// upload itself is unsigned and needs no Supabase.
function serverSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Turn a Cloudinary delivery URL into the public_id needed by the Admin API.
//   https://res.cloudinary.com/<cloud>/video/upload/v123/folder/name.mp4
//     -> folder/name
// Strips the version segment (v123…) and the file extension, and decodes any
// percent-encoding (e.g. Hebrew filenames).
export function extractPublicId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "res.cloudinary.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // .../<resource_type>/upload/<maybe v123>/<...public_id parts>.<ext>
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;
    let rest = parts.slice(uploadIdx + 1);
    // drop the version segment if present (e.g. "v1784387420")
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (!rest.length) return null;
    const joined = rest.join("/");
    const noExt = joined.replace(/\.[^/.]+$/, "");
    return noExt ? decodeURIComponent(noExt) : null;
  } catch {
    return null;
  }
}

// Delete one video asset from Cloudinary via the Admin API (signed with
// api_key + api_secret). The unsigned upload preset can only upload, so deletion
// needs the signed destroy endpoint.
async function cloudinaryDestroy(publicId: string): Promise<boolean> {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("CLEANUP: Cloudinary API key/secret missing — cannot delete assets.");
    return false;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  // Signature = sha1 of the sorted params + api_secret.
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/destroy`,
    { method: "POST", body: form }
  );
  const json = await res.json().catch(() => ({}));
  if (json?.result === "ok" || json?.result === "not found") return true;
  console.error("CLEANUP: Cloudinary destroy failed for", publicId, json);
  return false;
}

async function cleanupOldSimulations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("simulations")
    .select("id, video_url")
    // Order by id alone. `id` is a monotonic serial, so descending id IS
    // newest-first — never NULL, never tied, never backfilled.
    .order("id", { ascending: false });

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

  // Map each stale row to its Cloudinary public_id (if it is a Cloudinary URL).
  const targets = stale.map((row) => ({
    id: row.id,
    publicId: row.video_url ? extractPublicId(row.video_url) : null,
  }));

  if (CLEANUP_DRY_RUN) {
    for (const t of targets) {
      console.log(
        `CLEANUP[dry-run] would delete id=${t.id} ` +
        `cloudinaryPublicId=${t.publicId ?? "(not a Cloudinary URL — row only)"}`
      );
    }
    return;
  }

  // Delete the Cloudinary assets (best-effort; a failed asset delete must not
  // block removing the row).
  for (const t of targets) {
    if (t.publicId) {
      try { await cloudinaryDestroy(t.publicId); }
      catch (e) { console.error("CLEANUP: Cloudinary destroy threw for", t.publicId, e); }
    }
  }

  const { error: delErr } = await supabase
    .from("simulations")
    .delete()
    .in("id", stale.map((r) => r.id));
  if (delErr) console.error("CLEANUP: Supabase delete failed:", delErr.message);
  else console.log(`CLEANUP: deleted ${stale.length} simulations`);
}

// Fetches the freshly-generated Veo video from Google (directly, while its link
// is still alive) and re-uploads it to Cloudinary, returning the permanent URL.
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

    console.log("UPLOAD: Starting upload for videoUri:", videoUri.substring(0, 50));

    // 1. Pull the video straight from Google while the link is still valid.
    const sep = videoUri.includes("?") ? "&" : "?";
    const videoRes = await fetch(`${videoUri}${sep}key=${API_KEY}`);
    if (!videoRes.ok) {
      const body = await videoRes.text().catch(() => "");
      console.error("UPLOAD: source fetch failed:", videoRes.status, body.slice(0, 200));
      return NextResponse.json({ error: "Failed to fetch source video" }, { status: 502 });
    }
    const videoBuffer = await videoRes.arrayBuffer();
    console.log("UPLOAD: Video fetched, size:", videoBuffer.byteLength);

    // 2. Upload to Cloudinary via the unsigned upload preset.
    const formData = new FormData();
    formData.append("file", new Blob([videoBuffer], { type: "video/mp4" }));
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("resource_type", "video");

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: "POST", body: formData }
    );

    const cloudinaryData = await cloudinaryRes.json();
    if (!cloudinaryRes.ok || !cloudinaryData?.secure_url) {
      console.error("UPLOAD: Cloudinary upload failed:", cloudinaryRes.status, cloudinaryData?.error ?? cloudinaryData);
      return NextResponse.json(
        { error: cloudinaryData?.error?.message ?? "Cloudinary upload failed" },
        { status: 502 }
      );
    }
    const url = cloudinaryData.secure_url as string;
    console.log("UPLOAD: Complete —", url);

    // 3. Retention cleanup — best-effort, never blocks the upload response.
    try {
      const supabase = serverSupabase();
      if (supabase) await cleanupOldSimulations(supabase);
      else console.warn("CLEANUP: skipped — Supabase not configured (upload unaffected).");
    } catch (cleanupErr) {
      console.error("CLEANUP: unexpected error (upload unaffected):", cleanupErr);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 60;
