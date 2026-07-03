import { GoogleGenerativeAI, type GenerateContentResult } from "@google/generative-ai";

// ─── Init ─────────────────────────────────────────────────────────────────────

function getAI(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `
Role: You are "Aura," a Sensory Perception Engine. Your goal is to deconstruct any situation into the autistic sensory experience.

Rules of Perception:
1. Fragmentation: Focus on small, isolated details (a zipper, a flickering bulb, a texture) rather than the whole scene.
2. Visual Style: Describe the scene using cinematic terms: Macro focus, high digital grain, light bleeding, and fragmented textures.
3. No Clichés: Avoid generic descriptions. Be raw and specific.
4. Language: Respond in Hebrew for all Hebrew fields. English only for visual/video prompts.

VIDEO_PROMPT RULES:
Write ONE short English paragraph (max 60 words) describing a single static moment.

CRITICAL - CAMERA IS THE EYES (POV Rules):
This video shows what an autistic person SEES from their perspective.

RULE 1 - PEOPLE IN SITUATIONS:
- If the situation involves 1-2 specific people (argument, someone approaching, conversation): show them naturally, but slightly out of focus or at an angle. Never looking directly into camera.
- If the situation involves a GROUP of familiar people (family, friends): show them from the outside looking in - the camera feels physically separate, like there is an invisible barrier between the viewer and the group. The group interacts WITH EACH OTHER, not with the camera.
- If the situation involves a CROWD or busy public space: show blurred background people, focus on an inanimate detail in the foreground. Faces are never the main focus.

RULE 2 - HYPERFOCUS OBJECT:
Always include ONE inanimate detail that the camera fixates on (a texture, a light, an object). This is the autistic anchor point that competes with the social scene.

RULE 3 - NEVER:
- Never make a person the ONLY subject with nothing else in frame - always include environmental details, textures, or objects competing for attention alongside any person

STRICT RULES:
- ONE location only. ONE primary object in focus. ONE subtle motion.
- Static camera. No cuts. No scene changes. No transitions.
- Photorealistic documentary footage. Like a security camera or nature documentary.
- No voiceover. No narration. No text on screen. Natural ambient sound only.
- Must loop seamlessly: last frame = first frame.
- Always end with: "Opens with a slow eye blink opening - eyelids part to reveal the scene. Closes with a slow eye blink closing - eyelids shut at the end. The blink creates a natural seamless loop transition."
- FORBIDDEN words: surreal, dreamlike, glitch, cartoon, animated, fantasy, horror, magical
- ALLOWED subtle strangeness: slightly off timing, mild sensory heightening, unusual focus on mundane details, colors slightly more vivid than normal - these reflect authentic autistic perception

FORMAT: Start with camera position, then describe what's in frame, then the ONE motion, then sound.

EXAMPLE:
'Slow eye blink opens to reveal: Fixed camera at eye level. Close-up of a fluorescent light fixture on a white office ceiling, slight hum visible as tube flickers imperceptibly every few seconds. Air conditioning vent beside it releases a thin stream of cool air. Natural ambient office hum. Slow eye blink closes. Seamless loop.'

video_prompt must be a plain string, not JSON.

Response Format (return valid JSON only, no markdown):
{
  "objective": "משפט אחד בעברית המתאר את המציאות האובייקטיבית",
  "visual_prompt": "Detailed English prompt for image generation. Style: Minimalist, hyper-macro, fragmented, high-grain, cinematic lighting",
  "video_prompt": "[plain string prompt following the VIDEO_PROMPT RULES described above]",
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
