import { NextRequest, NextResponse } from "next/server";
import { generateSceneImage } from "@/lib/gemini";

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
    "Write a video prompt in English. Maximum 1000 characters. Plain string, not JSON.\n\n" +
    "SITUATION: \"" + situation + "\"\n" +
    "Camera height: " + camHeight + " (eye level) — state it explicitly in the prompt.\n\n" +
    "CORE PRINCIPLE:\n" +
    "ABSOLUTE RULE - NEVER VIOLATE:\n" +
    "This video is shot FROM the person's eyes. We NEVER see the person themselves.\n" +
    "- No face, no body, no hands, no feet, no reflection, no shadow of the PROTAGONIST (the person whose eyes we see). Other people's faces ARE allowed and encouraged when they are directly interacting with the viewer.\n" +
    "- The camera IS their eyes - we see what THEY see, not them\n" +
    "- Other people may appear in the scene, but never the protagonist themselves\n" +
    "- If the situation says 'I am looking at the ceiling' → we see the ceiling, not a person looking up\n\n" +
    "The scene is realistic. The strangeness comes ONLY from the autistic lens - how the camera perceives, not what happens.\n" +
    "Think: an alien anthropologist observing human behavior. Present but not participating. Studying, not understanding.\n" +
    "VISUAL VARIETY: Mix between two modes based on situation:\n" +
    "- PERSON-FOCUSED scenes (one person talking to you): show their face, close, slightly unreadable\n" +
    "- ENVIRONMENT scenes (crowds, places, alone): hyperfocus on inanimate anchor, people blurred\n\n" +
    "SITUATION GUIDE:\n" +
    "ALONE (familiar place): Camera locks on one irrelevant detail. Time stretches. Near silence.\n" +
    "ALONE (unfamiliar place): Slightly unstable camera. Everything too bright or too loud.\n" +
    "ONE PERSON (familiar): Camera cannot maintain eye contact but IS drawn back to their face. Their expressions look slightly unreadable - like watching someone speak a foreign language. Their face fills 40-50% of frame. Eyes seem too intense. Mouth movements don't fully sync with what you expect. Camera drifts: face → their hands → object nearby → back to face involuntarily. FOCUS: Their FACE is the primary focus point, sharp. Hands and objects are secondary - slightly out of focus. The camera keeps returning to the face even when it tries to look away.\n" +
    "ONE PERSON (stranger): Their face uncomfortably close, fills 50-60% of frame. Eyes too direct. Expression hard to decode - is it friendly? Threatening? Camera wants to look away but returns. Their body slightly too close to camera. The stranger's FACE is the primary anchor - not their hands, not objects they hold. Their expression is hard to read - professional but unreadable. Camera is drawn to their face even though it's uncomfortable.\n" +
    "SMALL GROUP (familiar, 2-5): Camera outside the group. Invisible barrier. They talk to each other, not to viewer.\n" +
    "SMALL GROUP (strangers): Rapid scanning. Cannot follow conversation. Lost.\n" +
    "LARGE CROWD (6+): Chaotic. Everything at equal volume. ONE inanimate anchor object in foreground. People blurred behind.\n" +
    "QUIET SPACE: Slow camera. Natural textures. Rare peace.\n\n" +
    "PROMPT FORMAT (always follow this structure):\n" +
    "CAMERA: [position and behavior - locked/slow drift/unstable] at " + camHeight + " eye level. Extremely slow involuntary drift - like the camera is losing focus, barely held steady. As if consciousness is slightly slipping. The kind of slow unfocused movement you see when a character in a film is about to faint or dissociate.\n" +
    "ANCHOR: [one hyper-specific object - material, color, distance, texture].\n" +
    "BACKGROUND: [what exists behind - blurred, never the main focus].\n" +
    "LIGHT: [specific lighting - fluorescent/window/harsh/soft]. Slightly desaturated at edges, sharp only in the center hyperfocus point. Soft vignette. Like the world is slightly out of reach - present but not fully real. The visual language of dissociation.\n" +
    "MOTION: [one atmospheric loop motion - dust/steam/flicker/breath].\n" +
    "SOUND: [amplified natural ambient - no voiceover, no music, no single intelligible voice].\n\n" +
    "RULES:\n" +
    "1. ONE moment, ONE anchor object, ONE motion. Nothing more. The anchor is hyper-specific and SMALL in frame (occupies max 20-30% of frame, not center-dominant). Choose objects that make sense for the situation: shoelaces, a crumpled cup on the floor, a sticker on a desk, a phone screen face-down, a food wrapper at the edge. The anchor is in the lower portion of frame, camera looks slightly downward to it naturally. It does NOT fill the entire frame. EXCEPTION: If the situation involves ONE specific person interacting directly with the viewer (parent yelling, friend talking, teacher addressing you), the anchor CAN be that person - but show them slightly from below eye level, slightly out of focus on their face, focusing instead on their gesturing hands, their moving mouth, their clothing. Never a static object when a person is directly addressing you.\n" +
    "2. Scene must be 100% realistic - only objects that belong in that location.\n" +
    "3. People in LARGE CROWD scenes never look at camera. In 1-on-1 scenes, brief eye contact is natural.\n" +
    "4. No morphing, no transitions, no invented gestures, no magical elements.\n" +
    "5. Colors slightly oversaturated. Sound amplified beyond normal.\n" +
    "6. Seamless 8-second loop - first frame = last frame.\n" +
    "7. Setting is contemporary Israel - locations, signage, and people reflect an everyday Israeli environment. Let the situation determine who appears.\n" +
    "8. NO magical effects, NO light circles, NO glowing orbs, NO supernatural visual elements. Everything must look like it was filmed with a real camera in a real location.\n\n" +
    "END EVERY PROMPT WITH:\n" +
    "'Single continuous shot. No cuts. No transitions. Camera at [X]cm. No voiceover. No narration. Seamless loop.'"
  );
}

function buildSchema(age: number, gender: string, situation: string): string {
  return (
    '{\n' +
    '  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },\n' +
    '  "overall_load": 0,\n' +
    '  "visual_effect": "glitch_heavy",\n' +
    '  "scene_caption": "10-15 word ' + captionVoice(gender) + ', describing this exact moment in the situation",\n' +
    '  "monologue": ["thought1","thought2","thought3","thought4","thought5","thought6","thought7","thought8"],\n' +
    '  "video_prompt": "' + buildVideoPromptInstructions(age, gender, situation).replace(/"/g, "'").replace(/[\r\n\t]/g, " ").replace(/  +/g, " ") + '",\n' +
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
