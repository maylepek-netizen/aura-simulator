import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const token = process.env.FREESOUND_API_KEY;

  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const res = await fetch(
    `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&token=${token}&format=json&fields=previews&filter=duration:[3+TO+30]&page_size=3`
  );

  if (!res.ok) return NextResponse.json({ error: "Freesound error" }, { status: 502 });

  const data = await res.json();
  console.log("[ambient API] freesound response:", JSON.stringify(data).substring(0, 200));
  const url = data.results?.[0]?.previews?.["preview-hq-mp3"];
  console.log("[ambient API] extracted url:", url);

  if (!url) return NextResponse.json({ error: "No sound found" }, { status: 404 });
  return NextResponse.json({ url });
}
