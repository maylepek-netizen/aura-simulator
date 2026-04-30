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

function buildVideoPromptInstructions(age: number, _gender: string, situation: string): string {
  const camHeight = ageApproximateCameraHeight(age);
  return (
    "Write a Veo video prompt for this situation: \"" + situation + "\". " +
    "Use TWO layers: " +
    "LAYER 1 - REALISTIC SCENE: Describe the exact real location. Normal human camera movement at eye level. Natural lighting for the environment. People and objects that belong in this scene. Camera moves like a calm person standing or walking slowly — no dramatic movements. " +
    "LAYER 2 - BRAIN PROCESSING (subtle distortions on top of the realistic scene): Colors slightly oversaturated. Faces slightly soft/unfocused while objects stay sharp. One small random detail gets too much attention (a button, a tile, a crack in the wall). Peripheral edges slightly darker and blurred. " +
    "Scale both layers by overall_load: low load = almost normal with very subtle layer 2; medium load = noticeable but not overwhelming; high load = layer 2 stronger but scene stays fully recognizable. " +
    "SCENE FOCUS RULE: First identify — are there people or a concrete event in this situation? " +
    "IF PEOPLE OR EVENT PRESENT: Camera stays at realistic eye level throughout. Camera focuses on the people and what is happening — faces, bodies, movements, interactions. The autistic distortion happens ON the people: faces slightly unclear, expressions hard to read, bodies feel too close, movements feel threatening or unpredictable. Hyper-focus on one specific uncomfortable detail OF the person (their mouth moving, their hands, their eyes) — NOT on random objects or the floor. Camera does NOT escape to the floor or random objects when people are present. " +
    "IF ALONE OR PASSIVE SITUATION: Camera may drift to small irrelevant details (floor, objects, textures). Environment becomes the subject. Time feels stretched. " +
    "CAMERA HEIGHT RULE (always): Camera is fixed at " + camHeight + " for the entire video — the age-appropriate eye level for this person. NEVER drops to floor level unless the person is physically on the floor. Emotional state does not change camera height. " +
    "NO AI ARTIFACTS — PHOTOREALISTIC ONLY: The video must look like real footage shot by a real camera. No morphing, no body parts growing or changing shape, no surreal transformations, no glitch effects on human bodies. If a face appears distorted, it must be through camera blur or focus — not through physical deformation. Human bodies must remain anatomically correct throughout. Avoid any effect that would look like an AI generation artifact. " +
    "MONOLOGUE-TO-VISUAL MAPPING: Read the monologue field carefully. Each thought is a visual cue for what the camera should show: 'his eyes are crinkling' means camera focuses on the eyes specifically; 'too close, I can smell his cologne' means the person steps closer and camera slightly backs away; 'my brain is searching' means camera drifts slightly, unfocused, searching; 'is this a threat?' means camera focuses on hands or posture; 'just walk away' means camera starts to turn slightly. Translate each monologue thought into a specific camera behavior or visual focus. The video IS the visual experience of these thoughts. " +
    "TRUE FIRST-PERSON POV: This is a strict first-person POV video. The camera IS the person's eyes. We never see the person who is experiencing this — no reflection, no shadow of themselves, no body parts of the protagonist visible unless looking down at their own hands. The viewer IS this person. Everything is seen through their eyes only. " +
    "SUBTLE ALIEN FEELING: Even though the scene is realistic, the world must still feel profoundly wrong and alien. People are real and recognizable BUT expressions look slightly off, eyes are too intense, movements feel slightly unpredictable. The environment is real BUT lighting is a fraction too harsh, colors a shade too saturated. The feeling is: I am in a real place but something about this world does not feel safe or familiar. Subtle wrongness, not horror. " +
    "RESEARCH-GROUNDED DIRECTING: All visual directing decisions must be grounded in autism research. Reference the research citations provided — specifically: sensory processing differences (hyper/hypo sensitivity from Grandin and Mottron), monotropism (deep focus tunneling into single details), interoception differences (amplified awareness of one's own heartbeat or breathing), masking/camouflaging (the exhausting effort of performing normalcy visible in small hesitations), double empathy problem (social confusion as mutual mismatch, not deficit), and emotional processing differences. The video should feel like it was directed by someone who deeply understands the neuroscience of autistic perception — not a generic 'overwhelmed person' depiction. " +
    "Write one short focused paragraph. Photorealistic, first-person POV."
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
    '  "research_tags": ["tag1","tag2"]\n' +
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
