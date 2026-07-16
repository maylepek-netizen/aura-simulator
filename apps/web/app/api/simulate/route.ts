import { NextRequest, NextResponse } from "next/server";
import { generateSceneImage } from "@/lib/gemini";

const GEMINI_MODEL = "gemini-2.5-flash";

// ─── Video prompt: two-step classification pipeline ──────────────────────────
// Step 1: a fast Gemini call classifies the situation (environment A–F +
// optional modifier + load). Step 2: we assemble the exact directing text from
// the blocks below. The video_prompt is built by OUR code, not written by Gemini.

type Environment = "A" | "B" | "C" | "D" | "E" | "F";
type Modifier = "monotropy" | "sudden_stimulus" | "hyperfocus_positive" | null;
type LoadLevel = "low" | "medium" | "high" | "shutdown";

// Fast classification call — returns the environment/modifier/load for a situation.
async function classifyEnvironment(situation: string, apiKey: string): Promise<{
  environment: Environment;
  modifier: Modifier;
  load_level: LoadLevel;
}> {
  const prompt =
    `Classify this situation for an autism sensory simulation. Return ONLY valid JSON.\n\n` +
    `Situation: ${situation}\n\n` +
    `Environment types:\n` +
    `A = home/familiar space (low load)\n` +
    `B = family member or close friend — includes BOTH calm interaction AND emotional conflict/yelling (parent yelling, argument at home = B not A)\n` +
    `C = interaction with stranger/service worker\n` +
    `D = classroom/work meeting/small group (3-6 people)\n` +
    `E = street/mall/public transport/crowded outdoor\n` +
    `F = large crowd/party/event/shutdown level\n\n` +
    `Modifier (choose ONE or null):\n` +
    `- monotropy: situation mentions focusing on specific object/detail\n` +
    `- sudden_stimulus: situation mentions sudden noise/unexpected event\n` +
    `- hyperfocus_positive: situation involves beloved hobby/interest\n\n` +
    `Return: {"environment": "X", "modifier": "X or null", "load_level": "low|medium|high|shutdown"}`;

  const fallback = { environment: "A" as Environment, modifier: null as Modifier, load_level: "medium" as LoadLevel };

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
        }),
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const env: Environment = ["A", "B", "C", "D", "E", "F"].includes(parsed.environment) ? parsed.environment : "A";
    const mod: Modifier = ["monotropy", "sudden_stimulus", "hyperfocus_positive"].includes(parsed.modifier) ? parsed.modifier : null;
    const load: LoadLevel = ["low", "medium", "high", "shutdown"].includes(parsed.load_level) ? parsed.load_level : "medium";
    console.log("CLASSIFICATION RESULT:", JSON.stringify({ environment: env, modifier: mod, load_level: load }));
    return { environment: env, modifier: mod, load_level: load };
  } catch {
    return fallback;
  }
}

// Second Gemini call: writes the full Veo prompt from the classification, using
// a directing style chosen per environment/modifier. Falls back to a simple
// deterministic prompt if the call fails.
async function buildVeoPrompt(
  classification: { environment: Environment; modifier: Modifier; load_level: LoadLevel },
  situation: string,
  age: number,
  apiKey: string
): Promise<string> {
  const height = age <= 12 ? 105 : age <= 17 ? 145 : 165;

  const ENVIRONMENT_CONTEXT: Record<Environment, string> = {
    A: "calm familiar home space, low stimulation, safe",
    B: "with close family/friend - could be calm or conflict",
    C: "interacting with a stranger - uncomfortable proximity",
    D: "classroom or small group - attention splitting between speakers",
    E: "busy public space - street, mall, transport - sensory overload",
    F: "large crowd or event - shutdown level overload"
  };

  const DIRECTING_STYLES = [
    "rack focus: sharp on one face, everything else blurs, then slowly refocuses on a different detail",
    "slow head-turn pan: camera drifts across the scene as if scanning, pausing involuntarily on an irrelevant detail",
    "sudden snap: camera completely still, then a quick involuntary turn toward a sound or movement, then slow return",
    "hyperfocus drift: camera slowly orbits one specific texture or object while the social scene continues in soft background",
    "sensory burn: slight overexposure on light sources, camera barely moves but everything feels too bright and too close",
    "delayed response: camera turns toward someone speaking 0.5 seconds too late, always catching up to the conversation"
  ];

  // Pick a directing style based on environment and modifier
  const styleIndex = classification.environment === 'A' ? 3 :
    classification.environment === 'B' ? (classification.modifier === 'sudden_stimulus' ? 2 : 0) :
    classification.environment === 'C' ? 4 :
    classification.environment === 'D' ? 0 :
    classification.environment === 'E' ? 5 :
    1; // F

  const directingStyle = DIRECTING_STYLES[styleIndex];

  const prompt = `You are a cinematic director. Create a Veo 3.1 Fast video prompt.

THE SITUATION IS THE MOST IMPORTANT THING:
"${situation}"

Everything in the video must directly reflect THIS specific situation.
The setting, the people, the sounds, the details - all must match exactly what is described above.

USER PROFILE:
- Age: ${age} years old → Camera height: ${height}cm
- Environment classification: ${ENVIRONMENT_CONTEXT[classification.environment]}

DIRECTING STYLE FOR THIS SCENE:
${directingStyle}

Now write a 100-130 word video prompt that:
1. STARTS by establishing the exact setting from the situation above
2. Describes the specific people/objects that would be in THIS situation
3. Applies the directing technique (shaky handheld, rack focus, overexposure)
4. Includes specific ambient sounds from THIS situation
5. Ends with seamless loop instruction

The situation "${situation}" must be clearly recognizable in the video.

Write ONLY the prompt. No explanation.`;

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      }
    );
    if (!res.ok) return fallbackPrompt(situation, height, directingStyle);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim() || fallbackPrompt(situation, height, directingStyle);
  } catch {
    return fallbackPrompt(situation, height, directingStyle);
  }
}

function fallbackPrompt(situation: string, height: number, style: string): string {
  return `First-person POV at ${height}cm eye level. Scene: ${situation}. ${style}. White light-skinned people. Photorealistic 8-second loop. Audio: ambient sounds at overwhelming equal volume, all competing simultaneously.`;
}

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

function buildSchema(gender: string): string {
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

    const schema = buildSchema(String(gender));

    const userPrompt =
      "Simulate the internal autistic experience for:\n" +
      "Name: " + name + ", Age: " + age + ", Gender: " + gender + "\n" +
      "Situation: \"" + situation + "\"\n\n" +
      "Return this exact JSON (all text in English):\n" +
      schema;

    // Kick off the fast classification in parallel with the main simulation call.
    const classificationPromise = classifyEnvironment(String(situation), apiKey);

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey,
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
      const errText = await res.text();
      console.error("Gemini API error status:", res.status);
      console.error("Gemini API error body:", errText);
      let err: Record<string, unknown> = {};
      try { err = JSON.parse(errText); } catch { err = {}; }
      return NextResponse.json({ error: (err as any)?.error?.message ?? "Gemini error" }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    // Build the video_prompt: a second Gemini call writes the full Veo prompt
    // from the classification + a directing style.
    const classification = await classificationPromise;
    result.video_prompt = await buildVeoPrompt(classification, String(situation), Number(age), apiKey);

    // Generate reference image for image-to-video pipeline
    let imageBase64: string | null = null;
    try {
      const dataUrl = await generateSceneImage(apiKey, result.visual_prompt ?? "", result.overall_load ?? 50);
      if (dataUrl) {
        imageBase64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");
      }
    } catch {
      // Image generation failure is non-fatal — video will generate from prompt only
    }

    return NextResponse.json({ ...result, imageBase64 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
