import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT =
  "You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation. " +
  "Your output is grounded in peer-reviewed autism research. Return ONLY valid JSON. All text in English.";

const JSON_SCHEMA =
  '{\n' +
  '  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },\n' +
  '  "overall_load": 0,\n' +
  '  "visual_effect": "glitch_heavy",\n' +
  '  "scene_caption": "short first-person caption, 10-15 words",\n' +
  '  "video_prompt": "Write a specific Veo video prompt for THIS exact situation. The prompt must describe the real physical environment of the situation, with these cinematic rules: first-person POV handheld camera, overexposed fluorescent/natural lighting matching the scene, faces of people looming too close and feeling threatening, camera hyper-focusing on random small details (textures, movements, objects), tunnel vision blur on periphery, color saturation scaled to sensory load. The prompt must be UNIQUE to this situation - not generic.",\n' +
  '  "monologue": ["thought1","thought2","thought3","thought4","thought5","thought6","thought7","thought8"],\n' +
  '  "sensory_channels": { "auditory": "description", "visual": "description", "tactile": "description", "interoception": "description" },\n' +
  '  "emotions": ["emotion1","emotion2","emotion3"],\n' +
  '  "coping_actions": ["action1","action2","action3"],\n' +
  '  "masking_cost": "description",\n' +
  '  "research_tags": ["tag1","tag2"]\n' +
  '}';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, situation } = body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const userPrompt =
      "Simulate the internal autistic experience for:\n" +
      "Name: " + name + ", Age: " + age + ", Gender: " + gender + "\n" +
      "Situation: \"" + situation + "\"\n\n" +
      "Return this exact JSON (all text in English):\n" +
      JSON_SCHEMA;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message ?? "Gemini error" }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
