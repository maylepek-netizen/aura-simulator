

import { NextRequest, NextResponse } from "next/server";
 
const GEMINI_MODEL = "gemini-2.0-flash-lite";
 
const SYSTEM_PROMPT = `You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation.
 
Your output is grounded in peer-reviewed autism research, first-person autistic accounts, and sensory processing theory. You write with clinical accuracy AND emotional honesty — the reader should feel what it's like, not just understand it intellectually.
 
Key research principles you apply:
- Sensory processing differences: autistic people often experience hyper- or hypo-sensitivity across all senses. Sounds, lights, textures and smells that neurotypical people filter out may feel overwhelming or painful.
- Interoception differences: difficulty reading one's own body signals (hunger, heartbeat, emotion) until they become extreme.
- Double empathy problem (Milton, 2012): miscommunication happens in both directions between autistic and non-autistic people — it's a mismatch, not a deficit.
- Executive function differences: transitions, unexpected changes, and multitasking demand more cognitive resources.
- Masking/camouflaging: the intense effort many autistic people exert to appear neurotypical, and its exhausting toll.
- Monotropism: deep focus on one thing at a time; being pulled between multiple inputs causes overload.
- Emotional processing: emotions are often felt intensely but expressed differently; alexithymia is common.
 
You write the internal monologue in first person, present tense, visceral and specific. No euphemisms. No "I feel overwhelmed" — show what overwhelming actually IS.
 
Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
 
const USER_PROMPT_TEMPLATE = (
  name: string,
  age: number,
  gender: string,
  situation: string
) => `Simulate the internal autistic experience for this person:
Name: ${name}
Age: ${age}
Gender: ${gender}
Situation: "${situation}"
 
Return this exact JSON structure:
{
  "sensory_scores": {
    "auditory": <0-3>,
    "visual": <0-3>,
    "tactile": <0-3>,
    "social": <0-3>
  },
  "overall_load": <0-100>,
  "visual_effect": <"glitch_heavy"|"glitch_medium"|"glitch_light"|"calm">,
  "scene_caption": "<10-15 word first-person caption of this exact moment>",
  "monologue": [
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>",
    "<visceral first-person thought, 1-2 sentences>"
  ],
  "sensory_channels": {
    "auditory": "<specific description of how sound feels right now>",
    "visual": "<specific description of how sight feels right now>",
    "tactile": "<specific description of touch/body sensations>",
    "interoception": "<heartbeat, breath, body signals>"
  },
  "emotions": [
    "<specific raw emotion with physical location in body>",
    "<specific raw emotion with physical location in body>",
    "<specific raw emotion with physical location in body>"
  ],
  "coping_actions": [
    "<specific action or internal strategy>",
    "<specific action or internal strategy>",
    "<specific action or internal strategy>"
  ],
  "masking_cost": "<one sentence on what the performance of 'normal' costs right now>",
  "research_tags": ["<tag from: G-AUD|EPF|DEP|MASK|MONO|EXEC|INTRO>"]
}
 
Rules:
- monologue must be raw, specific, present-tense. Not "I feel overwhelmed" — show the overwhelm.
- sensory_channels must be situation-specific, not generic.
- emotions must name WHERE in the body the feeling lives.
- All text in the same language as the situation description (Hebrew if Hebrew, English if English).`;
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, situation } = body as {
      name: string;
      age: number;
      gender: string;
      situation: string;
    };
 
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }
 
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: USER_PROMPT_TEMPLATE(name, age, gender, situation) }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );
 
    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return NextResponse.json(
        { error: err?.error?.message ?? "Gemini error" },
        { status: 502 }
      );
    }
 
    const geminiData = await geminiRes.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
 
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
 
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[simulate] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
 