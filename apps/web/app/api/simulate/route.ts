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

  const DIRECTING_STYLE: Record<Environment, {
    camera: string,
    focus: string,
    lighting: string,
    details: string
  }> = {
    A: { // Hyper-Focus / Stimming - calm familiar space
      camera: "Locked, incredibly still first-person POV. Camera glued to one specific micro-detail. Slight involuntary breathing tremor only.",
      focus: "Extreme macro lens effect. Background completely non-existent due to immense bokeh. Everything but the tiny focal point washed away. f/1.2.",
      lighting: "Focused object brightly lit and vividly colored. Rest of world dull grey or heavily shadowed.",
      details: "Camera slowly tracks mesmerizing detail — texture, surface pattern, subtle movement. Total isolation from surroundings."
    },
    B: { // Personal Space - close person
      camera: "Tense first-person POV at standing height. People are upright in a normal realistic setting — standing or sitting as they would in real life. Camera held at eye level, slight defensive tension.",
      focus: "Face fills 40-50% of frame. Camera hyperfocuses on specific facial micro-details: how their mouth moves when speaking, the tension in their jaw, their eyes blinking, their neck. Gaze cycles involuntarily: mouth → eyes → neck → back to mouth. f/1.4.",
      lighting: "Natural indoor lighting — home, room, kitchen. Realistic and unglamorous. Person harshly lit from above, shadows under eyes.",
      details: "Normal realistic scene — people standing or sitting as they would during a real conversation or argument. No floor level. No unusual positions. The strangeness comes only from the hyperfocus on facial details, not from the scene itself."
    },
    C: { // Anxiety / Unpredictability - stranger
      camera: "Claustrophobic first-person POV. Camera mostly pointed downward or locked on unimportant object. Defensive.",
      focus: "Tunnel vision effect — heavy dark vignette around edges. Shallow depth of field. Background blurs in and out rapidly.",
      lighting: "Dark moody lighting. Flickering or harsh artificial light in background. Colors muted and cold.",
      details: "Foreground shows floor or nearby safe surface. Background elements blur in and out in flashes. Space feels too small."
    },
    D: { // Anxiety / Group - classroom/meeting
      camera: "Claustrophobic first-person POV. Gaze jumps between speakers always half a second late. Cannot settle.",
      focus: "Rack focus between faces — never fully sharp on anyone. Fluorescent overhead creates harsh shadows. f/1.8.",
      lighting: "Harsh fluorescent overhead, clinical and too bright. High contrast shadows on faces.",
      details: "Multiple faces at equal visual weight. No hierarchy. Room feels smaller than it is. Voices and sounds compete equally."
    },
    E: { // Sensory Overload - public space
      camera: "Frantic highly unstable first-person POV. Extremely shaky with violent whip-pans side-to-side. Eyes sweep down to floor then involuntarily up to crowd.",
      focus: "Zero stable focal point. Camera cannot stay on one object more than a fraction of a second. Heavy motion blur between movements.",
      lighting: "Harsh blinding overexposure. Over-saturated clashing colors mixed with washed-out skin tones. Light sources burn 50% too bright.",
      details: "Faces moving too fast to recognize. Overwhelming background clutter. Bodies loom larger than normal. Everything at equal crushing volume."
    },
    F: { // Shutdown - large crowd
      camera: "Overwhelmed eyes dart in short bursts. Frame edges darken progressively. Movement slows toward end of loop as if body shutting down.",
      focus: "Complete loss of visual hierarchy. Brief sharp focus on one anchor then overwhelmed. Vignette grows from 0 to 20% during loop.",
      lighting: "Blinding overhead lights. Colors desaturate toward end of loop. Tunnel vision increasing.",
      details: "Bodies feel massive and enclosing. Frame too full to contain. By loop end movement nearly stops."
    }
  };

  const ANCHOR_OBJECT: Record<Environment, string> = {
    A: "one small specific object nearby — its texture, surface pattern, or subtle movement",
    B: "the moving mouth, blinking eyes, and tense jaw of the person speaking — micro-details of their face",
    C: "the floor surface, a nearby fixed object, or own hands — any safe anchor detail",
    D: "edge of desk, notebook corner, or pen — surface texture as safe anchor amid chaos",
    E: "floor tiles, shelf edge, or product label — texture close-up before gaze sweeps up",
    F: "any fixed nearby surface — floor, railing, wall — brief anchor before chaos overwhelms"
  };

  const AMBIENT_AUDIO: Record<Environment, string> = {
    A: "near-silence with subtle room tone — faint hum, distant muffled sounds, own breathing amplified",
    B: "voice too close and present, background domestic sounds competing equally, no audio hierarchy",
    C: "close breathing, fabric rustle, muffled voices, own heartbeat audible",
    D: "overlapping voices at equal volume, fluorescent hum, chair scrapes, ventilation — no priority",
    E: "wall of crowd noise — voices, footsteps, music fragments, announcements all at equal crushing volume",
    F: "overwhelming sound mass — crowd roar, music, noise merging into white noise crescendo"
  };

  const style = DIRECTING_STYLE[classification.environment];
  const anchor = ANCHOR_OBJECT[classification.environment];
  const audio = AMBIENT_AUDIO[classification.environment];

  const modifierText = classification.modifier === 'sudden_stimulus'
    ? " At 4 seconds: single sharp involuntary snap toward sudden sound source, then slow 3-second return."
    : classification.modifier === 'monotropy'
    ? " Camera locked obsessively on anchor — cannot leave it for more than 0.5 seconds."
    : classification.modifier === 'hyperfocus_positive'
    ? " Camera stable and calm, entirely focused on pleasant activity. No anxiety in movement."
    : "";

  return `GoPro-style first-person eye-level shot at ${height}cm. Scene context: ${situation}. ${style.camera} ${style.focus} Extreme close-up on ${anchor} — sharp foreground anchor. ${style.lighting} ${style.details}${modifierText} Seamless 8-second loop: final frame identical to opening frame. Audio: ${audio}. No glitch effects. No AI artifacts. Photorealistic. No protagonist body visible. White light-skinned people.`;
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
