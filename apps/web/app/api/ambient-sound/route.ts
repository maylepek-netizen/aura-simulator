import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    const url =
      "https://freesound.org/apiv2/search/text/?query=" +
      encodeURIComponent(query) +
      "&token=" + apiKey +
      "&format=json&fields=previews&filter=duration:[3+TO+30]&page_size=5";

    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "Freesound error" }, { status: 502 });

    const data = await res.json();
    const first = data.results?.[0];
    if (!first) return NextResponse.json({ error: "No results" }, { status: 404 });

    const previewUrl = first.previews?.["preview-hq-mp3"] ?? first.previews?.["preview-lq-mp3"];
    if (!previewUrl) return NextResponse.json({ error: "No preview available" }, { status: 404 });

    return NextResponse.json({ url: previewUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
