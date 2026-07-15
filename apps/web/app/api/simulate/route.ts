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

const ENVIRONMENT_BLOCKS: Record<Environment, string> = {
  A: `Eye-level static shot inside a quiet home interior. Camera locked on ONE specific mundane detail — a wall crack, dust particles in window light, a ticking clock face — occupying 30% of frame center, sharp focus. Surrounding room softly out of focus. Camera barely moves, slight breathing tremor only. Warm afternoon light through curtains. 8-second seamless loop: the detail remains fixed, only atmospheric motion (dust, light shift). Light sources (windows, lamps) have soft halation. The silence feels thick. Even small sounds (refrigerator hum, distant traffic) feel present and close.`,

  B: `Eye-level shot with a close person (family member, parent, friend). IF CONFLICT/YELLING: Their face fills 50% of frame, expression intense and hard to decode — mouth moving fast, eyes too direct. Camera involuntarily backs away but face keeps filling frame. Space feels too close, sound feels too loud, their voice dominates everything. IF CALM: Camera drifts between their face (soft focus) → hands → nearby object → back to face. Processing delay visible. People are Caucasian, light-skinned. Warm or neutral domestic lighting.`,

  C: `Eye-level shot. Stranger's face visible at left frame edge, slightly out of focus. Camera fixates on their collar fabric texture, a small mole, or watch strap — close-up, 25cm from lens, sharp. Stranger is Caucasian, light-skinned, speaking toward camera but camera keeps sliding DOWN to their clothing details, never holding eye contact. Space feels 20% too close. Person never looks directly into lens center. The stranger feels physically larger than they are. Their face, even partially visible, carries an unreadable expression — not hostile, not friendly. Unsettling neutral.`,

  D: `Eye-level shot in classroom or meeting room. Multiple Caucasian, light-skinned faces, camera doing fast rack focus: mouth of speaker A (sharp, 0.5s) → blurs as speaker B starts → snaps to B's mouth (sharp, 0.5s) → blurs again. Camera always 0.3s behind the conversation. Background faces are equal-weight visual noise. Fluorescent office lighting. Tight framing, slightly claustrophobic. Fluorescent lights feel harsh and too bright. The room feels smaller than it is. Voices overlap and compete equally with chair scrapes and ventilation hum.`,

  E: `Eye-level walking shot through busy street or shopping mall. Camera movement: heavy slow forward motion with sudden sharp involuntary glances — LEFT to a flash of light (0.2s snap) → back forward → RIGHT to movement (0.2s snap) → back forward. Slight overexposure on glass/metal reflections. People are Caucasian, light-skinned, moving as background crowd. Audio environment implied by visual density. Sunlight reflects off surfaces with aggressive brightness. Crowd feels physically larger — bodies loom. Sound implied by visual density: everything hitting at once.`,

  F: `Eye-level shot in crowded event space. Visual hierarchy completely lost — camera cuts rapidly between face fragments (eyes), hands, overhead lights, exit signs — each cut 0.3-0.5s. Frame edges gradually darken (vignette grows 0-15% during loop, physically motivated by exhaustion). By loop end, movement slows noticeably. Caucasian, light-skinned crowd. Indoor venue. DO NOT use graphic vignette effect — darken gradually and realistically. Lights feel blinding. Bodies feel massive and enclosing. The overwhelm is physical — the frame itself starts to feel too full to contain.`,
};

const MODIFIER_BLOCKS: Record<Exclude<Modifier, null>, string> = {
  monotropy: `ADDITIONAL: One object in frame receives 80% of camera attention — extreme close-up, fills 40% of frame, razor sharp. Camera orbits it in ultra-slow arc (360° over 8 seconds). Everything else exists at 20% visual weight.`,

  sudden_stimulus: `ADDITIONAL: Camera completely still for first 4 seconds — then at 4s mark: single sharp involuntary snap toward stimulus source (0.1s movement), freeze, then 3-second slow drift back to original position. One complete cycle per loop.`,

  hyperfocus_positive: `ADDITIONAL: Static wide frame, camera does not move. Only the activity itself has motion. Edges of frame are soft, center is sharp. Atmosphere is stable and safe.`,
};

const UNIVERSAL_RULES = `
AUTISTIC SENSORY AMPLIFICATION (always active in all environments):
- Lights feel 30% brighter than normal — windows and lamps slightly overexposed, halation glow around light sources
- Colors are slightly oversaturated — reds feel aggressive, whites feel blinding
- People appear slightly larger than expected — as if the camera has a mild wide angle making figures loom closer
- Facial expressions feel unreadable and slightly threatening — even neutral faces look ambiguous
- Everything has equal visual weight — foreground and background compete, no natural hierarchy
- The camera has a constant micro-tremor — alive, never perfectly still, like a body under stress
- Space feels slightly too small — walls closer, ceiling lower than they should be

TECHNICAL RULES FOR VEO:
- Camera IS the protagonist's eyes. Never show protagonist body, hands, face, shadow or reflection.
- People are Caucasian, light-skinned.
- Photorealistic. Documentary style. 4K quality.
- Single continuous shot. Absolutely no cuts unless specified in block F.
- 8-second seamless loop: last frame must match first frame.
- No surreal effects. No fisheye. No color distortion. No horror aesthetics.
- Camera height: [AGE_HEIGHT]cm eye level.
`;

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

// Assemble the final video prompt from the classification.
function buildDirectingBlock(
  classification: { environment: Environment; modifier: Modifier; load_level: LoadLevel },
  situation: string,
  age: number
): string {
  const height = age <= 12 ? 105 : age <= 17 ? 145 : 165;

  const CAMERA_BEHAVIORS: Record<Environment, string> = {
    A: "locked-off tripod, micro-tremor only",
    B: "slow involuntary drift between face and nearby objects, 0.5s processing delay",
    C: "slides away from face toward clothing details, returns reluctantly",
    D: "fast rack focus between speakers, always 0.3s late",
    E: "heavy slow forward motion with sudden involuntary glances left/right (0.2s snap)",
    F: "rapid cuts between face fragments, edges darkening gradually"
  };

  const FRAMING: Record<Environment, string> = {
    A: "close-up on one small mundane detail, 30% of frame center",
    B: "medium shot, face fills 50% of frame",
    C: "face at frame edge soft focus, clothing detail sharp center",
    D: "tight group shot, claustrophobic",
    E: "wide shot, crowd looming larger than normal",
    F: "extreme close-ups fragmenting the scene"
  };

  const LIGHTING: Record<Environment, string> = {
    A: "warm afternoon window light, soft halation on lamps",
    B: "domestic interior light, slightly overexposed",
    C: "neutral indoor light, person feels too close",
    D: "harsh fluorescent, too bright, clinical",
    E: "overexposed daylight, aggressive reflections on glass",
    F: "blinding overhead lights, vignette growing darker at edges"
  };

  const AUDIO: Record<Environment, string> = {
    A: "audio:: refrigerator hum, distant traffic, thick silence between sounds",
    B: "audio:: voice too loud and close, background sounds compete equally",
    C: "audio:: breathing amplified, fabric rustle, words losing meaning",
    D: "audio:: overlapping voices equal volume, fluorescent hum, chair scrapes",
    E: "audio:: wall of sound - engines, voices, footsteps all at same volume",
    F: "audio:: white noise crescendo, high frequency ringing, voices muffled"
  };

  const MODIFIER_ADD: Record<Exclude<Modifier, null>, string> = {
    monotropy: "One specific object fills 40% of frame, razor sharp. Everything else at 20% visual weight.",
    sudden_stimulus: "Camera still for 4s, then single sharp snap to stimulus source, slow return.",
    hyperfocus_positive: "Static frame, stable and safe. Only the activity moves."
  };

  const subject = `First-person POV at ${height}cm eye level. No protagonist visible — camera IS their eyes.`;
  const action = CAMERA_BEHAVIORS[classification.environment];
  const setting = `Scene: ${situation}`;
  const framing = FRAMING[classification.environment];
  const lighting = LIGHTING[classification.environment];
  const audio = AUDIO[classification.environment];
  const modifier = classification.modifier ? MODIFIER_ADD[classification.modifier] : "";

  const rules = "Caucasian light-skinned people. Photorealistic documentary 4K. Single continuous 8-second loop. No surreal effects. No protagonist body visible.";

  return [subject, action, framing, lighting, setting, modifier, audio, rules]
    .filter(Boolean)
    .join(" ");
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

    // Build the video_prompt from the two-step classification (our code, not Gemini).
    const classification = await classificationPromise;
    result.video_prompt = buildDirectingBlock(classification, String(situation), Number(age));

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
