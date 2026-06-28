import { GoogleGenerativeAI, type GenerateContentResult } from "@google/generative-ai";

// ─── Init ─────────────────────────────────────────────────────────────────────

function getAI(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `
Role: You are "Aura," an autism sensory simulation engine.
Your job: analyze the situation → classify it → write ONE precise Veo video prompt.

═══════════════════════════════
STEP 1 — CLASSIFY THREE VARIABLES
═══════════════════════════════

FAMILIARITY:
- ALONE: no other people present
- FAMILIAR: family, friends, known people
- STRANGERS: unknown people

DENSITY:
- QUIET: private or low-stimulation (car, bedroom, empty room)
- MEDIUM: moderate activity (classroom, quiet cafe, small gathering)
- CROWDED: high stimulation (bus, party, mall, busy street)

ACTIVITY:
- PASSIVE: sitting, listening, watching
- INTERACTIVE: conversation, game, lesson
- MOVING: walking, commuting, sport

═══════════════════════════════
STEP 2 — SELECT AUTISTIC DIRECTING STYLE
Based on the three variables above, apply the matching camera behavior:
═══════════════════════════════

ALONE + QUIET + PASSIVE:
Camera drifts slowly across the space. Hyper-focuses on one irrelevant detail
(a crack in the wall, dust floating in light, a blinking cursor).
Silence feels thick and present. Time feels stretched.
One object fills 40% of frame for the entire shot.

ALONE + MEDIUM/CROWDED + PASSIVE:
Camera keeps returning to one safe anchor object (a table edge,
a cup, hands in lap). Peripheral activity is visible but
camera resists looking directly at it.

FAMILIAR + QUIET + INTERACTIVE:
Their face is visible but camera drifts away from their eyes.
Gaze cycles: eyes → mouth → their hands → an object nearby → back.
Small processing delay — camera responds a fraction of a second late.
Their presence feels slightly too close.

FAMILIAR + CROWDED + INTERACTIVE:
Familiar faces visible but hard to track. Camera tries to
follow one person but gets pulled to background details.
A specific irrelevant detail (someone's earring, a stain on the wall)
competes with the conversation.

STRANGERS + QUIET + INTERACTIVE:
Their face fills 60% of frame. Eyes feel too direct and intense.
Mouth movements appear slightly out of sync with sound.
Camera wants to look away but keeps returning.
Their body seems to lean slightly toward camera.

STRANGERS + CROWDED + ANY:
Continuous scanning — camera cannot settle on one face.
Everything at equal visual volume — no hierarchy.
Lights feel overexposed. Colors too saturated.
Center of frame stays sharp, edges blur (tunnel vision).
One random detail suddenly dominates (a sound, a flash, a movement).

MOVING + ANY:
Camera moves at natural walking pace.
Ground texture visible periodically — pavement, floor pattern.
Passing people feel slightly threatening — camera angles slightly away.
One recurring detail appears multiple times (a pattern, a sound, a color).

═══════════════════════════════
STEP 3 — WRITE THE VEO PROMPT
ONE paragraph. 3-5 sentences. English only.
═══════════════════════════════

IRON RULES — NEVER BREAK:
1. SINGLE CONTINUOUS SHOT. No cuts. No scene changes. One uninterrupted take.
2. NEVER show the person themselves. No body, no hands, no face, no reflection,
   no shadow. Camera IS their eyes — pure subjective POV.
3. SEAMLESS LOOP. Last frame identical to first frame.
   Use only atmospheric cyclical motion (steam, dust, breathing, flickering).
4. ONE SCENE ONLY. One location. One moment. One focus.
   Not three scenes combined. A photograph that breathes.
5. Camera height matches age: child=100cm, teen=145cm, adult=165cm.
6. Photorealistic. Natural motion only. No AI artifacts.
7. NEGATIVE (never include these): person's own body, hands, feet, selfie angle,
   multiple locations, narrative sequence, text on screen, unnatural motion,
   horror elements, cartoon style.

PROMPT FORMAT:
Write one focused cinematic paragraph describing:
- The exact environment (specific, not generic)
- The one element in focus (the autistic hyperfocus detail)
- The atmospheric motion that creates the loop
- The camera behavior matching the directing style above

EXAMPLE OF GOOD PROMPT:
"A fluorescent-lit school cafeteria at lunch hour. Dozens of students sit
at long tables, voices layered into undifferentiated noise. Camera fixed at
165cm, facing forward. A single red tray on the table 60cm ahead holds
complete attention — slight focus drift across its surface, then back to sharp.
Peripheral faces move but camera never turns toward them.
Fluorescent light flickers imperceptibly every 3 seconds.
Steam rises from a food tray to the right, cycling in a slow loop.
First and last frame: the red tray surface, slightly out of focus."

EXAMPLE OF BAD PROMPT (never do this):
"First we see the cafeteria, then the camera pans to faces,
then we see the protagonist walking away."
← This has multiple scenes and cuts. WRONG.

Response Format (return valid JSON only, no markdown):
{
  "objective": "משפט אחד בעברית המתאר את המציאות האובייקטיבית",
  "visual_prompt": "A STILL FRAME that could be the first frame of the video. Same location, same lighting, same camera angle as the video_prompt. Photorealistic, cinematic, no people in center frame.",
  "video_prompt": "One focused cinematic paragraph in English describing the single moment, hyperfocus detail, atmospheric loop motion, and camera behavior. Optimized for Google Veo 2.",
  "internal_thoughts": "המונולוג הפנימי בעברית - קצר, מקוטע, חושי מאוד. 3-5 משפטים.",
  "soundscape": "תיאור הסאונד בעברית - איזה צליל הופך לצורם או דומיננטי?",
  "emotional_landscape": ["רגש 1", "רגש 2", "רגש 3"],
  "sensory_load": <number 0-100>,
  "visual_effect": "<glitch_heavy|glitch_medium|glitch_light|calm>"
}
`;

// ─── Generate Text Experience ─────────────────────────────────────────────────

export async function generateExperience(
  apiKey: string,
  situation: string,
  task: string,
  level: number,
  name: string,
  age: number,
  gender: string
) {
  const ai = getAI(apiKey);
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
  });

  const intensity =
    level <= 33
      ? "low (subtle sensory shifts)"
      : level <= 66
        ? "medium (noticeable overload)"
        : "high (extreme sensory fragmentation and loss of control)";

  const prompt = `
Person: ${name}, age ${age}, ${gender}
Situation: ${situation}
Task: ${task}
Intensity Level: ${intensity} (${level}/100)

Return only valid JSON, no markdown.
  `.trim();

  const result: GenerateContentResult = await model.generateContent(prompt);
  const raw = result.response.text();
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── Generate Scene Image ─────────────────────────────────────────────────────

export async function generateSceneImage(apiKey: string, visualPrompt: string, level: number) {
  const intensityDesc =
    level > 66
      ? "extreme fragmentation, aggressive cyan and neon orange highlights, multiple ghosted faces, zero depth hierarchy"
      : level > 33
        ? "noticeable pixelated blocks, motion echoes, high contrast stabbing light, distorted perspective"
        : "subtle skew, slight color saturation, high contrast, minor fragmentation";

  const ai = getAI(apiKey);
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp-image-generation" });

  const result = await model.generateContent([
    `Generate a high-quality, realistic first-person POV cinematic shot.
    
Scene: ${visualPrompt}

VISUAL RULES:
1. Fragmentation: Objects broken into digital blocks/pixels
2. Duplication: Faces split or doubled, movement creates echoes
3. No Hierarchy: Everything equally sharp and invasive
4. Sensory Intensity: Aggressive colors, stabbing light, high contrast
5. Instability: Distorted perspective, stretched space

Intensity: ${intensityDesc}
Tone: Psychological realism, immersive, unsettling. No horror tropes, just perceptual breakdown.`,
  ]);

  for (const part of result.response.candidates?.[0]?.content?.parts || []) {
    const p = part as { inlineData?: { data: string; mimeType: string } };
    if (p.inlineData) {
      return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
    }
  }
  return null;
}

// ─── Generate Narration (TTS) ─────────────────────────────────────────────────

export async function generateNarration(apiKey: string, text: string): Promise<string | null> {
  const ai = getAI(apiKey);

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Narrate the following inner thoughts in Hebrew with a calm, slightly fragmented, immersive tone. Voice should feel internal, like thoughts heard from inside: ${text}`,
          },
        ],
      },
    ],
    generationConfig: {
      // @ts-expect-error - TTS specific config
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  const base64Audio =
    result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio ?? null;
}
