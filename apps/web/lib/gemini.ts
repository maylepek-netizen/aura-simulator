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
Write a structured video prompt in English. Maximum 1600 characters.

CAMERA HEIGHT by age:
- Child (under 12): 100-110cm eye level
- Teen (12-17): 140-150cm eye level
- Adult (18+): 160-170cm eye level

AUTISTIC PERCEPTION - apply based on situation:
- ALONE/QUIET: Camera locks obsessively on ONE irrelevant detail (texture, light, crack in wall). Time feels stretched. Everything else fades.
- WITH FAMILIAR PEOPLE: Camera drifts away from faces. Cycles: face → nearby object → hands → wall → back. Invisible barrier between viewer and group. Group interacts with each other, never with camera.
- WITH STRANGERS: Uncomfortable proximity. Camera fixates on non-face details (collar, hands, wall behind). Cannot fully look away.
- CROWD/PUBLIC: Everything at equal visual volume, no hierarchy. Camera locks on ONE inanimate anchor. Background people are blurred motion only.
- SENSORY TRIGGER (sudden noise, touch, unexpected change): Involuntary sharp camera movement → freeze → slow recovery.

PROMPT FORMAT:
description: '0-3s: [exact scene - what camera sees, anchor object in sharp focus]. 3-8s: [same scene continues, ONE subtle atmospheric motion].'
camera: '[choose: Locked-off tripod / Extremely slow push-in / Subtle erratic handheld with breathing tremor / Rapid involuntary focal shifts]'
lighting: '[specific and harsh - fluorescent flicker / directional cold light / overexposed window glare / high contrast shadow]'
style: 'Photorealistic, naturalistic, documentary 4K. Colors slightly oversaturated - autistic sensory heightening.'
elements: 'PRIMARY ANCHOR: [one hyper-specific inanimate object - exact material, color, distance, texture]. BACKGROUND: [blurred, indistinct, motion only, never faces as focus]'
audio: '[CRITICAL - amplified and overwhelming, matching the situation exactly]:
- Crowd scene: overlapping voices all at equal volume, chair scrapes, door slams, indistinct shouting
- Children present: high-pitched children voices, sudden shrieking, unpredictable bursts
- Office/classroom: fluorescent hum, keyboard clicks, paper shuffle, all uncomfortably loud
- Public transport: engine rumble, announcements, doors, strangers breathing too close
- Family dinner: overlapping conversations, cutlery on plates, TV in background, all competing equally
NO voiceover. NO narration. NO music. Only natural amplified ambient sound.'

NEGATIVE PROMPT - always end with this exact line:
'Single continuous shot, locked-off camera, no cuts, no transitions, no morphing, no scene change, no people looking at camera, no voiceover, no narration, no text on screen.'

CRITICAL RULES:
1. ONE anchor object - hyper-specific (not just chair - worn grey plastic chair armrest with visible scratches, 30cm from camera)
2. People in background only - blurred, never facing camera, never making eye contact
3. STATIC scene - only atmospheric loop motion (dust mote, steam, flicker, subtle air)
4. Colors slightly more vivid than reality - autistic sensory experience
5. Sound must feel OVERWHELMING - louder and more present than normal
6. 8 seconds seamless loop - first and last frame identical

MEMORY/VISUAL THINKING note:
The autistic person thinks in specific images, not concepts.
Camera should reflect this: not a generic room but THIS specific crack in THIS specific wall.

EXAMPLE:
description: '0-3s: Camera locked on worn blue plastic chair armrest, 30cm away, scratches in sharp detail, fluorescent light reflected in surface. 3-8s: Same armrest. Dust mote drifts slowly through light beam above it.'
camera: 'Locked-off tripod. Absolutely static. Subtle breathing tremor only.'
lighting: 'Harsh overhead fluorescent, cold white, flickers every 4 seconds. Deep shadows beneath chairs.'
style: 'Photorealistic, naturalistic, documentary 4K. Colors slightly oversaturated.'
elements: 'PRIMARY: worn blue plastic armrest, visible scratches, 30cm from camera, sharp focus. BACKGROUND: blurred seated figures, indistinct motion only.'
audio: 'Fluorescent hum loud and present. Distant overlapping voices all at same volume. Sudden chair scrape. Child crying somewhere. All sounds uncomfortably close and equal.'
Single continuous shot, locked-off camera, no cuts, no transitions, no morphing, no scene change, no people looking at camera, no voiceover, no narration, no text on screen.

video_prompt must be a plain string.

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
