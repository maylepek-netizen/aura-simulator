import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation. Your output is grounded in peer-reviewed autism research. Return ONLY valid JSON. All text in English.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, situation } = body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const prompt = `Simulate the internal autistic experience for:
Name: ${name}, Age: ${age}, Gender: ${gender}
Situation: "${situation}"

Return this exact JSON (all text in English):
{
  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },
  "overall_load": 0,
  "visual_effect": "glitch_heavy",
  "scene_caption": "short first-person caption, 10-15 words",
  "video_prompt": "Write a complete Veo prompt for this exact situation. MUST include: 1) The REAL physical scene with specific realistic details (actual place, real people, real objects). 2) First-person POV handheld cinematic camera at eye level. 3) SOCIAL DREAD: if people are present - faces loom too close, mouths moving but sound distorted, hands reaching toward camera feeling threatening, eye contact feels like physical pressure, crowd bodies feel like walls closing in. 4) HYPER-FOCUS on tiny details: a button on s
cat > app/api/simulate/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation. Your output is grounded in peer-reviewed autism research. Return ONLY valid JSON. All text in English.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, situation } = body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const prompt = `Simulate the internal autistic experience for:
Name: ${name}, Age: ${age}, Gender: ${gender}
Situation: "${situation}"

Return this exact JSON (all text in English):
{
  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },
  "overall_load": 0,
  "visual_effect": "glitch_heavy",
  "scene_caption": "short first-person caption, 10-15 words",
  "video_prompt": "Write a complete Veo prompt for this exact situation. MUST include: 1) The REAL physical scene with specific realistic details (actual place, real people, real objects). 2) First-person POV handheld cinematic camera at eye level. 3) SOCIAL DREAD: if people are present - faces loom too close, mouths moving but sound distorted, hands reaching toward camera feeling threatening, eye contact feels like physical pressure, crowd bodies feel like walls closing in. 4) HYPER-FOCUS on tiny details: a button on someone's shirt, a flickering fluorescent tube, the texture of a floor tile, a mechanical repetitive movement. Camera snaps obsessively between these micro-details. 5) LIGHTING: overexposed fluorescent lights that feel like they burn, heavy peripheral vignette blur creating tunnel vision. 6) Scale by load: load<40=subtle desaturation and slight blur; load 40-70=heavy tunnel vision, saturated colors, shallow depth of field, faces slightly out of focus; load>70=chromatic aberration, fast jump cuts, extreme overexposure, faces completely distorted, panic camera movement, flickering. Always photorealistic, not horror, immersive.",
  "monologue": ["thought1","thought2","thought3","thought4","thought5","thought6","thought7","thought8"],
  "sensory_channels": { "auditory": "description", "visual": "description", "tactile": "description", "interoception": "description" },
  "emotions": ["emotion1","emotion2","emotion3"],
  "coping_actions": ["action1","action2","action3"],
  "masking_cost": "description",
  "research_tags": ["tag1","tag2"]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
        })
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
