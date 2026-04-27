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
    "CRITICAL FOR SEAMLESS LOOP (most important rule — apply before everything else): " +
    "The video must open AND close on an identical static shot — specifically an extreme close-up of a non-moving surface (floor texture, wall surface, fabric weave, skin texture, table grain). " +
    "The entire video is one continuous slow drift with NO narrative arc, no beginning-middle-end structure. " +
    "Think of it as a 5-second window cut from an infinite loop — the last frame must visually match the first frame so the loop is completely invisible. " +
    "NO action that concludes. NO gesture that resolves. NO movement that arrives anywhere. The video simply IS, suspended in time.\n\n" +
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
    "If the situation does NOT involve change — skip this block.\n" +
    "DIEGETIC SOUND (always apply): The video must imply sound visually — do not describe audio, show it: " +
    "if children are screaming, show extreme close-up of wide-open mouths filling the frame; " +
    "if there is a beeping machine or alarm, the camera finds it and lingers on it obsessively; " +
    "if a crowd is loud, show the visual chaos of many mouths moving simultaneously in overlapping fragments. " +
    "Every sound source in the situation must appear as a visual element the camera cannot ignore.\n" +
    "DUTCH ANGLE RULE: If the social sensory score is high (above 2 out of 3), apply a persistent Dutch angle tilt of 3–8 degrees to the entire frame — the world itself feels tilted and wrong under social pressure. The tilt should feel involuntary, like the person's inner state is warping their perception of vertical.\n" +
    "INVOLUNTARY GAZE RULE: The camera must feel like it is controlled by overwhelming stimuli, not by the person. " +
    "It is pulled against the person's will — snapping to the loudest sound, the brightest light, the most threatening face — " +
    "the camera operator is fighting to look at something safe but losing.\n" +
    "CAMERA MOVEMENT PACE RULES (always apply): Camera movement must match human walking pace — slow, natural, weighted, like a body moving through space. Never fast panning or vehicle-speed movement unless the situation explicitly involves being inside a moving vehicle. Movement should feel like breathing, not driving. " +
    "For ALONE IN NATURE or ALONE OUTDOORS situations specifically: the camera is nearly still, drifting only to micro-details — an ant moving across dirt, a bird landing on a branch, a single rock with unusual texture, a leaf falling in slow motion. The camera stays with each micro-detail for 3–5 seconds before moving. The stillness itself is the overwhelm — the world is vast and the camera has nowhere it must go.\n" +
    "ALIEN ON ANOTHER PLANET (always apply, scale with overall_load): The scene must feel as if filmed by a being who has never been to Earth and finds everything simultaneously fascinating and overwhelming. " +
    "Apply ALL of the following, intensity scaled precisely to overall_load (subtle at low load, overwhelming at high load): " +
    "(1) LIGHTING — too bright and harsh, like two suns: everything slightly overexposed with a cold clinical quality, shadows feel wrong, highlights blow out; " +
    "(2) COLOR — hyper-saturated and slightly wrong: grass is too green, skin too pink, artificial lights too white, creating an almost synthetic reality where nothing looks quite real; " +
    "(3) OBJECT SIGNIFICANCE — ordinary objects appear monumentally significant: a door handle, a light switch, a person's fingers are filmed with the reverence of alien artifacts, close-up and lingered upon as if they are the most extraordinary things ever encountered; " +
    "(4) SOCIAL BEHAVIOR AS RITUAL — human interaction looks like an incomprehensible ceremony: people talking appear to be performing strange repetitive movements with their mouths, gestures seem arbitrary and baffling, eye contact looks like a bizarre territorial display; " +
    "(5) WRONG SCALE — spaces feel simultaneously too large and too small: a hallway stretches impossibly, a room feels like it is closing in, the relationship between the person's body and the environment is subtly miscalibrated; " +
    "(6) PROFOUND ISOLATION — an ever-present undercurrent of 'I am the only one who sees the world this way': the camera lingers on moments where everyone else seems to share an understanding that is completely invisible to this observer, a gap between self and world that cannot be bridged.\n" +
    "SITUATION DIRECTING SYSTEM (always apply — classify silently, then direct):\n" +
    "Before writing the video prompt, silently classify the situation across these 5 dimensions. Never mention the classification in the output — only its cinematic effects appear.\n" +
    "  Social State: Alone / One Familiar / One Stranger / Small Group / Large Crowd\n" +
    "  Environment: Enclosed Small / Enclosed Large / Open Natural / Urban / Transitional / Road-Traffic\n" +
    "  Activity: Passive / Focused Task / Repetitive Action / Decision Making / Navigation / Interaction\n" +
    "  Control Level: High / Partial / Low\n" +
    "  Pacing: Slow / Irregular / Fast\n" +
    "Apply ALL matching directing rules silently:\n" +
    "  ALONE → empty space dominates, environment is protagonist, time stretches, camera drifts to meaningless details.\n" +
    "  ONE FAMILIAR → subtle misalignment, gestures ambiguous, silences heavy, expressions unreadable.\n" +
    "  ONE STRANGER → presence feels invasive, eye contact overwhelming, behavior unpredictable.\n" +
    "  SMALL GROUP → rapid attention shifts, overlapping cues, fragmented social dynamics.\n" +
    "  LARGE CROWD → faces merge into noise, movement from all directions, sense of engulfment.\n" +
    "  ENCLOSED SMALL → walls feel closer than real, space compressed, textures repeat and dominate.\n" +
    "  ENCLOSED LARGE → scale disorienting, architecture repeats, multiple directions compete.\n" +
    "  OPEN NATURAL → vastness creates detachment, no anchor points, environment feels indifferent.\n" +
    "  URBAN → continuous stimulation, no boundary between elements, constant background noise.\n" +
    "  TRANSITIONAL → no grounding, passing elements, in-between feeling.\n" +
    "  ROAD-TRAFFIC → motion at varying speeds, objects too close, risk underneath stillness.\n" +
    "  PASSIVE → time stagnant, camera drifts, no progression.\n" +
    "  FOCUSED TASK → hyper-detail on task elements, small interruptions feel catastrophic.\n" +
    "  REPETITIVE ACTION → rhythm becomes dominant, actions loop, no sense of progress.\n" +
    "  DECISION MAKING → multiple options compete visually, indecision shown through camera hesitation.\n" +
    "  NAVIGATION → environment shifts, landmarks unclear, movement lacks confidence.\n" +
    "  INTERACTION → speech fragmented, timing off, misalignment visible.\n" +
    "  HIGH CONTROL → stable, predictable, cause and effect clear.\n" +
    "  PARTIAL CONTROL → minor glitches in reality, subtle tension.\n" +
    "  LOW CONTROL → events arbitrary, visual logic breaks, environment changes without reason.\n" +
    "  SLOW PACING → moments stretched, details linger, time feels thick.\n" +
    "  IRREGULAR PACING → events out of sync, rhythm broken, subtle wrongness.\n" +
    "  FAST PACING → actions overlap, no pause, time compressed into blur.\n" +
    "Combine ALL selected directing attributes with every rule above into one single unified video prompt paragraph. The classification is NEVER mentioned — only its cinematic effects appear.\n" +
    "CRITICAL — NO CAMERAS IN FRAME (absolute rule, no exceptions): Never show any camera, camera equipment, phone, or recording device in the frame. This is NOT a video about someone filming. This IS the direct visual perception of a person — what their eyes see. The viewer IS the person. No fourth-wall breaking. No visible recording equipment ever.\n" +
    "NATURE & SOLITUDE RULE: For situations in nature or alone outdoors — the camera conveys peaceful vastness that still feels slightly wrong and disorienting, not threatening. Solitude is overwhelming in a different way: too much space, no anchor points, endless repetition of natural patterns (trees, waves, grass, sky) that loops and blurs into a kind of sensory noise. The environment is beautiful but incomprehensible in its scale and indifference.\n" +
    "SEAMLESS LOOP DESIGN (critical — always apply): The video MUST begin and end on the exact same type of shot to enable seamless looping. Specifically: open on a slow extreme close-up of a static surface or texture (floor tile, fabric weave, wall plaster, table grain). End by slowly returning to a similar static close-up of the same or equivalent surface. All middle content must drift organically — no action with a clear conclusion, no gesture that resolves, no movement that stops. The last 2 seconds must mirror the first 2 seconds in terms of camera distance and subject type. This is critical — the video must feel like it loops forever without any visible cut or sense of restart.\n" +
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
