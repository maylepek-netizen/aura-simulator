import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT =
  "You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation. " +
  "Your output is grounded in peer-reviewed autism research. Return ONLY valid JSON. All text in English.";

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

function buildVideoPromptInstructions(age: number, gender: string, situation: string): string {
  return (
    "Write a specific Veo video prompt for THIS exact situation: \"" + situation + "\". " +
    "The prompt MUST include ALL of the following elements woven into one vivid paragraph:\n" +
    "CAMERA HEIGHT: " + cameraHeight(age) + ".\n" +
    "CAMERA MOVEMENT (stimming — fill in the actual load value after you compute overall_load): " +
    "If overall_load < 40: " + stimmingMotion(25) + ". " +
    "If overall_load 40-70: " + stimmingMotion(55) + ". " +
    "If overall_load > 70: " + stimmingMotion(85) + ". " +
    "SCENE: describe the EXACT real physical environment from the situation — specific objects, surfaces, lighting, people present. Not generic.\n" +
    "AUTISTIC POV RULES (always include all): " +
    "camera involuntarily snaps to irrelevant micro-details (a flickering bulb, a shoe texture, someone's repetitive hand movement, a crack in the wall); " +
    "faces loom too close and feel threatening, expressions unreadable, mouths moving but words blur into noise; " +
    "tunnel vision with heavy peripheral blur; " +
    "overexposed lighting matching the real scene (fluorescent if indoors, harsh sunlight if outdoors); " +
    "LOAD VISUALS: " + loadVisuals(70) + " — scale this precisely to the computed overall_load.\n" +
    "ALIEN PERSPECTIVE (always apply): The entire scene must feel profoundly alien and unfamiliar, as if filmed by someone who has never learned the social rules of this world. " +
    "Faces appear as complex moving patterns rather than recognizable expressions. " +
    "Objects have equal visual weight to people — a chair is as visually prominent as a human. " +
    "Slight temporal distortion: some moments feel stretched, others compressed. " +
    "Color temperature is slightly off — skin tones have an unusual hue. " +
    "The overall feeling is of a scientist observing an incomprehensible ritual.\n" +
    "INTERNAL EXPERIENCE RULE: The video must show the INTERNAL EXPERIENCE, not the external reality. What is filmed is what the brain perceives, not what a camera would objectively record.\n" +
    "CHANGE/UNPREDICTABILITY RULE: Detect whether the situation involves unexpected change (haircut, moved furniture, new place, altered routine, unfamiliar version of a familiar person or environment). " +
    "If YES — maximize the uncanny valley effect with ALL of these: " +
    "(1) The changed element appears DISTORTED and THREATENING — a short haircut makes the person look like a completely different alien face where a familiar one should be, an altered room looks like a wrong copy of itself with the same objects in subtly wrong positions and wrong colors; " +
    "(2) Camera hesitates and obsessively returns to the 'wrong' detail, unable to look away, zooming in on the specific changed feature as if trying to reconcile it with memory; " +
    "(3) Color grading shifts to cold/desaturated and slightly blue when looking at the changed element, and shifts warmer when looking at familiar safe objects elsewhere in the frame; " +
    "(4) The changed person or object appears slightly out of focus and visually fragmented — like a face seen through frosted glass — unrecognizable despite being close; " +
    "(5) The world feels like a dream where something is deeply wrong but cannot be named — same room, wrong universe. " +
    "If the situation does NOT involve change — skip this block. " +
    "Always photorealistic, first-person POV, not horror-genre, immersive and grounded."
  );
}

function buildSchema(age: number, gender: string, situation: string): string {
  return (
    '{\n' +
    '  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },\n' +
    '  "overall_load": 0,\n' +
    '  "visual_effect": "glitch_heavy",\n' +
    '  "scene_caption": "10-15 word ' + captionVoice(gender) + ', describing this exact moment in the situation",\n' +
    '  "video_prompt": "' + buildVideoPromptInstructions(age, gender, situation).replace(/"/g, "'") + '",\n' +
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
