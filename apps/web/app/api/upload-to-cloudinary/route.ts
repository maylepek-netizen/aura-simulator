import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// NOTE: the route path is still /api/upload-to-cloudinary so result/page.tsx
// doesn't need changing, but storage is now Supabase Storage, not Cloudinary.

const API_KEY = process.env.GEMINI_API_KEY!;
const BUCKET = "simulations";

// ─── Retention cleanup ───────────────────────────────────────────────────────
// Keep only the N most recent simulations. Supabase `created_at` is the source
// of truth; anything older is removed from Storage and from the table.
//
// DRY RUN: while CLEANUP_DRY_RUN is true nothing is deleted — the route only
// logs what it *would* remove. Set CLEANUP_DRY_RUN=false to enable deletion.
const KEEP_MOST_RECENT = 20;
const CLEANUP_DRY_RUN = process.env.CLEANUP_DRY_RUN !== "false";

// Created lazily so a missing env var returns a clean 500 instead of crashing
// the route at import time.
function serverSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service-role key is required to write to Storage and to delete rows under RLS.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Turn a Supabase Storage public URL into the object path inside the bucket.
//   https://<ref>.supabase.co/storage/v1/object/public/simulations/foo.mp4
//     -> foo.mp4
export function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const path = u.pathname.slice(idx + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

async function cleanupOldSimulations(supabase: SupabaseClient) {
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

  const paths: string[] = [];
  for (const row of stale) {
    const path = row.video_url ? extractStoragePath(row.video_url) : null;
    if (path) paths.push(path);
    if (CLEANUP_DRY_RUN) {
      console.log(
        `CLEANUP[dry-run] would delete id=${row.id} created_at=${row.created_at} ` +
        `storagePath=${path ?? "(not a Storage URL — row only)"}`
      );
    }
  }
  if (CLEANUP_DRY_RUN) return;

  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (rmErr) console.error("CLEANUP: Storage remove failed:", rmErr.message);
  }
  const { error: delErr } = await supabase
    .from("simulations")
    .delete()
    .in("id", stale.map((r) => r.id));
  if (delErr) console.error("CLEANUP: Supabase delete failed:", delErr.message);
  else console.log(`CLEANUP: deleted ${stale.length} simulations`);
}

// Fetches the freshly-generated Veo video from Google (while its link is still
// alive) and re-uploads it to Supabase Storage for permanent storage, returning
// the permanent public URL. This solves the expiring-Veo-link problem.
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

    const supabase = serverSupabase();
    if (!supabase) {
      console.error("Storage upload: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // 1. Pull the video straight from Google while the link is still valid.
    const sep = videoUri.includes("?") ? "&" : "?";
    const videoRes = await fetch(`${videoUri}${sep}key=${API_KEY}`);
    if (!videoRes.ok) {
      const body = await videoRes.text().catch(() => "");
      console.error("Storage upload — source fetch failed:", videoRes.status, body.slice(0, 200));
      return NextResponse.json({ error: "Failed to fetch source video" }, { status: 502 });
    }
    const videoBuffer = await videoRes.arrayBuffer();

    // 2. Upload to Supabase Storage.
    const fileName = `simulation-${Date.now()}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Supabase Storage upload failed:", uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 502 });
    }

    // 3. Public URL for the stored object.
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const url = urlData?.publicUrl;
    if (!url) {
      return NextResponse.json({ error: "No public URL returned from Storage" }, { status: 502 });
    }

    // 4. Retention cleanup — never let it break the upload response.
    try {
      await cleanupOldSimulations(supabase);
    } catch (cleanupErr) {
      console.error("CLEANUP: unexpected error (upload unaffected):", cleanupErr);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Storage upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 60;
