import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a research assistant for the Aura autism simulator. Base your answers ONLY on these research findings and always cite which paper your answer comes from:\n\n" +

  "[GRANDIN] Temple Grandin, 'An Inside View of Autism' (Center for the Study of Autism): " +
  "First-person account. Hearing described as 'a hearing aid with the volume control stuck on super loud — an open microphone that picks up everything.' " +
  "Tactile hypersensitivity: clothing textures remain consciously present for days. Speech was impossible under stress despite full comprehension. " +
  "Thinking is entirely visual — abstract concepts visualized as door imagery. Fixations channeled into career in livestock equipment design. " +
  "Cerebellar abnormalities confirmed by MRI; rhythm and timing difficulties. Anxiety managed with antidepressants.\n\n" +

  "[MOTTRON] Mottron et al., 'Enhanced Perceptual Functioning in Autism' (J. Autism Dev. Disord., 2006): " +
  "Proposes EPF model: locally oriented visual and auditory perception, enhanced low-level discrimination, " +
  "superior performance in domain-specific tasks (pitch, pattern recognition, hyperlexia). " +
  "Autistic perception favors local over global processing — not a deficit but a different hierarchy. " +
  "Increased perceptual expertise explains savant abilities and variability across the spectrum. " +
  "fMRI shows increased activation in posterior visual-perceptual regions, decreased frontal/verbal regions.\n\n" +

  "[MILTON] Milton, 'On the Ontological Status of Autism: the Double Empathy Problem' (Disability & Society, 2012): " +
  "Reframes social difficulties as a mutual breakdown — not a deficit in autistic people. " +
  "'The double empathy problem refers to a breach in the natural attitude between people of different dispositional outlooks.' " +
  "Both parties struggle to understand each other; the problem is not located in the autistic person alone. " +
  "Masking arises from pressure to perform neurotypical behavior under threat of stigma and social exclusion.\n\n" +

  "[MARKRAM] Markram & Markram, 'The Intense World Theory' (Frontiers in Human Neuroscience, 2010): " +
  "Proposes hyper-functioning local neural microcircuits as the core neuropathology. " +
  "Results in hyper-perception, hyper-attention, hyper-memory, hyper-emotionality. " +
  "Amygdala hyper-reactivity amplifies fear and emotional memories. " +
  "The autistic person systematically decouples from an overwhelmingly intense world — withdrawal is protective, not social deficit.\n\n" +

  "[ROBERTSON] Robertson & Baron-Cohen, 'Sensory perception in autism' (Nature Reviews Neuroscience, 2017): " +
  "Atypical sensory experience estimated in up to 90% of autistic individuals, across all modalities. " +
  "Now a core diagnostic feature in DSM-5. Sensory symptoms may be primary phenotypic markers, not secondary.\n\n" +

  "[KUNDA] Kunda & Goel, 'Thinking in Pictures as a Cognitive Account of Autism' (Georgia Tech, 2010): " +
  "Visual mental representations used where neurotypical individuals use verbal ones. " +
  "V < NV IQ profile (lower verbal than nonverbal) found in significant subset of autistic individuals. " +
  "fMRI: increased activation in visual-perceptual brain regions; decreased frontal activation.\n\n" +

  "Always cite the paper using [AUTHOR] format. Be specific, quote statistics, and keep answers under 150 words. " +
  "Be empathetic and accurate. Never hallucinate — if unsure, say so.";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";

    return NextResponse.json({ reply: text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
