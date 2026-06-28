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

Response Format (return valid JSON only, no markdown):
{
  "objective": "משפט אחד בעברית המתאר את המציאות האובייקטיבית",
  "visual_prompt": "Detailed English prompt for image generation. Style: Minimalist, hyper-macro, fragmented, high-grain, cinematic lighting",
  "video_prompt": "[WILL BE INJECTED — leave exactly as this placeholder string]",
  "internal_thoughts": "המונולוג הפנימי בעברית - קצר, מקוטע, חושי מאוד. 3-5 משפטים.",
  "soundscape": "תיאור הסאונד בעברית - איזה צליל הופך לצורם או דומיננטי?",
  "emotional_landscape": ["רגש 1", "רגש 2", "רגש 3"],
  "sensory_load": <number 0-100>,
  "visual_effect": "<glitch_heavy|glitch_medium|glitch_light|calm>"
}
`;

// ─── Classify Situation ───────────────────────────────────────────────────────

export async function classifySituation(
  apiKey: string,
  situation: string
): Promise<{
  familiarity: "alone" | "familiar" | "strangers";
  density: "quiet" | "medium" | "crowded";
  activity: "passive" | "interactive" | "moving";
  trigger: string | null;
}> {
  const ai = getAI(apiKey);
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
  });

  const prompt = `Analyze this situation and classify it. Return ONLY valid JSON, no markdown.

Situation: "${situation}"

Return exactly this JSON structure:
{
  "familiarity": "alone" OR "familiar" OR "strangers",
  "density": "quiet" OR "medium" OR "crowded",
  "activity": "passive" OR "interactive" OR "moving",
  "trigger": "describe any sudden event/disruption if present, otherwise null"
}

Rules:
- alone = no other people present
- familiar = family, friends, known people
- strangers = unknown people
- quiet = private/low stimulation (car, bedroom, empty room)
- medium = moderate activity (classroom, quiet cafe, small gathering)
- crowded = high stimulation (bus, party, mall, busy street, cinema)
- passive = sitting, watching, listening
- interactive = conversation, game, lesson
- moving = walking, commuting, sport`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── Build Directed Video Prompt ──────────────────────────────────────────────

export function buildDirectedVideoPrompt(
  classification: {
    familiarity: string;
    density: string;
    activity: string;
    trigger: string | null;
  },
  situation: string,
  age: number
): string {
  const cameraHeight = age < 10 ? "100cm" : age < 16 ? "145cm" : "165cm";

  let directingStyle = "";

  if (classification.familiarity === "alone" && classification.density === "quiet") {
    directingStyle = `Camera drifts slowly across the space. One irrelevant detail holds attention for almost the entire shot (a crack in the wall, dust floating in light, a texture on a surface). Silence feels thick and present. Time feels stretched. That one detail fills 40% of frame.`;
  } else if (classification.familiarity === "alone" && classification.density !== "quiet") {
    directingStyle = `Camera keeps returning to one safe anchor object nearby (a table edge, a cup, hands resting on a surface). Peripheral activity is present but camera resists looking directly at it. The anchor object provides visual stability.`;
  } else if (classification.familiarity === "familiar" && classification.density === "quiet") {
    directingStyle = `A known person is present. Camera drifts away from their eyes, cycles: face → mouth → their hands → nearby object → back. Small processing delay — camera responds a fraction late. Their presence feels slightly too close.`;
  } else if (classification.familiarity === "familiar" && classification.density !== "quiet") {
    directingStyle = `Familiar faces present but hard to track in the noise. Camera tries to follow one person but gets pulled to background details. One irrelevant detail (a texture, a color, a sound source) competes with the social interaction.`;
  } else if (classification.familiarity === "strangers" && classification.density === "quiet") {
    directingStyle = `A stranger's face fills 50-60% of frame. Eyes feel too direct and intense. Mouth movements appear slightly out of sync. Camera wants to look away but keeps returning. Their body seems to lean slightly toward camera.`;
  } else if (classification.familiarity === "strangers" && classification.density === "crowded") {
    directingStyle = `Continuous scanning — camera cannot settle. Everything at equal visual volume, no hierarchy. Lights feel overexposed. Colors too saturated. Center stays sharp, edges blur into tunnel vision. One random detail suddenly dominates.`;
  } else if (classification.activity === "moving") {
    directingStyle = `Camera moves at natural walking pace. Ground texture visible periodically. Passing people feel slightly threatening — camera angles slightly away. One recurring detail keeps appearing (a pattern, a color, a sound source).`;
  } else {
    directingStyle = `Camera holds steady on the most visually dominant element in the scene. Slight involuntary sway. Peripheral details compete for attention but camera resists redirecting.`;
  }

  const triggerInstruction = classification.trigger
    ? `TRIGGER EVENT: "${classification.trigger}" — when this happens: quick involuntary camera movement → brief freeze → slow recovery back to original position.`
    : "";

  return `Write ONE cinematic paragraph for Google Veo 2. Situation: "${situation}". Camera height: ${cameraHeight}.

DIRECTING STYLE FOR THIS SCENE:
${directingStyle}

${triggerInstruction}

IRON RULES — NEVER BREAK:
1. Single continuous shot. No cuts. No scene changes. One uninterrupted take.
2. NEVER show the person themselves. No body, no hands, no face, no reflection, no shadow. Pure environment shot.
3. Seamless loop — last frame identical to first frame. Only atmospheric cyclical motion (steam, dust, flickering light, subtle air movement).
4. ONE scene only. One location. One moment. Not three scenes combined.
5. Photorealistic. Natural motion only. No AI artifacts.
6. Camera height: ${cameraHeight}.

OUTPUT: One focused paragraph, 3-5 sentences, English only. Describe: the exact environment, the one element in focus, the atmospheric loop motion, the camera behavior.`;
}

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
  const [classification, experienceResult] = await Promise.all([
    classifySituation(apiKey, situation),
    (async () => {
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
    })(),
  ]);

  const video_prompt = buildDirectedVideoPrompt(classification, situation, age);
  return { ...experienceResult, video_prompt };
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
