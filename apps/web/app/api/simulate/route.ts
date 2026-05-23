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

function buildFilter2Prompt(filter1: string, age: number, situation: string): string {
  const camHeight = ageApproximateCameraHeight(age);
  return (
    "Based on these autism research parameters for the situation \"" + situation + "\":\n" +
    filter1 + "\n\n" +
    "Generate cinematic directing instructions for a Veo first-person POV video. Camera height: " + camHeight + ".\n\n" +
    "Apply these universal principles:\n" +
    "- Everything moves TOWARD the camera (threatening world closing in)\n" +
    "- Proportions distorted: threats appear larger, safe elements smaller\n" +
    "- MASKING: Camera has a slight delay after every stimulus - deliberate and calculated, never spontaneous. Brief micro-freeze before reacting. Always one beat behind - processing, performing, calculating.\n" +
    "- Time distortion: threatening = fast, boring = slow\n" +
    "- ALIEN WORLD: Colors slightly wrong, like reality was copied with a small error. People's movements look like an incomprehensible ritual. Ordinary objects appear strange and fascinating. Everyone knows a secret social rule except you.\n" +
    "- Direct eye contact from people = intense and threatening\n" +
    "- People walk TOWARD camera\n" +
    "- Faces fill more frame than reality\n" +
    "- Unsynced mouth movements\n" +
    "- Ambiguous threatening expressions\n\n" +
    "🚫 ABSOLUTE RULE: We NEVER see the protagonist. Camera IS their eyes facing OUTWARD. No face, body, reflection, or shadow of the protagonist.\n" +
    "🚫 NO AI ARTIFACTS: No ghosting, no morphing, no walking through walls. Photorealistic only. If complex — simplify.\n\n" +
    "Return ONLY this JSON:\n" +
    "{\n" +
    '  "camera_behavior": "description",\n' +
    '  "focus_strategy": "description",\n' +
    '  "proximity_effect": "description",\n' +
    '  "time_perception": "description",\n' +
    '  "key_visual_moments": ["moment1", "moment2", "moment3"],\n' +
    '  "directing_rules": ["rule1", "rule2", "rule3"],\n' +
    '  "final_veo_prompt": "ONE paragraph — the actual Veo prompt combining all the above into a single photorealistic first-person POV shot description for this exact situation. Single continuous shot, no cuts. Include diegetic audio."\n' +
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
    const filter2Raw = await geminiCall(apiKey, buildFilter2Prompt(filter1Raw, Number(age), String(situation)));

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
      focus_strategy: filter2.focus_strategy,
      proximity_effect: filter2.proximity_effect,
      time_perception: filter2.time_perception,
      key_visual_moments: filter2.key_visual_moments,
      directing_rules: filter2.directing_rules,
    };

    return NextResponse.json(mainResult);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
