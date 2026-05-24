import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const RESEARCH_CONTEXT =
  "Key research grounding this simulation:\n" +
  "[DEP] Milton et al. — Double Empathy Problem (2022): 'the double empathy problem refers to a breakdown in mutual understanding — a problem for both parties — interaction between autistic and non-autistic people as a primarily mutual and interpersonal issue.' → Social situations feel confusing and unsafe not because of a deficit but because of a genuine mismatch in communication styles.\n" +
  "[EPF] Mottron et al. — Enhanced Perceptual Functioning (2006): 'locally oriented visual and auditory perception, enhanced low-level discrimination… autonomy of low-level information processing toward higher-order operations.' → Small details are processed more intensely than the whole; a button or a texture may dominate over a face.\n" +
  "[G-AUD] Grandin — Auditory experience: 'My hearing is like having a hearing aid with the volume control stuck on super loud… an open microphone that picks up everything… I can't modulate incoming auditory stimulation.' → All sounds arrive at equal volume; background noise competes with speech.\n" +
  "[G-TAC] Grandin — Tactile experience: 'petticoats itched and scratched… Most people adapt… Even now… it takes me three to four days to fully adapt.' → Clothing, textures, physical contact remain consciously present rather than fading to background.\n" +
  "Additional grounding concepts: monotropism (attention tunnels deeply into one thing, switching is costly); interoception differences (internal body signals — hunger, pain, heartbeat — are either amplified or absent); masking/camouflaging (constant conscious effort to perform neurotypical behavior drains cognitive resources); emotional processing differences (emotions are felt intensely but may not surface in expected facial expressions).";

const SYSTEM_PROMPT =
  "You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation. " +
  "Your output is grounded in peer-reviewed autism research. Return ONLY valid JSON. All text in English.\n\n" +
  RESEARCH_CONTEXT;

function captionVoice(gender: string): string {
  const g = gender.toLowerCase();
  if (g === "female") return "first-person feminine inner voice, written as a girl or woman experiencing this moment";
  if (g === "male") return "first-person masculine inner voice, written as a boy or man experiencing this moment";
  return "first-person neutral inner voice, written without gendered assumptions";
}

function ageApproximateCameraHeight(age: number): string {
  if (age >= 5 && age <= 12) return "approximately 1.0m";
  if (age >= 13 && age <= 17) return "approximately 1.5m";
  return "approximately 1.6-1.7m";
}

async function geminiRaw(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 16000 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message ?? "Gemini error");
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// For JSON responses: strips markdown fences and trims to last closing brace
async function geminiCall(apiKey: string, prompt: string): Promise<string> {
  const raw = await geminiRaw(apiKey, prompt);
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const lastBrace = cleaned.lastIndexOf("}");
  return lastBrace !== -1 ? cleaned.substring(0, lastBrace + 1) : cleaned;
}

// For plain-text responses: strips markdown fences only, no brace trimming
async function geminiCallText(apiKey: string, prompt: string): Promise<string> {
  const raw = await geminiRaw(apiKey, prompt);
  return raw.replace(/```/g, "").trim();
}

function buildFilter1Prompt(age: number, gender: string, situation: string): string {
  return (
    "Analyze this situation through an autism research lens.\n" +
    "Situation: \"" + situation + "\"\n" +
    "Person: " + age + " years old, " + gender + "\n\n" +
    "Return ONLY this JSON:\n" +
    "{\n" +
    '  "social_threat_level": 0,\n' +
    '  "sensory_overload_level": 0,\n' +
    '  "unexpected_change": false,\n' +
    '  "alone_or_isolated": false,\n' +
    '  "people_present": false,\n' +
    '  "stranger_interaction": false,\n' +
    '  "forced_interaction": false,\n' +
    '  "escape_available": false,\n' +
    '  "relevant_research": ["monotropism"]\n' +
    "}\n\n" +
    "social_threat_level and sensory_overload_level are 0-10. " +
    "relevant_research picks from: monotropism, sensory_processing, masking, interoception, double_empathy, executive_function."
  );
}

function buildFilter2Prompt(filter1: string, age: number, situation: string): string {
  const camHeight = ageApproximateCameraHeight(age);
  return (
    "Based on these autism research parameters for the situation \"" + situation + "\":\n" +
    filter1 + "\n\n" +
    "You are a film director creating a first-person POV simulation of autistic sensory experience. Camera height: " + camHeight + ".\n\n" +
    "Generate cinematic directing instructions based on these professional techniques:\n\n" +
    "VISUAL LANGUAGE:\n" +
    "- Focus hunting: camera fixates on irrelevant details (table texture, fabric, water drop) while faces of speaking people remain completely blurred\n" +
    "- Overexposed fluorescent lighting that appears to attack the eyes with lens flares\n" +
    "- As overwhelm builds: camera loses smooth movement, starts jumping and shaking\n" +
    "- Tunnel vision effect: screen edges darken/blur as overload peaks\n" +
    "- Depth of field: wrong things are sharp, important things are blurred\n\n" +
    "MASKING (show the invisible effort):\n" +
    "- Voiceover is calm and logical WHILE visuals are chaotic - showing effort to maintain thought\n" +
    "- Hands visible in frame: clenched fists, nails digging into palm, fidgeting object (stimming)\n" +
    "- Forced eye contact: camera drifts away from person's eyes, then forcibly returns - 3-4 times\n" +
    "- Processing lag: 2 second silence after question before response, frame slightly shaking during processing\n" +
    "- Forced gaze: camera keeps escaping to shoulder, floor, corner - then forcing itself back to eyes\n\n" +
    "ALIEN WORLD:\n" +
    "- Colors 2% too saturated - like reality was copied with a small error\n" +
    "- People's movements look like an incomprehensible ritual\n" +
    "- Ordinary objects appear fascinating like alien artifacts\n" +
    "- Everyone knows a secret social rule except you\n\n" +
    "SENSORY OVERLOAD (scale by sensory_overload_level):\n" +
    "- Micro-sounds amplified disproportionately: footsteps, rustling bags, distant cough at equal volume to nearby speech\n" +
    "- All audio layers at same volume = wall of sound impossible to decode\n" +
    "- High frequency tinnitus undertone for physical discomfort\n" +
    "- Camera shake increases with overload level\n\n" +
    "ESCALATION PATTERN:\n" +
    "- Start calm and slow\n" +
    "- Stimuli accumulate gradually\n" +
    "- Cuts get faster and more disorienting as overload builds\n" +
    "- Hard cut to silence at peak = dissociation moment\n\n" +
    "🚫 ABSOLUTE: First-person POV only. Never show protagonist. No AI artifacts. Photorealistic. Single continuous shot.\n" +
    "⚠️ ABSOLUTE RULE: NO subtitles, NO captions, NO text overlays, NO written words of any kind anywhere in the video. The video is purely visual. No exceptions.\n\n" +
    "Return ONLY this JSON:\n" +
    "{\n" +
    '  "camera_behavior": "description",\n' +
    '  "focus_strategy": "description",\n' +
    '  "masking_visuals": "description",\n' +
    '  "sensory_escalation": "description",\n' +
    '  "key_visual_moments": ["moment1", "moment2", "moment3"],\n' +
    '  "final_veo_prompt": "ONE paragraph - the actual Veo prompt for this exact situation combining all techniques above. Photorealistic first-person POV. Single continuous shot. Include diegetic sound design. STIMMING MOVEMENT: The entire video has a subtle continuous rhythmic sway - gentle forward/back rocking that reflects the body\'s self-regulation. Low overload = barely noticeable slow sway every 4-5 seconds. High overload = more pronounced rhythmic rocking every 1-2 seconds. Always smooth and repetitive, never random or jerky. SEAMLESS LOOP: Video must open AND close on the exact same static extreme close-up of a surface or texture (floor tile, fabric, wall). All movement between is one continuous slow drift. Last 2 seconds must visually match first 2 seconds. Loop must be completely invisible."\n' +
    "}"
  );
}

function buildFilter3Prompt(situation: string, filter2Output: string, monologue: string[]): string {
  return (
    "You have this situation: \"" + situation + "\"\n" +
    "And this cinematic direction: " + filter2Output + "\n\n" +
    "The internal monologue for this situation is:\n" +
    monologue.map((t, i) => (i + 1) + ". " + t).join("\n") + "\n\n" +
    "Use the monologue as a visual script - each thought should correspond to what the camera sees:\n" +
    "- If monologue mentions eyes → camera focuses on eyes\n" +
    "- If monologue mentions lights → camera drifts to lights\n" +
    "- If monologue mentions exit/escape → camera searches for exit\n" +
    "- If monologue mentions a specific detail → camera fixates on it\n" +
    "The video is the visual stream of these exact thoughts.\n\n" +
    "Write the veo prompt as if YOU are the autistic person experiencing this. Not describing from outside - from inside. 'I see...', 'everything feels...', 'I cannot stop looking at...'\n\n" +
    "Rewrite the final_veo_prompt as ONE specific paragraph for THIS exact situation.\n\n" +
    "Rules:\n" +
    "- Keep everything from Filter 2 but make it specific to this situation\n" +
    "- If people are present: they are close, their eyes meet the camera directly, they move toward the camera\n" +
    "- If alone: environment feels vast and strange, small details become hypnotic\n" +
    "- Scale intensity by the social_threat_level and sensory_overload_level values\n" +
    "- SEAMLESS LOOP - PROFESSIONAL DIRECTING:\n" +
    "  The video is structured as an 'accordion take':\n" +
    "  ANCHOR POINT (second 0 and second 5): Camera rests on a static, controlled anchor - looking down at hands in lap, or at a fixed surface texture. Camera completely still. This is the loop join point.\n" +
    "  MOVEMENT PATH: Camera rises from anchor → turns toward the threatening element (person/crowd/environment) → sensory overload builds → camera escapes sideways to wall/floor/window → camera falls back heavily to anchor position.\n" +
    "  The first and last frame are IDENTICAL: same angle, same framing, same focus depth, same lighting.\n" +
    "  Movement feels physiological - like breathing out and releasing muscles at start and end.\n" +
    "- EVERYTHING MOVES TOWARD THE POV:\n" +
    "  This is critical - the world moves AT the viewer, not past them.\n" +
    "  People run TOWARD the camera, not across it.\n" +
    "  Faces turn and look DIRECTLY at the camera.\n" +
    "  Objects feel like they are approaching.\n" +
    "  The environment closes in from all sides.\n" +
    "  There is no safe direction - everything converges on the POV.\n" +
    "  The viewer feels like the target of everything in the scene.\n" +
    "  Scale the intensity of this convergence by social_threat_level and sensory_overload_level.\n" +
    "- NO subtitles, NO text, NO AI artifacts\n" +
    "- Single continuous shot, photorealistic, first-person POV\n" +
    "- Subtle rhythmic camera sway throughout\n\n" +
    "SINGLE SCENE ONLY: The entire 5 seconds takes place in ONE location with ONE continuous camera movement. No cutting to different locations, no different perspectives, no montage. One scene, one movement, one loop.\n" +
    "LOOP STRUCTURE (strict):\n" +
    "  Second 0-1: camera starts on static anchor (hands, floor texture, or fixed object).\n" +
    "  Seconds 1-4: ONE slow continuous movement through the scene.\n" +
    "  Second 4-5: camera returns to EXACT same anchor as second 0.\n" +
    "  The path is: anchor → scene → anchor. Nothing else.\n\n" +
    "Return ONLY one paragraph. No JSON, no labels."
  );
}

function buildMainSchema(_age: number, gender: string): string {
  return (
    '{\n' +
    '  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },\n' +
    '  "overall_load": 0,\n' +
    '  "visual_effect": "glitch_heavy",\n' +
    '  "scene_caption": "10-15 word ' + captionVoice(gender) + ', describing this exact moment in the situation",\n' +
    '  "monologue": ["thought1","thought2","thought3","thought4","thought5","thought6","thought7","thought8"],\n' +
    '  "sensory_channels": { "auditory": "description", "visual": "description", "tactile": "description", "interoception": "description" },\n' +
    '  "emotions": ["emotion1","emotion2","emotion3"],\n' +
    '  "coping_actions": ["action1","action2","action3"],\n' +
    '  "masking_cost": "description",\n' +
    '  "research_tags": ["tag1","tag2"],\n' +
    '  "ambient_sound": "one word category that best matches this situation — choose from: crowd, children, storm, alarm, restaurant, transport, nature, party, classroom, street, hospital, home, supermarket, office, beach, construction, library, sports, airport, cafe, nightclub, traffic, park, baby, dogs, forest, rain"\n' +
    '}'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, situation } = body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    // Run Filter 1 (research analysis) and main simulation in parallel
    const [filter1Raw, mainRaw] = await Promise.all([
      geminiCall(apiKey, buildFilter1Prompt(Number(age), String(gender), String(situation))),
      geminiCall(
        apiKey,
        SYSTEM_PROMPT + "\n\nSimulate the internal autistic experience for:\n" +
        "Name: " + name + ", Age: " + age + ", Gender: " + gender + "\n" +
        "Situation: \"" + situation + "\"\n\n" +
        "Return this exact JSON (all text in English):\n" +
        buildMainSchema(Number(age), String(gender))
      ),
    ]);

    // Filter 2: cinematic directions from Filter 1 output
    const filter2Raw = await geminiCall(apiKey, buildFilter2Prompt(filter1Raw, Number(age), String(situation)));

    // Parse main result early so monologue is available for Filter 3
    const mainResult = JSON.parse(mainRaw);

    // Filter 3: intensity amplifier — plain text response, use geminiCallText to avoid brace trimming
    const filter3Prompt = buildFilter3Prompt(String(situation), filter2Raw, mainResult.monologue ?? []);
    const finalVideoPrompt = await geminiCallText(apiKey, filter3Prompt);

    // Parse Filter 1 and Filter 2
    const filter1Output = JSON.parse(filter1Raw);
    const filter2 = JSON.parse(filter2Raw);

    console.log("=== FILTER 1 - Research Analysis ===");
    console.log(JSON.stringify(filter1Output, null, 2));
    console.log("=== FILTER 2 - Cinematic Direction ===");
    console.log(JSON.stringify(filter2, null, 2));
    console.log("=== FILTER 3 - Intensity Amplifier ===");
    console.log(finalVideoPrompt);

    // Attach video_prompt and cinematic metadata to the main result
    mainResult.video_prompt = finalVideoPrompt;
    mainResult.cinematic_direction = {
      camera_behavior: filter2.camera_behavior,
      focus_strategy: filter2.focus_strategy,
      masking_visuals: filter2.masking_visuals,
      sensory_escalation: filter2.sensory_escalation,
      key_visual_moments: filter2.key_visual_moments,
    };

    return NextResponse.json(mainResult);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
