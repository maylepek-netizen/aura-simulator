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

function buildFilter2Prompt(situation: string, filter1Output: string, cameraHeight: string): string {
  return (
    "Based on these autism research parameters:\n" + filter1Output + "\n\n" +
    "Situation: \"" + situation + "\"\n" +
    "Camera height: " + cameraHeight + "\n\n" +
    "You are a film director. Select ONE directing approach from each category below based on the research parameters, then write a single Veo video prompt paragraph.\n\n" +
    "UNIVERSAL RULE (applies to everything): The world moves TOWARD the camera. People walk toward it, faces lean in, objects feel like they approach. The camera is the target of everything in the scene. No element moves away or past - everything converges.\n\n" +
    "SOCIAL STATE - pick one based on people_present and social_threat_level:\n" +
    "ALONE: camera drifts aimlessly, fixates on irrelevant details, time feels stretched, environment is the main character\n" +
    "ONE FAMILIAR PERSON: subtle misalignment, expressions hard to read, silences feel heavy, searching for social cues\n" +
    "ONE STRANGER: physical proximity overwhelming, eye contact threatening, movements unpredictable, uncertainty constant\n" +
    "SMALL GROUP: camera jumps between faces rapidly, hard to track conversation, who speaks next? feeling of disconnection\n" +
    "CROWD: faces from all directions, everyone too close, no safe direction to look, sense of being engulfed\n\n" +
    "ENVIRONMENT - pick one:\n" +
    "SMALL ENCLOSED: walls feel closer than they are, textures dominate, artificial light aggressive, physical pressure\n" +
    "LARGE ENCLOSED: disorienting scale, repetitive architecture, multiple directions compete, hard to orient\n" +
    "OPEN NATURE: vast and detached, no anchor points, natural patterns repeat, environment feels indifferent\n" +
    "URBAN: stimulation from all directions, no boundary between elements, constant background activity\n" +
    "TRANSITIONAL: no grounding, passing elements, in-between feeling, nothing stable\n\n" +
    "ACTIVITY - pick one:\n" +
    "PASSIVE: time stagnant, attention drifts, no progression\n" +
    "FOCUSED TASK: hyper-detail on task elements, interruptions feel catastrophic\n" +
    "REPETITIVE: rhythm becomes dominant, actions loop, no sense of progress\n" +
    "DECISION: multiple options compete visually, paralysis, everything equal weight\n" +
    "NAVIGATION: environment shifts, landmarks unclear, movement lacks confidence\n" +
    "INTERACTION: timing off, responses delayed, expressions unreadable\n\n" +
    "CONTROL LEVEL:\n" +
    "HIGH: stable, predictable, cause and effect clear\n" +
    "PARTIAL: minor inconsistencies, subtle wrongness\n" +
    "LOW: events arbitrary, environment changes without reason\n\n" +
    "PACING:\n" +
    "SLOW: moments prolonged, details linger\n" +
    "IRREGULAR: events out of sync, rhythm broken\n" +
    "FAST: actions overlap, no pause, time compressed\n\n" +
    "TECHNICAL RULES (always):\n" +
    "- First-person POV only, never show protagonist\n" +
    "- Single continuous shot, no cuts\n" +
    "- Photorealistic, no AI artifacts, no text\n" +
    "- LOOP: open and close on identical static texture from this specific scene\n" +
    "- Colors slightly oversaturated, lighting slightly too harsh\n" +
    "- Subtle rhythmic camera sway throughout\n\n" +
    "Return ONLY this JSON:\n" +
    "{\n" +
    '  "camera_behavior": "description",\n' +
    '  "selected_approach": "social/environment/activity/control/pacing choices made",\n' +
    '  "final_veo_prompt": "ONE paragraph combining all selected approaches for this exact situation. First-person POV. Photorealistic. Single continuous shot."\n' +
    "}"
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
    const camHeight = ageApproximateCameraHeight(Number(age));
    const filter2Raw = await geminiCall(apiKey, buildFilter2Prompt(String(situation), filter1Raw, camHeight));

    // Parse all three
    const filter1Output = JSON.parse(filter1Raw);
    const mainResult = JSON.parse(mainRaw);
    const filter2 = JSON.parse(filter2Raw);

    console.log("=== FILTER 1 - Research Analysis ===");
    console.log(JSON.stringify(filter1Output, null, 2));
    console.log("=== FILTER 2 - Cinematic Direction ===");
    console.log(JSON.stringify(filter2, null, 2));
    console.log("=== FINAL VIDEO PROMPT ===");
    console.log(filter2.final_veo_prompt ?? "(none)");

    // Attach video_prompt and cinematic metadata to the main result
    mainResult.video_prompt = filter2.final_veo_prompt ?? "";
    mainResult.cinematic_direction = {
      camera_behavior: filter2.camera_behavior,
      selected_approach: filter2.selected_approach,
    };

    return NextResponse.json(mainResult);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
