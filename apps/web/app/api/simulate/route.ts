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

async function geminiCall(apiKey: string, prompt: string): Promise<string> {
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
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const lastBrace = cleaned.lastIndexOf("}");
  return lastBrace !== -1 ? cleaned.substring(0, lastBrace + 1) : cleaned;
}

async function geminiCallText(apiKey: string, prompt: string): Promise<string> {
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
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
    "🚫 ABSOLUTE: First-person POV only. Never show protagonist. No AI artifacts. Photorealistic. Single continuous shot.\n\n" +
    "Return ONLY this JSON:\n" +
    "{\n" +
    '  "camera_behavior": "description",\n' +
    '  "focus_strategy": "description",\n' +
    '  "masking_visuals": "description",\n' +
    '  "sensory_escalation": "description",\n' +
    '  "key_visual_moments": ["moment1", "moment2", "moment3"],\n' +
    '  "final_veo_prompt": "ONE paragraph - the actual Veo prompt for this exact situation combining all techniques above. Photorealistic first-person POV. Single continuous shot. Include diegetic sound design."\n' +
    "}"
  );
}

function buildFilter3Prompt(veoPrompt: string, overloadLevel: number): string {
  return (
    "Rewrite this Veo prompt with these additions only:\n\n" +
    veoPrompt + "\n\n" +
    "Add these effects (scale by overload level " + overloadLevel + "/10):\n" +
    "1. SPEED: All camera movement is slow and weighted like a real human body. No fast movement.\n" +
    "2. ALIEN INTENSITY: The world feels profoundly wrong - colors too saturated, lighting too harsh, people's expressions unreadable and slightly threatening. Scale intensity with overload level.\n" +
    "3. CONVERGENCE: Everything moves toward the camera. People approach, faces lean in, objects feel like they close in.\n\n" +
    "Return ONLY one paragraph. Keep everything from the original prompt."
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
    '  "ambient_sound": "ALWAYS pick a sound category — never return null or omit this field. Even for alone in a quiet room or meditating — pick home which represents the subtle ambient hum of a quiet space. There is always some ambient sound in any environment. Pick ONE from this exact list: crowd (mall/market/waiting room/any public space with people), children (school/playground/kids nearby), storm (thunder/rain/wind/bad weather), alarm (fire alarm/siren/emergency), restaurant (dining/food court), transport (train/bus/car/airport transit), nature (forest/park/birds/outdoors), party (celebration/event/music), classroom (school lesson/lecture), street (urban street/pedestrians), hospital (medical facility/clinic), home (quiet home/bedroom/alone indoors — use for calm or solitary situations), supermarket (grocery store/shop), office (workplace/open plan), beach (seaside/waves), construction (building site/drilling), library (quiet library/study), sports (gym/stadium/game), airport (terminal/departures), cafe (coffee shop/small cafe), nightclub (club/loud music/dancing), traffic (highway/busy road/cars), park (outdoor park/families), baby (infant/baby sounds), dogs (barking/dog park), forest (deep woods/insects/birds), rain (rainfall/drizzle — no thunder)"\n' +
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

    // Parse all three
    const filter1Output = JSON.parse(filter1Raw);
    const mainResult = JSON.parse(mainRaw);
    const filter2 = JSON.parse(filter2Raw);

    // Filter 3: add speed, alien intensity, convergence
    const filter3Raw = await geminiCallText(apiKey, buildFilter3Prompt(
      filter2.final_veo_prompt ?? "",
      filter1Output.sensory_overload_level ?? 5
    ));

    console.log("=== FILTER 1 - Research Analysis ===");
    console.log(JSON.stringify(filter1Output, null, 2));
    console.log("=== FILTER 2 - Cinematic Direction ===");
    console.log(JSON.stringify(filter2, null, 2));
    console.log("=== FILTER 3 - Visual Effects ===");
    console.log(filter3Raw);

    // Attach video_prompt and cinematic metadata to the main result
    mainResult.video_prompt = filter3Raw;
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
