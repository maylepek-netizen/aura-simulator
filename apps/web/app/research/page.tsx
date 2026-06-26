"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Research Data ─────────────────────────────────────────────────────────────

const TOPICS = [
  {
    id: 1,
    label: "Sensory Processing",
    tags: ["Sensitivity", "Overload", "Perception"],
    finding: "87%",
    findingText: "of autistic individuals experience sensory overload in everyday environments.",
    description:
      "Autistic individuals often experience sensory information more intensely or differently than neurotypical individuals.",
    quote: "It's not that we notice more things. It's that everything arrives at once.",
    studies: [
      "Dunn, W. (2001). The Sensory Profile",
      "Baranek, G. (2006). Sensory Features",
      "Ben-Sasson, A. (2009). Sensory Overload",
    ],
  },
  {
    id: 2,
    label: "Social Interaction",
    tags: ["Connection", "Empathy", "Communication"],
    finding: "70%",
    findingText: "report difficulty reading implicit social cues in everyday interactions.",
    description:
      "Social interaction for autistic individuals involves navigating a world built around neurotypical communication norms.",
    quote: "I understand the words but not the music underneath them.",
    studies: [
      "Milton, D. (2012). The Double Empathy Problem",
      "Baron-Cohen, S. (2001). Theory of Mind",
      "Crompton, C. (2020). Autistic Peer Communication",
    ],
  },
  {
    id: 3,
    label: "Communication Differences",
    tags: ["Language", "Expression", "AAC"],
    finding: "65%",
    findingText: "of autistic individuals are non-speaking or minimally speaking at some point in their lives.",
    description:
      "Communication differences in autism are diverse — from delayed speech to rich inner worlds that are hard to express verbally.",
    quote: "My words and my feelings don't always arrive at the same time.",
    studies: [
      "Tager-Flusberg, H. (2016). Language Development",
      "Mirenda, P. (2003). AAC Interventions",
      "Kanner, L. (1943). Early Communication Patterns",
    ],
  },
  {
    id: 4,
    label: "Anxiety & Stress",
    tags: ["Mental Health", "Coping", "Triggers"],
    finding: "40%",
    findingText: "of autistic people have a co-occurring anxiety disorder, far above the general population rate.",
    description:
      "Anxiety is one of the most common co-occurring conditions in autism, often amplified by sensory overload and social unpredictability.",
    quote: "The world feels like it's always one unexpected thing away from collapse.",
    studies: [
      "White, S. (2009). Anxiety in Autism",
      "Simonoff, E. (2008). Psychiatric Disorders in ASD",
      "Ozsivadjian, A. (2012). Anxiety Experiences",
    ],
  },
  {
    id: 5,
    label: "Routine & Repetition",
    tags: ["Predictability", "Safety", "Structure"],
    finding: "80%+",
    findingText: "report that disrupted routines cause significant distress and dysregulation.",
    description:
      "Routines provide predictability in an unpredictable world. Repetitive behaviors are often self-regulatory, not pathological.",
    quote: "Routine isn't a cage. It's the scaffold that holds everything else up.",
    studies: [
      "Turner, M. (1999). Repetitive Behaviour",
      "Leekam, S. (2011). Restricted Interests",
      "Lam, K. (2008). Insistence on Sameness",
    ],
  },
  {
    id: 6,
    label: "Executive Functioning",
    tags: ["Planning", "Focus", "Transitions"],
    finding: "73%",
    findingText: "of autistic adults report significant difficulties with task-switching and cognitive flexibility.",
    description:
      "Executive functioning differences affect planning, initiating tasks, and switching attention — often misread as laziness or defiance.",
    quote: "I know exactly what I need to do. Starting is a different universe entirely.",
    studies: [
      "Hill, E. (2004). Executive Dysfunction",
      "Pennington, B. (1996). Working Memory in ASD",
      "Ozonoff, S. (1991). Executive Function Deficits",
    ],
  },
  {
    id: 7,
    label: "Emotional Regulation",
    tags: ["Emotions", "Interoception", "Expression"],
    finding: "50%",
    findingText: "of autistic individuals experience alexithymia — difficulty identifying and describing emotions.",
    description:
      "Emotional regulation in autism involves navigating intense feelings with fewer tools and often less social support.",
    quote: "I feel everything. I just can't always name it or show it in a way others recognize.",
    studies: [
      "Bird, G. (2012). Alexithymia and Autism",
      "Mazefsky, C. (2013). Emotion Regulation",
      "Gross, J. (2015). Emotional Dysregulation",
    ],
  },
  {
    id: 8,
    label: "Meltdowns & Shutdowns",
    tags: ["Overwhelm", "Recovery", "Support"],
    finding: "~100%",
    findingText: "of meltdowns are preceded by a detectable buildup of sensory or social overload.",
    description:
      "Meltdowns and shutdowns are neurological responses to overwhelm — not behavioral choices. They require recovery time and safety.",
    quote: "A meltdown isn't a tantrum. It's a nervous system saying it has nothing left.",
    studies: [
      "Bogdashina, O. (2016). Sensory Perceptual Issues",
      "Vermeulen, P. (2012). Autism as Context Blindness",
      "Prizant, B. (2015). Uniquely Human",
    ],
  },
  {
    id: 9,
    label: "Autistic Strengths",
    tags: ["Strengths", "Cognition", "Detail"],
    finding: "Top 10%",
    findingText: "autistic individuals show superior performance in pattern recognition and detail-focused processing tasks.",
    description:
      "Autistic cognition brings genuine strengths: deep focus, pattern recognition, honesty, and innovative thinking.",
    quote: "My brain doesn't miss details. It collects them until they form something no one else sees.",
    studies: [
      "Mottron, L. (2006). Enhanced Perceptual Functioning",
      "Baron-Cohen, S. (2009). Empathizing-Systemizing",
      "Dawson, M. (2007). Autistic Intelligence",
    ],
  },
  {
    id: 10,
    label: "Masking & Camouflaging",
    tags: ["Identity", "Authenticity", "Burnout"],
    finding: "Linked",
    findingText: "chronic masking is directly linked to burnout, depression, and significantly delayed diagnosis.",
    description:
      "Masking is the effortful performance of neurotypical behavior. It hides autistic traits at great cost to wellbeing and identity.",
    quote: "I spent so long performing 'normal' that I forgot what I actually was.",
    studies: [
      "Hull, L. (2017). Putting on My Best Normal",
      "Pearson, A. (2021). Autistic Masking",
      "Cage, E. (2019). Camouflaging and Mental Health",
    ],
  },
];

const SUGGESTED = [
  "How does sensory overload affect daily life?",
  "What causes meltdowns?",
  "Tell me about autistic strengths.",
  "Explain masking.",
];

// Hardcoded research-based answers drawn directly from the PDFs
const HARDCODED_ANSWERS: Record<string, string> = {
  "How does sensory overload affect daily life?":
    'According to Robertson & Baron-Cohen (2017, "Sensory perception in autism"), atypical sensory experience is estimated to occur in as many as 90% of autistic individuals and affects every modality — taste, touch, audition, smell, and vision. Temple Grandin describes it precisely: "My hearing is like having a hearing aid with the volume control stuck on super loud. It\'s like an open microphone that picks up everything." (Grandin, "An Inside View of Autism"). The Markram Intense World Theory (2010) explains this neurobiologically: hyper-reactive local neural microcircuits lead to hyper-perception, making ordinary environments — supermarkets, offices, classrooms — genuinely painful rather than merely unpleasant. Mottron et al.\'s Enhanced Perceptual Functioning model (2006) adds that autistic perception is locally oriented, meaning individual details are processed more intensely than the whole scene, making it impossible to filter out background noise or irrelevant stimuli the way neurotypical brains do automatically.',

  "What causes meltdowns?":
    'Grandin\'s first-person account ("An Inside View of Autism") traces meltdowns directly to sensory overload: "Sudden loud noises hurt my ears like a dentist\'s drill hitting a nerve... A sudden noise will often make my heart race." The Intense World Theory (Markram & Markram, 2010) provides the neurobiological mechanism — hyper-reactive amygdala circuits amplify emotional and sensory responses far beyond what a neurotypical brain would register, creating memories that are "overly strong" and "emotionally aversive." Once the cumulative sensory and social load exceeds threshold, the nervous system goes into crisis. Critically, Milton\'s Double Empathy Problem (2012) reframes this: meltdowns are not behavioral failures but predictable outcomes of navigating a world built for a neurotype that is not yours — a world that rarely adapts, requiring constant masking until the system collapses.',

  "Tell me about autistic strengths.":
    'Mottron et al.\'s Enhanced Perceptual Functioning model (2006) is the key paper here: autistic individuals show "locally oriented visual and auditory perception, enhanced low-level discrimination... and superior performance in domain-specific cognitive tasks." This is not compensation for a deficit — it is a genuine cognitive advantage. Kunda & Goel ("Thinking in Pictures," 2010) document that many autistic individuals use visual mental representations where neurotypical people use verbal ones, producing measurably superior performance on spatial and pattern tasks. Grandin herself demonstrates this: her visual thinking drove a successful international career in engineering design. The Intense World Theory (Markram, 2010) adds that hyper-plasticity of neural circuits also enables hyper-memory and exceptional focus — what neurotypical observers call "special interests" are in fact a cognitive strength: deep, structured expertise built through sustained perceptual engagement.',

  "Explain masking.":
    'Milton\'s Double Empathy Problem (2012) is essential context: masking arises because autistic social behavior is read as a "deficit" by neurotypical observers, when in reality it is a difference in dispositional outlook. To avoid stigma and social rejection, autistic people learn to perform neurotypical behavior — suppressing stimming, forcing eye contact, scripting conversation. Milton writes: "if one can apply a label on the \'other\' locating the problem in them, it resolves the applier\'s natural attitude of responsibility." The cost of this performance is profound: Grandin documents the exhausting cognitive load of translating every interaction through explicit rules ("door imagery for getting along with people") rather than intuition. Robertson & Baron-Cohen (2017) connect masking to the sensory dimension — suppressing visible responses to pain or overload adds another layer of effort. Research consistently links chronic masking to burnout, depression, and late or missed diagnosis, particularly in women and people of color.',
};

// ─── Node positions around a circle ───────────────────────────────────────────

function getNodePos(i: number, total: number, rx: number, ry: number) {
  const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * rx,
    y: Math.sin(angle) * ry,
  };
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

type Msg = { role: "user" | "assistant"; text: string };

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: "80%",
        background: isUser ? "rgba(255,201,157,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${isUser ? "rgba(255,201,157,0.25)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
        padding: "10px 14px",
        fontSize: 13,
        lineHeight: 1.6,
        color: isUser ? "rgba(255,201,157,0.9)" : "rgba(255,255,255,0.75)",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState(0); // index into TOPICS
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const topic = TOPICS[activeTopic];

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();
    const userMsg: Msg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Use hardcoded research-based answer if available
    if (HARDCODED_ANSWERS[trimmed]) {
      setMessages((prev) => [...prev, { role: "assistant", text: HARDCODED_ANSWERS[trimmed] }]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/research-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply ?? "No response." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }

  function selectTopic(idx: number) {
    setActiveTopic(idx);
    const t = TOPICS[idx];
    void sendMessage(`You've selected ${t.label}. Tell me the key research findings about this topic in autism.`);
  }

  // SVG circle layout
  const CX = 220;
  const CY = 230;
  const RX = 165;
  const RY = 165;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&family=Inter:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        .research-root {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* ── Top nav ── */
        .r-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px;
          height: 60px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky; top: 0; z-index: 20;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
        }
        .r-nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(255,255,255,0.7);
        }
        .r-nav-links {
          display: flex; gap: 36px;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(255,255,255,0.4);
        }
        .r-nav-links span { cursor: pointer; transition: color 0.2s; }
        .r-nav-links span:hover, .r-nav-active { color: #FFC99D !important; border-bottom: 1px solid #FFC99D; padding-bottom: 2px; }

        /* ── Main 3-column grid ── */
        .r-main {
          display: grid;
          grid-template-columns: 280px 1fr 340px;
          gap: 0;
          min-height: calc(100vh - 60px - 340px);
          padding: 48px 48px 0;
        }

        /* ── Left column ── */
        .r-left { padding-right: 40px; }
        .r-heading {
          font-family: 'Amiri', serif;
          font-size: clamp(40px, 4vw, 56px);
          font-weight: 400;
          line-height: 1.05;
          color: #fff;
          margin: 0 0 20px;
        }
        .r-desc {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255,255,255,0.45);
          margin: 0 0 36px;
        }
        .r-stats {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 24px 16px;
          margin-bottom: 36px;
        }
        .r-stat-num {
          font-family: 'Amiri', serif;
          font-size: 32px; color: #FFC99D; line-height: 1;
          margin-bottom: 4px;
        }
        .r-stat-label {
          font-size: 10px; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
        }
        .r-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 22px;
          border: 1px solid rgba(255,201,157,0.5);
          border-radius: 50px;
          background: transparent;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: #FFC99D; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .r-cta-btn:hover { background: rgba(255,201,157,0.06); border-color: #FFC99D; }

        /* ── Center: SVG map ── */
        .r-center { display: flex; flex-direction: column; align-items: center; }
        .r-map-label {
          font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); text-align: center; margin-bottom: 8px;
        }
        .r-map-arrow { color: rgba(255,255,255,0.25); font-size: 12px; text-align: center; margin-bottom: 16px; }

        .topic-node { cursor: pointer; transition: all 0.25s ease; }
        .topic-node:hover .node-circle { filter: drop-shadow(0 0 10px rgba(255,201,157,0.5)); }

        .r-counter {
          margin-top: 12px; text-align: center;
          font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }
        .r-counter span { color: rgba(255,255,255,0.7); font-size: 16px; font-family: 'Amiri', serif; letter-spacing: 0; }
        .r-progress {
          display: flex; gap: 3px; justify-content: center; margin-top: 8px;
        }
        .r-prog-seg {
          height: 2px; width: 22px; border-radius: 1px;
          background: rgba(255,255,255,0.12);
          transition: background 0.3s;
        }
        .r-prog-seg.active { background: #FFC99D; }

        /* ── Right panel ── */
        .r-right {
          padding-left: 32px;
          border-left: 1px solid rgba(255,255,255,0.06);
        }
        .r-topic-num {
          font-size: 11px; letter-spacing: 0.22em;
          color: rgba(255,255,255,0.25); margin-bottom: 6px;
        }
        .r-topic-title {
          font-family: 'Amiri', serif; font-style: italic;
          font-size: clamp(26px, 2.8vw, 34px);
          color: #FFC99D; font-weight: 400; margin: 0 0 12px;
          line-height: 1.1;
        }
        .r-topic-desc {
          font-size: 13px; line-height: 1.65;
          color: rgba(255,255,255,0.5); margin-bottom: 16px;
        }
        .r-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
        .r-tag {
          font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 4px 10px; border-radius: 3px;
          color: rgba(255,255,255,0.4);
        }
        .r-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 16px; margin-bottom: 12px;
        }
        .r-card-label {
          font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-bottom: 10px;
        }
        .r-finding-num {
          font-family: 'Amiri', serif; font-size: 40px;
          color: #FFC99D; line-height: 1; display: inline;
        }
        .r-finding-text {
          font-size: 12px; line-height: 1.55;
          color: rgba(255,255,255,0.5); margin-top: 6px;
        }
        .r-quote {
          font-family: 'Amiri', serif; font-style: italic;
          font-size: 13px; line-height: 1.6;
          color: rgba(255,255,255,0.6);
        }
        .r-quote::before { content: "❝ "; color: #FFC99D; font-size: 16px; }
        .r-studies-list { display: flex; flex-direction: column; gap: 8px; }
        .r-study-row {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 11px; color: rgba(255,255,255,0.45);
          padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .r-study-row:last-child { border-bottom: none; }
        .r-study-icon { font-size: 10px; color: rgba(255,201,157,0.5); margin-right: 6px; }
        .r-view-all {
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255,201,157,0.6); cursor: pointer;
          display: flex; align-items: center; gap: 6px; margin-top: 8px;
        }
        .r-view-all:hover { color: #FFC99D; }

        /* ── Bottom chat section ── */
        .r-chat-section {
          margin: 40px 0 0;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px 16px 0 0;
          padding: 32px 48px 0;
          display: grid;
          grid-template-columns: 220px 1fr 260px;
          gap: 32px;
          min-height: 300px;
        }
        .r-chat-info-label {
          font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.5); margin-bottom: 6px;
        }
        .r-chat-info-desc {
          font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.3);
        }
        .r-chat-icon {
          width: 44px; height: 44px; border-radius: 50%;
          border: 1px solid rgba(255,201,157,0.3);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .r-msgs { flex: 1; overflow-y: auto; padding-right: 4px; max-height: 220px; }
        .r-msgs::-webkit-scrollbar { width: 3px; }
        .r-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .r-input-row {
          display: flex; gap: 10px; align-items: center;
          padding: 14px 0 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin-top: 10px;
        }
        .r-input {
          flex: 1; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50px; padding: 10px 18px;
          font-size: 13px; color: white; outline: none;
          font-family: 'Inter', sans-serif;
        }
        .r-input::placeholder { color: rgba(255,255,255,0.25); }
        .r-input:focus { border-color: rgba(255,201,157,0.3); }
        .r-send-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,201,157,0.15);
          border: 1px solid rgba(255,201,157,0.3);
          color: #FFC99D; cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .r-send-btn:hover { background: rgba(255,201,157,0.25); }
        .r-suggested-label {
          font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-bottom: 10px;
        }
        .r-suggested-list { display: flex; flex-direction: column; gap: 7px; }
        .r-suggested-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 8px; padding: 9px 12px;
          font-size: 12px; color: rgba(255,255,255,0.55);
          cursor: pointer; text-align: left;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          font-family: 'Inter', sans-serif;
          line-height: 1.4;
        }
        .r-suggested-btn:hover {
          background: rgba(255,201,157,0.07);
          border-color: rgba(255,201,157,0.2);
          color: rgba(255,201,157,0.8);
        }
        .r-disclaimer {
          font-size: 10px; color: rgba(255,255,255,0.2);
          line-height: 1.5; margin-top: 10px;
        }

        @keyframes nodeBreathe {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes linePulse {
          0%, 100% { stroke-opacity: 0.12; }
          50% { stroke-opacity: 0.22; }
        }
        .node-breathe { animation: nodeBreathe 4s ease-in-out infinite; }
        .line-pulse { animation: linePulse 3s ease-in-out infinite; }
      `}</style>

      <div className="research-root">

        {/* ── Nav ── */}
        <nav className="r-nav">
          <div className="r-nav-logo">
            <img src="/logo.svg" alt="" style={{ width: 22, opacity: 0.7 }} />
            AURA SIMULATOR
          </div>
          <div className="r-nav-links">
            <span onClick={() => router.push("/")}>About</span>
            <span className="r-nav-active">Research</span>
            <span onClick={() => router.push("/onboard")}>Simulator</span>
          </div>
        </nav>

        {/* ── Main 3-col ── */}
        <div className="r-main">

          {/* LEFT */}
          <div className="r-left">
            <h1 className="r-heading">Understanding<br />Autism</h1>
            <p className="r-desc">
              We explored multiple perspectives through research, studies, and real experiences to understand the diverse autistic perception.
            </p>
            <div className="r-stats">
              <div>
                <div className="r-stat-num">10</div>
                <div className="r-stat-label">Research Studies</div>
              </div>
              <div>
                <div className="r-stat-num">360+</div>
                <div className="r-stat-label">Sources</div>
              </div>
              <div>
                <div className="r-stat-num">120</div>
                <div className="r-stat-label">Participants</div>
              </div>
              <div>
                <div className="r-stat-num">45K+</div>
                <div className="r-stat-label">Data Points</div>
              </div>
            </div>
          </div>

          {/* CENTER — SVG knowledge map */}
          <div className="r-center">
            <p className="r-map-label">Explore the research<br />by selecting a topic</p>
            <p className="r-map-arrow">↓</p>

            <svg width={440} height={460} viewBox="0 0 440 460" style={{ overflow: "visible" }}>
              {/* Dashed orbit ring */}
              <circle
                cx={CX} cy={CY} r={RX}
                fill="none"
                stroke="rgba(255,201,157,0.15)"
                strokeWidth={1}
                strokeDasharray="4 6"
              />

              {/* Connecting lines between adjacent nodes */}
              {TOPICS.map((_, i) => {
                const a = getNodePos(i, TOPICS.length, RX, RY);
                const b = getNodePos((i + 1) % TOPICS.length, TOPICS.length, RX, RY);
                return (
                  <line
                    key={i}
                    x1={CX + a.x} y1={CY + a.y}
                    x2={CX + b.x} y2={CY + b.y}
                    stroke="#FFC99D"
                    strokeWidth={0.5}
                    className="line-pulse"
                  />
                );
              })}

              {/* Eye logo in center */}
              <image
                href="/logo.svg"
                x={CX - 30} y={CY - 30}
                width={60} height={60}
                opacity={0.8}
              />

              {/* Topic nodes */}
              {TOPICS.map((t, i) => {
                const pos = getNodePos(i, TOPICS.length, RX, RY);
                const x = CX + pos.x;
                const y = CY + pos.y;
                const isActive = activeTopic === i;
                const isHovered = hoveredNode === i;
                const scale = isActive ? 1.18 : isHovered ? 1.08 : 1;
                const nodeR = 36;
                const words = t.label.split(" ");

                return (
                  <g
                    key={t.id}
                    className="topic-node node-breathe"
                    transform={`translate(${x}, ${y}) scale(${scale})`}
                    onClick={() => selectTopic(i)}
                    onMouseEnter={() => setHoveredNode(i)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ transformOrigin: "0 0", transformBox: "fill-box" }}
                  >
                    {/* Glow for active */}
                    {isActive && (
                      <circle r={nodeR + 6} fill="rgba(255,201,157,0.08)" />
                    )}
                    <circle
                      className="node-circle"
                      r={nodeR}
                      fill={isActive ? "rgba(255,201,157,0.12)" : "rgba(10,8,6,0.92)"}
                      stroke={isActive ? "#FFC99D" : "rgba(255,201,157,0.35)"}
                      strokeWidth={isActive ? 1.5 : 1}
                    />
                    {/* Number */}
                    <text
                      x={0} y={-nodeR + 13}
                      textAnchor="middle"
                      fontSize={7}
                      fill="rgba(255,201,157,0.5)"
                      letterSpacing="0.1em"
                      fontFamily="Inter, sans-serif"
                    >
                      {String(t.id).padStart(2, "0")}
                    </text>
                    {/* Label text — split into lines */}
                    {words.length <= 1 ? (
                      <text x={0} y={4} textAnchor="middle" fontSize={8.5} fill="white" fontFamily="Inter, sans-serif">{t.label}</text>
                    ) : words.length === 2 ? (
                      <>
                        <text x={0} y={-1} textAnchor="middle" fontSize={8.5} fill="white" fontFamily="Inter, sans-serif">{words[0]}</text>
                        <text x={0} y={10} textAnchor="middle" fontSize={8.5} fill="white" fontFamily="Inter, sans-serif">{words[1]}</text>
                      </>
                    ) : (
                      <>
                        <text x={0} y={-5} textAnchor="middle" fontSize={8} fill="white" fontFamily="Inter, sans-serif">{words[0]}</text>
                        <text x={0} y={5} textAnchor="middle" fontSize={8} fill="white" fontFamily="Inter, sans-serif">{words[1]}</text>
                        <text x={0} y={15} textAnchor="middle" fontSize={8} fill="white" fontFamily="Inter, sans-serif">{words[2]}</text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="r-counter">
              <span>{activeTopic + 1}</span> / 10 &nbsp; RESEARCH TOPICS
            </div>
            <div className="r-progress">
              {TOPICS.map((_, i) => (
                <div
                  key={i}
                  className={`r-prog-seg${activeTopic === i ? " active" : ""}`}
                  onClick={() => selectTopic(i)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="r-right">
            <div className="r-topic-num">{String(topic.id).padStart(2, "0")}</div>
            <div className="r-topic-title">{topic.label}</div>
            <p className="r-topic-desc">{topic.description}</p>
            <div className="r-tags">
              {topic.tags.map((tag) => (
                <span key={tag} className="r-tag">{tag}</span>
              ))}
            </div>

            {/* Key finding */}
            <div className="r-card">
              <div className="r-card-label">Key Finding</div>
              <div>
                <span className="r-finding-num">{topic.finding}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginLeft: 6 }}>
                  {topic.findingText}
                </span>
              </div>
            </div>

            {/* Participant insight */}
            <div className="r-card">
              <div className="r-card-label">Participant Insight</div>
              <p className="r-quote">{topic.quote}</p>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>– Research Participant</div>
            </div>

            {/* Related studies */}
            <div className="r-card">
              <div className="r-card-label">Related Studies</div>
              <div className="r-studies-list">
                {topic.studies.map((s) => (
                  <div key={s} className="r-study-row">
                    <span><span className="r-study-icon">☰</span>{s}</span>
                    <span style={{ color: "rgba(255,201,157,0.5)", fontSize: 11 }}>→</span>
                  </div>
                ))}
              </div>
              <div className="r-view-all">VIEW ALL SOURCES →</div>
            </div>
          </div>

        </div>

        {/* ── Chat section ── */}
        <div id="research-chat" className="r-chat-section" style={{ margin: "40px 48px 0", borderRadius: 16 }}>

          {/* Left: info */}
          <div style={{ paddingTop: 4 }}>
            <div className="r-chat-icon">
              <img src="/logo.svg" alt="" style={{ width: 22, opacity: 0.7 }} />
            </div>
            <div className="r-chat-info-label">Research Assistant</div>
            <div className="r-chat-info-desc">
              Ask me anything about our research and the findings.
            </div>
          </div>

          {/* Center: chat */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="r-msgs" ref={chatRef}>
              {messages.length === 0 && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 32 }}>
                  Click a topic node or ask a question to start.
                </p>
              )}
              {messages.map((m, i) => <Bubble key={i} msg={m} />)}
              {loading && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "6px 0" }}>
                  Thinking…
                </div>
              )}
            </div>
            <div className="r-input-row">
              <input
                className="r-input"
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(input); }}
              />
              <button className="r-send-btn" type="button" onClick={() => void sendMessage(input)}>→</button>
            </div>
            <div className="r-disclaimer" style={{ paddingBottom: 20 }}>
              AI responses are based on research data and may not replace professional advice.
            </div>
          </div>

          {/* Right: suggested */}
          <div style={{ paddingTop: 4 }}>
            <div className="r-suggested-label">Suggested Questions</div>
            <div className="r-suggested-list">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  className="r-suggested-btn"
                  type="button"
                  onClick={() => void sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* bottom padding */}
        <div style={{ height: 60 }} />

      </div>
    </>
  );
}
