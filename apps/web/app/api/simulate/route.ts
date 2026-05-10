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
    "🚫 ABSOLUTE NON-NEGOTIABLE RULE: We NEVER see the protagonist. NEVER. The camera IS their eyes. We see what THEY see - not them. No face, no body, no reflection, no shadow of the protagonist. If someone talks to them - we see that person's face. If they walk - we see the path. If they look at their hands - we see their hands from above. This is a GoPro on their forehead facing OUTWARD. Violating this rule makes the video completely wrong. " +
    "RULE 1 - FIRST-PERSON POV: Camera is at " + camHeight + ". Camera faces OUTWARD like real eyes — never inward toward the person themselves. " +
    "RULE 2 - REALISTIC SCENE: Show exactly what belongs in this situation — the real location, real people, real objects. Camera moves slowly and naturally like a human standing or walking. No dramatic movements, no cinematic shots, no documentary style. " +
    "RULE 3 - BALANCED SCENE WITH AUTISTIC FOCUS: The video must show the FULL scene for context — the bus stop, the street, the people waiting. The autistic experience shows through WHERE the attention goes: 70% of the shot should show the full environment and what is happening, 30% can drift to a small detail (a texture, a person's gesture, a light). Never spend more than 1 second fixated on a single micro-detail. The camera always returns to the main scene. Think of it as: wide shot of reality → brief involuntary focus on detail → back to reality. The monologue informs the emotional tone, not a literal shot-by-shot script. " +
    "RULE 4 - SUBTLE ALIEN FEELING: The world feels slightly wrong but recognizable. Colors fractionally oversaturated. Lighting slightly too harsh. If people are present — faces loom uncomfortably close, expressions ambiguous, eyes too intense. Focus on the people and what is happening — not on the floor or random objects. Scale intensity by overall_load. " +
    "RULE 5 - TECHNICAL: No subtitles, no text, no AI morphing artifacts. Human bodies anatomically correct. Photorealistic only. One short focused paragraph as output. " +
    "SINGLE CONTINUOUS SHOT: The entire video must be ONE uninterrupted shot with NO cuts, NO scene changes, NO jump cuts. 5 seconds is very short — use all of it in one continuous slow movement within the same space. The camera may drift, rotate, or shift focus within the shot, but never cuts to a different location or angle. Think of it as one long breath, not a sequence of moments. " +
    "DIEGETIC AUDIO: Include realistic diegetic sound in the scene — the actual sounds that would be heard in this environment. The audio should match exactly what is visible: if there are children, hear them; if there is a storm, hear the thunder and rain; if there is a crowd, hear the crowd noise. " +
    "STRANGER FACE FOCUS: When the situation involves a stranger or unfamiliar person interacting with the protagonist, the camera must spend significant time focused on their face — specifically their eyes and mouth. The face should fill 40-60% of the frame. Expressions appear ambiguous and hard to read — a smile could be friendly or threatening, eye contact feels too intense and prolonged. The camera keeps returning to the face involuntarily even when trying to look away. " +
    "STIMMING CAMERA MOVEMENT: The camera has a subtle continuous rhythmic movement throughout — a gentle slow rocking or swaying that reflects the body's self-regulation. This is not shaky cam — it is smooth, rhythmic, repetitive. Like someone gently rocking. Scale by overall_load: low load = very subtle slow sway (barely noticeable), medium load = gentle rocking forward/back, high load = more pronounced rhythmic movement. " +
    "ALIEN WORLD INTENSIFIED: Everything familiar looks slightly wrong — like a perfect replica that is off by 2%. Skin tones have an unusual hue. Proportions feel slightly distorted. The lighting has a quality that does not exist in normal reality — too clean, too harsh, too perfect. People's movements are slightly too slow or too fast. The overall feeling: I have seen this place before but I do not belong here and something is deeply wrong that I cannot name."
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
