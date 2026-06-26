import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a research assistant for the Aura autism simulator. Answer questions based ONLY on autism research. " +
  "Always cite specific findings and statistics when available. Be concise, scientific, and empathetic. " +
  "Never hallucinate — if unsure, say so. Keep answers under 120 words.";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";

    return NextResponse.json({ reply: text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
