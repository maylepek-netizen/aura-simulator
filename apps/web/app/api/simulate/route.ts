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

function cameraHeight(age: number): string {
  if (age >= 5 && age <= 12)
    return "camera at 1 meter height showing what a child sees at eye level — other children's faces directly ahead, adults' waists and hands visible but their faces are far above, furniture surfaces are at face level. NOT under chairs or from floor level. Adults tower over the frame, the world is enormous and threatening from this exact standing child height";
  if (age >= 13 && age <= 17)
    return "camera at 1.5 meter height (teen eye level) — strong awareness of being watched and judged, peers fill the frame, intense social pressure visible in every face";
  return "camera at 1.7 meter height (adult eye level) — years of masking visible as tension in the frame, exhaustion underlies every moment despite appearing functional";
}

function stimmingMotion(load: number): string {
  if (load < 40)
    return "camera is mostly stable with slight involuntary micro-tremors and tiny random drifts — the body is trying to stay still but can't fully";
  if (load <= 70)
    return "camera moves in a slow gentle rhythmic forward-and-back rocking motion, steady pace, like the body is self-soothing through repetitive movement";
  return "camera rocks and jolts in urgent repetitive motion — fast rhythmic rocking or bouncing, intense and impossible to suppress, the stimming is overwhelming";
}

function captionVoice(gender: string): string {
  const g = gender.toLowerCase();
  if (g === "female") return "first-person feminine inner voice, written as a girl or woman experiencing this moment";
  if (g === "male") return "first-person masculine inner voice, written as a boy or man experiencing this moment";
  return "first-person neutral inner voice, written without gendered assumptions";
}

function loadVisuals(load: number): string {
  if (load < 40)
    return "subtle desaturation, slight blur on periphery, colors muted but recognisable";
  if (load <= 70)
    return "heavy tunnel vision with strong peripheral blur, colours oversaturated and slightly distorted, shallow depth of field, faces slightly out of focus";
  return "severe chromatic aberration with red/blue fringing, extreme overexposure on light sources, faces completely distorted, fast jump cuts, flickering, panic-inducing camera movement";
}

function ageApproximateCameraHeight(age: number): string {
  if (age >= 5 && age <= 12) return "approximately 1.0m";
  if (age >= 13 && age <= 17) return "approximately 1.5m";
  return "approximately 1.6-1.7m";
}

function buildVideoPromptInstructions(age: number, gender: string, situation: string): string {
  const camHeight = ageApproximateCameraHeight(age);

  return (
    "Write a single photorealistic Veo video prompt for: \"" + situation + "\". Camera height: " + camHeight + ".\n\n" +

    "ABSOLUTE RULES (never break these):\n" +
    "- Strict first-person POV. Camera IS the protagonist's eyes. Never show their face, body, or reflection.\n" +
    "- Single continuous shot. No cuts. No scene changes.\n" +
    "- Photorealistic. No morphing, no ghosting, no AI artifacts. Anatomically correct humans.\n" +
    "- No subtitles, no text overlays.\n" +
    "- LOOP: Open and close on the exact same static close-up texture. First and last frame identical.\n\n" +

    "SITUATION ANALYSIS - choose the approach that fits:\n\n" +

    "IF ALONE INDOORS (office, room, library, home):\n" +
    "- Camera drifts slowly across the space, never urgent\n" +
    "- Hyper-focus on irrelevant details: a pen, a crack in the wall, dust in light\n" +
    "- Fluorescent lights feel slightly too bright\n" +
    "- Silence feels thick and present\n" +
    "- Time feels stretched\n\n" +

    "IF ALONE OUTDOORS (street, park, bus stop):\n" +
    "- Camera moves at walking pace, stable\n" +
    "- Ground texture, pavement cracks, shoe soles get attention\n" +
    "- Heat or cold feels physical and present\n" +
    "- Passing strangers feel slightly threatening\n\n" +

    "IF WITH ONE FAMILIAR PERSON:\n" +
    "- Their face is visible but expressions hard to decode\n" +
    "- Camera drifts away from their eyes, then forces itself back\n" +
    "- Processing delay: slight hesitation before camera responds to them\n" +
    "- Their proximity feels slightly too close\n\n" +

    "IF WITH A STRANGER:\n" +
    "- Their face fills 50-60% of frame, uncomfortably close\n" +
    "- Eyes too intense, direct, unblinking\n" +
    "- Mouth movements feel slightly out of sync\n" +
    "- Camera wants to look away but keeps returning\n" +
    "- Their body leans toward camera\n\n" +

    "IF IN A SMALL GROUP (2-5 people):\n" +
    "- Camera jumps between faces, cannot settle\n" +
    "- Hard to track who is speaking\n" +
    "- Multiple voices feel like overlapping noise\n" +
    "- One irrelevant detail (a button, a sound) competes with the social scene\n\n" +

    "IF IN A CROWD (mall, party, classroom, event):\n" +
    "- Faces from all directions, all too close\n" +
    "- Everything at equal visual volume - no hierarchy\n" +
    "- Lights overexposed, colors too saturated\n" +
    "- Camera shakes slightly more with overload\n" +
    "- Tunnel vision: center sharp, edges blur\n\n" +

    "IF UNEXPECTED CHANGE OR DISRUPTION:\n" +
    "- Camera fixates obsessively on the wrong/changed element\n" +
    "- Cannot look away even when trying\n" +
    "- Everything else feels suddenly foreign\n" +
    "- The changed thing dominates 60% of frame\n\n" +

    "IF IN NATURE OR QUIET SPACE:\n" +
    "- Slow drifting camera, unhurried\n" +
    "- Natural textures get close attention: leaves, bark, water\n" +
    "- Sounds feel present but non-threatening\n" +
    "- A rare moment of sensory peace\n\n" +

    "ALWAYS APPLY:\n" +
    "- Focus drifts in and out - never perfectly sharp\n" +
    "- Subtle rhythmic sway throughout (stimming)\n" +
    "- Colors slightly oversaturated\n" +
    "- Slight physiological tremor - never completely still\n" +
    "- Reality feels like a perfect copy with small errors\n\n" +

    "Output: one short focused paragraph. No labels, no lists."
  );
}

function buildSchema(age: number, gender: string, situation: string): string {
  return (
    '{\n' +
    '  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },\n' +
    '  "overall_load": 0,\n' +
    '  "visual_effect": "glitch_heavy",\n' +
    '  "scene_caption": "10-15 word ' + captionVoice(gender) + ', describing this exact moment in the situation",\n' +
    '  "video_prompt": "' + buildVideoPromptInstructions(age, gender, situation).replace(/"/g, "'").replace(/[\r\n\t]/g, " ").replace(/  +/g, " ") + '",\n' +
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

    const schema = buildSchema(Number(age), String(gender), String(situation));

    const userPrompt =
      "Simulate the internal autistic experience for:\n" +
      "Name: " + name + ", Age: " + age + ", Gender: " + gender + "\n" +
      "Situation: \"" + situation + "\"\n\n" +
      "Return this exact JSON (all text in English):\n" +
      schema;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message ?? "Gemini error" }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
