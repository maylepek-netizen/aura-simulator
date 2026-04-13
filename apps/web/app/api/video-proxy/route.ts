import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;

export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get("uri");
  if (!uri) return NextResponse.json({ error: "Missing uri" }, { status: 400 });

  // Only allow Google's generativelanguage domain
  if (!uri.startsWith("https://generativelanguage.googleapis.com/")) {
    return NextResponse.json({ error: "Invalid uri" }, { status: 400 });
  }

  const separator = uri.includes("?") ? "&" : "?";
  const videoRes = await fetch(`${uri}${separator}key=${API_KEY}`);

  if (!videoRes.ok) {
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 502 });
  }

  const contentType = videoRes.headers.get("content-type") ?? "video/mp4";
  return new NextResponse(videoRes.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export const maxDuration = 30;
