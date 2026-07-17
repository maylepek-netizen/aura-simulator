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

// Builds the full Veo prompt deterministically from the classification — no
// Gemini call. Per-environment anchor/scene/camera/audio/light blocks are
// assembled directly in code, with an optional modifier clause.
function buildVeoPrompt(
  classification: { environment: Environment; modifier: Modifier; load_level: LoadLevel },
  situation: string,
  age: number
): string {
  const height = age <= 12 ? 105 : age <= 17 ? 145 : 165;

  const ANCHOR: Record<Environment, string> = {
    A: "a small household object nearby — its texture and surface detail in extreme close-up",
    B: "the hands or clothing of the person — fabric texture, rings, sleeve edge in sharp close-up",
    C: "the stranger's collar, badge, or watch strap — material and texture in extreme close-up",
    D: "the edge of a desk or chair, a pen, or a notebook corner — surface texture sharp",
    E: "the floor, a shelf edge, or a product label — texture and material in close-up",
    F: "any fixed surface nearby — floor tile, railing, wall — anchoring amid the chaos"
  };

  const SCENE: Record<Environment, string> = {
    A: "quiet familiar home interior, warm light, safe but hyper-aware of every small detail",
    B: "domestic setting with one or two known people, warm lighting, emotionally charged",
    C: "face-to-face with a stranger, neutral indoor space, uncomfortable proximity",
    D: "classroom or meeting room, fluorescent lighting, multiple people talking",
    E: "busy public space — street, mall, or transport — crowds moving in all directions",
    F: "overwhelmingly crowded event or venue, lights too bright, no escape"
  };

  const CAMERA: Record<Environment, string> = {
    A: "eyes barely move, locked on one detail with slight involuntary tremor, breathing visible in micro-shake",
    B: "gaze drifts involuntarily: anchor → face (soft) → back to anchor, slight hesitation before each movement",
    C: "eyes want to look away from face, pull toward clothing detail, forced back by social pressure",
    D: "gaze jumps between speakers always half a second late, never lands where intended",
    E: "eyes sweep DOWN to floor/anchor then involuntarily UP to crowd, sudden reflexive snap to movement",
    F: "overwhelmed eyes dart in short bursts, nothing holds focus, brief anchor before chaos returns"
  };

  const AUDIO: Record<Environment, string> = {
    A: "quiet home ambience — subtle room tone, distant sounds, thick silence",
    B: "voices overlapping, domestic sounds competing equally, no audio priority",
    C: "close breathing, fabric sounds, muffled words losing meaning",
    D: "multiple voices at equal volume, room noise, chairs, ventilation hum",
    E: "crowd noise wall — indistinct voices, footsteps, music fragments, announcements all equal",
    F: "overwhelming sound mass — crowd roar, music, noise all merging into white noise"
  };

  const LIGHT: Record<Environment, string> = {
    A: "warm afternoon window light, soft halation on lamps",
    B: "domestic interior, slightly overexposed, too warm",
    C: "neutral indoor light, person feels physically too close",
    D: "harsh fluorescent overhead, clinical and too bright",
    E: "overexposed daylight, aggressive reflections on glass and metal surfaces",
    F: "blinding overhead lights, vignette grows darker at frame edges"
  };

  const anchor = ANCHOR[classification.environment];
  const scene = SCENE[classification.environment];
  const camera = CAMERA[classification.environment];
  const audio = AUDIO[classification.environment];
  const light = LIGHT[classification.environment];

  const modifierText = classification.modifier === 'sudden_stimulus'
    ? " At 4 seconds: single sharp involuntary snap toward a sound source, then slow return."
    : classification.modifier === 'monotropy'
    ? " Camera obsessively returns to anchor detail, cannot leave it for more than 1 second."
    : classification.modifier === 'hyperfocus_positive'
    ? " Camera stable and calm, focused entirely on the pleasant activity, no anxiety."
    : "";

  return `GoPro-style first-person eye-level shot at ${height}cm. Extreme macro close-up on ${anchor} — this fills the frame first, hyper-sharp. Shallow depth of field f/1.2. Background: ${scene} — blurred, overwhelming, unrecognizable figures in bokeh. ${camera}. ${light} overexposed 40% on light sources. Colors slightly oversaturated on anchor detail. Seamless 8-second loop: final frame identical to opening frame. Audio: ${audio}. No glitch effects. No AI artifacts. Photorealistic. No protagonist body visible.${modifierText}`;
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

    // Build the video_prompt deterministically from the classification (no Gemini call).
    const classification = await classificationPromise;
    result.video_prompt = buildVeoPrompt(classification, String(situation), Number(age));

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
