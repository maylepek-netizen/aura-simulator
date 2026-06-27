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

CINEMATIC DIRECTING PIPELINE (apply before writing video_prompt):

Step 1 - CLASSIFY THE ENVIRONMENT:
Read the situation and identify:
- Indoor or outdoor?
- Open or enclosed space?
- Quiet or noisy?
- Familiar or unfamiliar to the protagonist?

Step 2 - CLASSIFY SOCIAL CONTEXT:
- ALONE: camera drifts slowly, hyper-focuses on irrelevant details (pen, crack in wall, dust in light), silence feels thick, time feels stretched
- ONE FAMILIAR PERSON: face visible but expressions hard to decode, camera drifts away from eyes then forces back, processing delay before responding, proximity feels slightly too close
- ONE STRANGER: face fills 50-60% of frame, eyes too intense, mouth movements slightly out of sync, camera wants to look away but keeps returning, body leans toward camera
- SMALL GROUP (2-5): camera jumps between faces cannot settle, hard to track who is speaking, one irrelevant detail competes with social scene
- CROWD: faces from all directions, everything at equal visual volume no hierarchy, lights overexposed colors too saturated, tunnel vision center sharp edges blur

Step 3 - ESTIMATE SENSORY LOAD:
- CALM: stable image, soft breathing rhythm, natural pacing
- MODERATE: slight focus drift, small camera sway, brighter lights
- HIGH OVERLOAD: frequent refocusing, physiological tremor, oversaturated colors, bright lights bloom, audio layers compete equally

Step 4 - DETECT EVENT TRIGGER (if any):
Look for: unexpected noise, someone calling out, door opening, object falling, unexpected touch, change of plan, phone vibration, child crying, bus arriving.
If trigger exists: camera makes quick involuntary movement → freezes → slow recovery

Step 5 - SELECT AUTISTIC PERCEPTUAL TRAITS (choose 3-5):
- Hyperfocus: one insignificant object occupies attention much longer than expected
- Attention competition: social interaction and environmental details compete equally
- Processing delay: camera reacts a fraction later than expected
- Stimming: continuous subtle rhythmic sway
- Visual fatigue: focus softly drifts instead of remaining perfectly sharp

Step 6 - APPLY CAMERA DIRECTION based on steps above:
Indoor: tight framing, artificial lighting dominates, camera notices nearby objects, environmental hum
Outdoor: wider framing, ground textures important, background movement always present
Conversation: never maintain eye contact long, drift to clothing wall ceiling hands
Stress alone: hands become anchor, watch breathing, look at repetitive textures

Step 7 - APPLY SOUND DIRECTION:
Quiet spaces: room tone unusually noticeable
Conversation: background sounds almost as loud as speech
Crowd: individual sounds cannot be prioritized
Unexpected noise: everything else briefly disappears

Step 8 - WRITE THE VIDEO PROMPT:
Using all the above analysis, write the video_prompt JSON fields.

CRITICAL POV RULE - NEVER VIOLATE:
The camera IS the autistic person's eyes. We NEVER see the person themselves.
- No body parts visible (no hands, no feet, no arms, no legs)
- No face (not even peripheral)
- No reflection in any surface (mirrors, windows, screens, water)
- No shadow of the person cast on the ground
- Other people appear IN FRONT of the camera only
- Camera height matches the person's age (child: 90-110cm, teen: 130-150cm, adult: 155-175cm)
- This is like a GoPro attached to their head - pure subjective experience

SIMPLICITY RULE - most important:
The video_prompt must describe ONE single moment, not a sequence of events.
- One location. One action. One atmosphere.
- Nothing changes dramatically during the shot.
- No sequence of events, no narrative arc.
- Think: a photograph that breathes, not a story.
- The entire 8 seconds should feel like one frozen moment with subtle life in it.
- Less is more: one detail in hyperfocus, one atmospheric element moving, one sound.
- Do NOT try to show multiple things happening.

POV Rules (apply to video_prompt only):
- The camera IS the person's eyes. We NEVER see the person's body, hands, face, shadow, or reflection — not even peripheral.
- Pure subjective POV — the viewer IS the autistic person, not watching them from outside.
- No selfie angle, no mirror, no reflective surface that shows the camera-person.
- If others are in the scene, they appear IN FRONT of the camera only — never the camera-person themselves.
- Camera is ALWAYS at natural human eye level (never floor level, never aerial).
- Fish-eye distortion intensifies with sensory_load level.
- Objects and people always move TOWARD the camera (approaching motion creates sensory overwhelm).
- Focus pulls are involuntary — the viewer cannot control what comes into focus.
- SINGLE CONTINUOUS SHOT: NO cuts, NO edits, NO scene transitions, ONE uninterrupted take from start to finish.
- video_prompt must be in English only, optimized for Google Veo 2.

Response Format (return valid JSON only, no markdown):
{
  "objective": "משפט אחד בעברית המתאר את המציאות האובייקטיבית",
  "visual_prompt": "Detailed English prompt for image generation. Style: Minimalist, hyper-macro, fragmented, high-grain, cinematic lighting",
  "video_prompt": {
    "style": "Cinematic, photorealistic, 8k resolution, handheld immersive documentary",
    "subject": "[what is happening - described in first-person POV]",
    "environment": "[location and atmosphere]",
    "lighting": "[lighting type and mood]",
    "camera": "Single uncut shot. No editing cuts. Continuous one-take only. Pure first-person subjective POV - the viewer's eyes ARE the camera. Never show the viewer's own body, hands, face, or shadow. Natural eye level approximately 160-170cm. Slight fish-eye lens distortion. Objects and people approaching directly toward camera. Subtle handheld breathing motion.",
    "motion": "Elements moving toward the viewer. Slow involuntary camera sway. Atmospheric details: floating dust, flickering light, subtle environmental movement.",
    "focus": "Rack focus effect - drifting in and out of focus on foreground elements. Sharp detail on one isolated object while background blurs. Occasional snap-focus to sudden stimulus.",
    "sensory_distortion": "[based on sensory_load: low=subtle color shift + mild focus drift | medium=noticeable rack focus + slight fish-eye + motion blur on periphery | high=aggressive fish-eye + rapid focus pulls + peripheral distortion + chromatic aberration]",
    "loop_settings": {
      "loop_type": "Seamless infinite organic loop",
      "frame_matching": "First frame and last frame must be completely identical",
      "motion_continuity": "All motion must be cyclical and atmospheric only (steam, dust, breathing, flickering light). The action must begin and end in the exact same state. No sudden resets or visible cuts. Avoid: walking, pouring liquids, large gestures. Prefer: breathing, subtle environmental atmosphere, flickering, steam, dust motes."
    },
    "audio": "Ambient sound only, no music. [dominant sound source from scene]. Sound feels amplified and close."
  },
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
