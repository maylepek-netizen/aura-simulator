"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Research Data ─────────────────────────────────────────────────────────────

const TOPICS = [
  {
    id: 1,
    label: "עיבוד חושי",
    tags: ["רגישות", "עומס יתר", "תפיסה"],
    finding: "87%",
    findingText: "מהאנשים על הרצף חווים עומס חושי בסביבות היומיום.",
    description:
      "אנשים על הרצף חווים לעיתים קרובות מידע חושי בעוצמה גבוהה יותר או באופן שונה מאנשים נוירוטיפיקליים.",
    quote: "זה לא שאנחנו שמים לב ליותר דברים. זה שהכול מגיע בבת אחת.",
    studies: [
      "Dunn, W. (2001). The Sensory Profile",
      "Baranek, G. (2006). Sensory Features",
      "Ben-Sasson, A. (2009). Sensory Overload",
    ],
  },
  {
    id: 2,
    label: "אינטראקציה חברתית",
    tags: ["חיבור", "אמפתיה", "תקשורת"],
    finding: "70%",
    findingText: "מדווחים על קושי בפענוח רמזים חברתיים מרומזים באינטראקציות יומיומיות.",
    description:
      "אינטראקציה חברתית עבור אנשים על הרצף כרוכה בהתנהלות בעולם שבנוי סביב נורמות תקשורת נוירוטיפיקליות.",
    quote: "המילים ברורות לי, אבל לא המנגינה שמתחתן.",
    studies: [
      "Milton, D. (2012). The Double Empathy Problem",
      "Baron-Cohen, S. (2001). Theory of Mind",
      "Crompton, C. (2020). Autistic Peer Communication",
    ],
  },
  {
    id: 3,
    label: "הבדלי תקשורת",
    tags: ["שפה", "הבעה", "AAC"],
    finding: "65%",
    findingText: "מהאנשים על הרצף אינם מדברים או מדברים באופן מינימלי בשלב כלשהו בחייהם.",
    description:
      "הבדלי תקשורת באוטיזם מגוונים — מעיכוב בדיבור ועד עולמות פנימיים עשירים שקשה לבטא במילים.",
    quote: "המילים והרגשות שלי לא תמיד מגיעים באותו הזמן.",
    studies: [
      "Tager-Flusberg, H. (2016). Language Development",
      "Mirenda, P. (2003). AAC Interventions",
      "Kanner, L. (1943). Early Communication Patterns",
    ],
  },
  {
    id: 4,
    label: "חרדה ולחץ",
    tags: ["בריאות נפשית", "התמודדות", "טריגרים"],
    finding: "40%",
    findingText: "מהאנשים על הרצף חווים הפרעת חרדה נלווית, הרבה מעל השיעור באוכלוסייה הכללית.",
    description:
      "חרדה היא אחד המצבים הנלווים הנפוצים ביותר באוטיזם, ולעיתים קרובות מתעצמת בשל עומס חושי וחוסר צפיוּת חברתית.",
    quote: "העולם מרגיש כאילו הוא תמיד דבר בלתי צפוי אחד מקריסה.",
    studies: [
      "White, S. (2009). Anxiety in Autism",
      "Simonoff, E. (2008). Psychiatric Disorders in ASD",
      "Ozsivadjian, A. (2012). Anxiety Experiences",
    ],
  },
  {
    id: 5,
    label: "שגרה וחזרתיות",
    tags: ["צפיוּת", "ביטחון", "מבנה"],
    finding: "80%+",
    findingText: "מדווחים שהפרה של השגרה גורמת למצוקה משמעותית ולחוסר ויסות.",
    description:
      "שגרה מספקת צפיוּת בעולם בלתי צפוי. התנהגויות חזרתיות הן לרוב מווסתות־עצמי, לא פתולוגיות.",
    quote: "השגרה אינה כלוב. היא הפיגום שמחזיק את כל השאר.",
    studies: [
      "Turner, M. (1999). Repetitive Behaviour",
      "Leekam, S. (2011). Restricted Interests",
      "Lam, K. (2008). Insistence on Sameness",
    ],
  },
  {
    id: 6,
    label: "תפקוד ניהולי",
    tags: ["תכנון", "מיקוד", "מעברים"],
    finding: "73%",
    findingText: "מהמבוגרים על הרצף מדווחים על קשיים משמעותיים במעבר בין משימות ובגמישות קוגניטיבית.",
    description:
      "הבדלים בתפקוד הניהולי משפיעים על תכנון, יזום משימות והסטת קשב — ולעיתים קרובות נקראים בטעות כעצלנות או התרסה.",
    quote: "ברור לי בדיוק מה צריך לעשות. ההתחלה היא יקום אחר לגמרי.",
    studies: [
      "Hill, E. (2004). Executive Dysfunction",
      "Pennington, B. (1996). Working Memory in ASD",
      "Ozonoff, S. (1991). Executive Function Deficits",
    ],
  },
  {
    id: 7,
    label: "ויסות רגשי",
    tags: ["רגשות", "אינטרוצפציה", "הבעה"],
    finding: "50%",
    findingText: "מהאנשים על הרצף חווים אלקסיתימיה — קושי בזיהוי ובתיאור של רגשות.",
    description:
      "ויסות רגשי באוטיזם כרוך בהתמודדות עם רגשות עזים עם פחות כלים ולעיתים קרובות עם פחות תמיכה חברתית.",
    quote: "הכול מורגש אצלי בעוצמה. פשוט לא תמיד יש לזה שם, או דרך להראות את זה שאחרים מזהים.",
    studies: [
      "Bird, G. (2012). Alexithymia and Autism",
      "Mazefsky, C. (2013). Emotion Regulation",
      "Gross, J. (2015). Emotional Dysregulation",
    ],
  },
  {
    id: 8,
    label: "קריסה חושית וכיבוי",
    tags: ["הצפה", "התאוששות", "תמיכה"],
    finding: "~100%",
    findingText: "ממצבי הקריסה מגיעים לאחר הצטברות ניתנת לזיהוי של עומס חושי או חברתי.",
    description:
      "קריסה חושית וכיבוי הם תגובות נוירולוגיות להצפה — לא בחירות התנהגותיות. הם דורשים זמן התאוששות וסביבה בטוחה.",
    quote: "קריסה אינה התקף זעם. זו מערכת עצבים שאומרת שלא נשאר לה כלום.",
    studies: [
      "Bogdashina, O. (2016). Sensory Perceptual Issues",
      "Vermeulen, P. (2012). Autism as Context Blindness",
      "Prizant, B. (2015). Uniquely Human",
    ],
  },
  {
    id: 9,
    label: "חוזקות אוטיסטיות",
    tags: ["חוזקות", "קוגניציה", "פרטים"],
    finding: "10% העליונים",
    findingText: "אנשים על הרצף מציגים ביצועים גבוהים יותר במשימות של זיהוי דפוסים ועיבוד ממוקד־פרטים.",
    description:
      "הקוגניציה האוטיסטית מביאה עמה חוזקות אמיתיות: מיקוד עמוק, זיהוי דפוסים, כנות וחשיבה חדשנית.",
    quote: "המוח שלי לא מפספס פרטים. הוא אוסף אותם עד שהם מרכיבים משהו שאף אחד אחר לא רואה.",
    studies: [
      "Mottron, L. (2006). Enhanced Perceptual Functioning",
      "Baron-Cohen, S. (2009). Empathizing-Systemizing",
      "Dawson, M. (2007). Autistic Intelligence",
    ],
  },
  {
    id: 10,
    label: "מיסוך",
    tags: ["זהות", "אותנטיות", "שחיקה"],
    finding: "מקושר",
    findingText: "מיסוך כרוני מקושר ישירות לשחיקה, לדיכאון ולעיכוב משמעותי באבחון.",
    description:
      "מיסוך הוא ביצוע מאומץ של התנהגות נוירוטיפיקלית. הוא מסתיר תכונות אוטיסטיות במחיר כבד לרווחה ולזהות.",
    quote: "כל כך הרבה זמן העמדתי פנים של 'נורמלי' עד ששכחתי מה אני באמת.",
    studies: [
      "Hull, L. (2017). Putting on My Best Normal",
      "Pearson, A. (2021). Autistic Masking",
      "Cage, E. (2019). Camouflaging and Mental Health",
    ],
  },
];

// ─── Bottom-of-page research insights ─────────────────────────────────────────

const INSIGHTS = [
  {
    title: "התפיסה מקומית לפני שהיא כללית",
    body: "Enhanced Perceptual Functioning מתארת את התפיסה האוטיסטית כמכוונת־מקום: פרטים בודדים מעובדים בעוצמה גבוהה יותר מאשר הסצנה כולה. כפתור, זמזום או מרקם יכולים להשתלט על המודעות עוד לפני שהחדר נתפס כחדר — ולכן סינון של רעש רקע אינו עניין של מאמץ רב יותר.",
    source: "Mottron et al. (2006) — Enhanced Perceptual Functioning",
  },
  {
    title: "אי־ההבנה פועלת בשני הכיוונים",
    body: "The Double Empathy Problem ממסגרת מחדש את הקושי החברתי כאי־התאמה הדדית ולא כליקוי חד־צדדי. אנשים על הרצף ואנשים שאינם על הרצף מתקשים כל אחד לקרוא את האחר; אנשים על הרצף שמתקשרים זה עם זה אינם חווים כשל כזה. ה'ליקוי' חי בפער, לא במוח אחד.",
    source: "Milton (2012) — The Double Empathy Problem",
  },
  {
    title: "בקרת עוצמת הקול תקועה",
    body: "עדויות ממקור ראשון מתארות באופן עקבי צליל שמגיע ללא היררכיה — כל מקור בעוצמה שווה, בלתי אפשרי לווסת. חוויה חושית לא־טיפוסית מוערכת אצל עד 90% מהאנשים על הרצף וחוצה את כל הערוצים החושיים, מה שהופך סביבות רגילות לכואבות ממש ולא רק לא־נעימות.",
    source: "Grandin; Robertson & Baron-Cohen (2017)",
  },
  {
    title: "למיסוך יש מחיר מדיד",
    body: "מיסוך — דיכוי של סטימינג, כפייה של קשר עין, תסריט מוכן לשיחה — הוא ביצוע מאומץ שנמשך לאורך ימים שלמים. מחקרים מקשרים מיסוך כרוני לשחיקה, לדיכאון ולאבחון מאוחר או חסר, במיוחד אצל נשים ואנשים מקבוצות מיעוט שההצגה שלהם אינה תואמת את התבנית המצופה.",
    source: "Hull et al. (2017); Cage & Troxell-Whitman (2019)",
  },
];

// ─── Color palette: orange, pink, purple cycling ──────────────────────────────
const ACCENT = ["#FFC99D", "#FFC1BB", "#BCC2FF"];
const accent = (i: number) => ACCENT[i % 3];

// ─── Node positions around a circle ───────────────────────────────────────────

function getNodePos(i: number, total: number, rx: number, ry: number) {
  const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * rx,
    y: Math.sin(angle) * ry,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState(0); // index into TOPICS
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  // Dissolve-to-black before navigating back to the simulator.
  const [fading, setFading] = useState(false);

  const topic = TOPICS[activeTopic];

  function selectTopic(idx: number) {
    setActiveTopic(idx);
  }

  // SVG circle layout. Sized so the whole section (nav + headline + wheel +
  // counter + right card) fits inside 100vh on a 1440x900 desktop.
  const SVG = 500;
  const CX = SVG / 2;
  const CY = SVG / 2;
  const RX = 190;
  const RY = 190;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&family=Assistant:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .research-root {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: 'Assistant', sans-serif;
          overflow-x: hidden;
          /* Shared safe-area frame on all four sides. */
          padding: var(--gutter);
          box-sizing: border-box;
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
          /* Header/hero column removed — two columns now: the centre wheel
             (remaining space) and the topic-detail panel on the right. */
          grid-template-columns: minmax(0, 1.9fr) minmax(280px, 1fr);
          column-gap: 56px;
          align-items: center;              /* all three columns balanced vertically */
          /* Hard constraint: the whole section fits one viewport, no scroll.
             Subtract the header row AND the top+bottom safe-area padding on the
             root so the wheel still fits without forcing a scroll. */
          height: calc(100vh - 60px - 2 * var(--gutter));
          max-height: calc(100vh - 60px - 2 * var(--gutter));
          padding: 24px 48px;
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          overflow: hidden;
        }
        @media (max-width: 1200px) {
          .r-main { grid-template-columns: 1fr; gap: 56px; padding: 40px 24px 0; align-items: start; }
          .r-right { padding-left: 0 !important; border-left: none !important; margin: 0 auto !important; }
          .r-left { padding-right: 0 !important; }
        }

        /* ── Left column ── */
        /* Capped and pushed to the track's right edge so leftover space in the
           track doesn't inflate the gap before the wheel. Mirrors the right
           card's 340px for symmetry. The description is width-capped too so the
           column's text block reads as a solid edge rather than ragged space. */
        .r-left {
          padding-right: 0;
          width: 100%;
          max-width: 340px;
          margin-left: auto;   /* hug the wheel side of the track */
        }
        .r-heading {
          font-family: 'Amiri', serif;
          font-size: clamp(38px, 3.4vw, 52px);
          font-weight: 400;
          line-height: 1.05;
          color: #FFE9D2;                    /* peach/cream serif, not white */
          margin: 0 0 20px;
        }
        .r-desc {
          font-size: 14px;
          line-height: 1.75;
          color: rgba(255,255,255,0.45);
          margin: 0 0 36px;
        }
        .r-stats {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 20px 14px;
          margin-bottom: 30px;
        }
        .r-stat-num {
          font-family: 'Amiri', serif;
          font-size: 30px; color: #FFC99D; line-height: 1;
          margin-bottom: 3px;
        }
        .r-stat-label {
          font-size: 10px; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
        }
        .r-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 22px;
          border: 1px solid rgba(255,201,157,0.5);
          border-radius: 3px;
          background: transparent;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: #FFC99D; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .r-cta-btn:hover { background: rgba(255,201,157,0.06); border-color: #FFC99D; }

        /* ── Center: SVG map ── */
        .r-center {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          width: 100%;
          /* The left column's text edge is ragged (glyphs, no border) while the
             right card has a hard border, so an exactly-centred wheel still
             reads as sitting right. Nudge left to balance it optically. */
          transform: translateX(-14px);
        }
        .r-map-label {
          font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); text-align: center; margin: 0 0 6px;
        }
        /* Breathing room between the prompt and the wheel */
        .r-map-arrow { color: rgba(255,255,255,0.25); font-size: 12px; text-align: center; margin: 0 0 20px; }

        /* The wheel shrinks to fit the available height — never forces a scroll.
           margin: 0 auto guarantees it is centred within the middle column. */
        .r-wheel {
          display: block;
          width: 100%;
          height: auto;
          max-width: 500px;
          max-height: calc(100vh - 260px);
          margin: 0 auto;
        }

        .topic-node { cursor: pointer; transition: all 0.25s ease; }
        .topic-node:hover .node-circle { filter: drop-shadow(0 0 10px rgba(255,201,157,0.5)); }

        /* Slow rotation on the dotted ring around the eye */
        @keyframes eyeRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .eye-ring { animation: eyeRingSpin 90s linear infinite; }

        .r-counter {
          margin-top: 26px; text-align: center;
          font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }
        .r-counter span { color: rgba(255,255,255,0.7); font-size: 16px; font-family: 'Amiri', serif; letter-spacing: 0; }
        .r-progress {
          display: flex; gap: 4px; justify-content: center; margin-top: 12px;
        }
        .r-prog-seg {
          height: 2px; width: 22px; border-radius: 1px;
          background: rgba(255,255,255,0.12);
          transition: background 0.3s;
        }
        .r-prog-seg.active { background: #FFC99D; }

        /* ── Right panel — a contained card, not an open column ── */
        .r-right {
          width: 100%;
          max-width: 340px;
          /* Sits at the start of its cell (not pinned right) so the gap between
             the wheel and the card matches the gap on the wheel's left. */
          margin: 0;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 16px;
          padding: 20px 18px;
          /* Stay inside the viewport; scroll internally only in the worst case. */
          max-height: calc(100vh - 108px);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .r-right::-webkit-scrollbar { display: none; }
        /* Thin divider between the header block and the finding */
        .r-divider {
          height: 1px;
          background: rgba(255,255,255,0.09);
          margin: 0 0 14px;
        }
        /* Filled peach CTA at the bottom of the card */
        .r-full-research {
          display: block;
          width: 100%;
          margin-top: 4px;
          background: #FFC99D;
          color: #1a0f00;
          border: none;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 10.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 600;
          font-family: 'Assistant', sans-serif;
          cursor: pointer;
          transition: box-shadow 0.2s ease, opacity 0.2s ease;
          opacity: 0.92;
        }
        .r-full-research:hover { opacity: 1; box-shadow: 0 0 20px rgba(255,201,157,0.5); }

        .r-topic-num {
          font-size: 11px; letter-spacing: 0.22em;
          color: rgba(255,255,255,0.25); margin-bottom: 6px;
        }
        .r-topic-title {
          font-family: 'Amiri', serif; font-style: italic;
          font-size: clamp(22px, 2.2vw, 28px);
          color: #FFC99D; font-weight: 400; margin: 0 0 10px;
          line-height: 1.1;
        }
        .r-topic-desc {
          font-size: 12px; line-height: 1.6;
          color: rgba(255,255,255,0.5); margin-bottom: 12px;
        }
        .r-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px; }
        .r-tag {
          font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 4px 10px; border-radius: 3px;
          color: rgba(255,255,255,0.4);
        }
        .r-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 14px 15px; margin-bottom: 12px;
        }
        .r-card-label {
          font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-bottom: 8px;
        }
        .r-finding-num {
          font-family: 'Amiri', serif; font-size: 34px;
          color: #FFC99D; line-height: 1; display: inline;
        }
        .r-finding-text {
          font-size: 12px; line-height: 1.55;
          color: rgba(255,255,255,0.5); margin-top: 6px;
        }
        .r-quote {
          font-family: 'Amiri', serif; font-style: italic;
          font-size: 12px; line-height: 1.55;
          color: rgba(255,255,255,0.6);
        }
        .r-quote::before { content: "❝ "; color: #FFC99D; font-size: 15px; }
        .r-studies-list { display: flex; flex-direction: column; gap: 6px; }
        .r-study-row {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 10.5px; color: rgba(255,255,255,0.45);
          padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05);
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
          font-family: 'Assistant', sans-serif;
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
          border-radius: 3px; padding: 9px 12px;
          font-size: 12px; color: rgba(255,255,255,0.55);
          cursor: pointer; text-align: left;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          font-family: 'Assistant', sans-serif;
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

        /* ── Scroll hint between the viewport section and the insights ── */
        .r-scroll-hint {
          position: relative;
          margin-top: -34px;          /* sits just inside the 100vh section's edge */
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          pointer-events: none;
          /* Soft gradient so the hint melts out of the section above */
          background: linear-gradient(to bottom, transparent, rgba(255,201,157,0.03));
          padding-bottom: 6px;
        }
        .r-scroll-hint-text {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,201,157,0.32);
          font-family: 'Assistant', sans-serif;
        }
        .r-scroll-hint-arrow {
          font-size: 13px;
          line-height: 1;
          color: rgba(255,201,157,0.42);
          animation: scrollHintBob 2.4s ease-in-out infinite;
        }
        @keyframes scrollHintBob {
          0%, 100% { transform: translateY(0);   opacity: 0.4; }
          50%      { transform: translateY(5px); opacity: 0.8; }
        }

        /* ── Bottom insights section ── */
        .r-insights {
          width: 100%;
          /* Match the main section's container so side margins line up */
          max-width: 1500px;
          margin: 96px auto 0;
          padding: 0 48px;
        }
        .r-insights-heading {
          font-family: 'Amiri', serif;
          font-size: clamp(34px, 3.6vw, 48px);
          font-weight: 400;
          line-height: 1.15;
          color: #fff;
          margin: 0 0 12px;
        }
        .r-insights-sub {
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255,255,255,0.45);
          margin: 0 0 44px;
          max-width: 620px;
        }
        /* Four equal cards in one row — never 3+1 */
        .r-insights-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          align-items: stretch;
        }
        .r-insight-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 24px 22px;
          transition: border-color 0.25s ease, background 0.25s ease;
        }
        .r-insight-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,201,157,0.25);
        }
        .r-insight-num {
          font-family: 'Amiri', serif;
          font-size: 12px;
          letter-spacing: 0.22em;
          opacity: 0.7;
          margin-bottom: 12px;
        }
        .r-insight-title {
          font-family: 'Amiri', serif;
          font-style: italic;
          font-size: clamp(19px, 1.5vw, 23px);
          font-weight: 400;
          line-height: 1.25;
          margin: 0 0 14px;
        }
        .r-insight-body {
          font-size: 13.5px;
          line-height: 1.7;
          color: rgba(255,255,255,0.65);
          margin: 0 0 22px;
        }
        .r-insight-source {
          margin-top: auto; /* pins sources to the bottom → equal-height cards */
          font-size: 10px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 14px;
        }
        /* 4-across → 2x2 → 1 column. Never an orphaned 3+1. */
        @media (max-width: 1200px) {
          .r-insights { padding: 0 24px; }
          .r-insights-grid { grid-template-columns: repeat(2, 1fr); gap: 22px; }
        }
        @media (max-width: 700px) {
          .r-insights { margin-top: 64px; }
          .r-insights-grid { grid-template-columns: 1fr; gap: 20px; }
          .r-insight-card { padding: 24px 22px; }
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

        {/* Dissolve-to-black overlay. Always mounted so the 0→1 opacity
            transition actually animates (if it only mounted when fading were
            already true, it would appear at full opacity with no fade). */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            opacity: fading ? 1 : 0,
            transition: 'opacity 0.6s ease',
            pointerEvents: fading ? 'auto' : 'none',
            zIndex: 9999,
          }}
        />

        {/* ── Nav ── */}
        <nav className="r-nav">
          <div className="r-nav-logo">
            <img src="/icons/New_logo_eye.svg" alt="" style={{ width: 22, opacity: 0.7 }} />
            AURA SIMULATOR
          </div>
          <button
            onClick={() => {
              setFading(true);
              setTimeout(() => router.push('/'), 600);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(255,201,157,0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            style={{
              background: '#FFC99D',
              border: 'none',
              color: '#0a0807',
              fontWeight: 600,
              padding: '8px 20px',
              borderRadius: 3,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'Assistant, sans-serif',
              transition: 'box-shadow 0.2s ease',
              direction: 'rtl',
            }}
          >
            {/* row-reverse keeps the Hebrew text RTL-rendered on the LEFT while
                the arrow sits on the RIGHT (per requested layout). */}
            <span style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span>חזרה לסימולטור</span>
              <span aria-hidden>→</span>
            </span>
          </button>
        </nav>

        {/* ── Main 2-col (header/hero removed) ── */}
        <div className="r-main">

          {/* CENTER — SVG knowledge map */}
          <div className="r-center">
            <p className="r-map-label" style={{ direction: "rtl" }}>חקרו את המחקר<br />על ידי בחירת נושא</p>
            <p className="r-map-arrow">↓</p>

            <svg
              className="r-wheel"
              width={SVG} height={SVG} viewBox={`0 0 ${SVG} ${SVG}`}
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* Warm glow behind the centre eye */}
                <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFC99D" stopOpacity="0.12" />
                  <stop offset="50%" stopColor="#FFC99D" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#FFC99D" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Dotted orbit ring the nodes sit on */}
              <circle
                cx={CX} cy={CY} r={RX}
                fill="none"
                stroke="rgba(255,201,157,0.22)"
                strokeWidth={1}
                strokeDasharray="2 8"
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
                    stroke={accent(i)}
                    strokeWidth={0.5}
                    className="line-pulse"
                  />
                );
              })}

              {/* Small coloured dot nodes on the ring, between the circles */}
              {TOPICS.map((_, i) => {
                const mid = getNodePos(i + 0.5, TOPICS.length, RX, RY);
                return (
                  <circle
                    key={`dot-${i}`}
                    cx={CX + mid.x} cy={CY + mid.y} r={2.5}
                    fill={accent(i)}
                    opacity={0.55}
                  />
                );
              })}

              {/* ── Centre: warm glow + dotted ring + the AURA eye ── */}
              <circle cx={CX} cy={CY} r={47} fill="url(#eyeGlow)" />
              <circle
                cx={CX} cy={CY} r={37}
                fill="none"
                stroke="rgba(255,201,157,0.26)"
                strokeWidth={1}
                strokeDasharray="1 6"
                className="eye-ring"
                style={{ transformOrigin: `${CX}px ${CY}px` }}
              />
              <image
                href="/icons/New_logo_eye.svg"
                x={CX - 29} y={CY - 29}
                width={58} height={58}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.9}
              />

              {/* Topic nodes */}
              {TOPICS.map((t, i) => {
                const pos = getNodePos(i, TOPICS.length, RX, RY);
                const x = CX + pos.x;
                const y = CY + pos.y;
                const isActive = activeTopic === i;
                const isHovered = hoveredNode === i;
                const scale = isActive ? 1.18 : isHovered ? 1.07 : 1;
                const nodeR = 42;
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
                    {/* Elevated glow for the selected topic */}
                    {isActive && (
                      <>
                        <circle r={nodeR + 14} fill={`${accent(i)}14`} />
                        <circle r={nodeR + 7} fill={`${accent(i)}1A`} />
                      </>
                    )}
                    <circle
                      className="node-circle"
                      r={nodeR}
                      fill={isActive ? `${accent(i)}26` : "rgba(10,8,6,0.9)"}
                      stroke={isActive ? accent(i) : `${accent(i)}8C`}
                      strokeWidth={isActive ? 2 : 1.25}
                    />
                    {/* Number */}
                    <text
                      x={0} y={-nodeR + 16}
                      textAnchor="middle"
                      fontSize={8}
                      fill={isActive ? accent(i) : `${accent(i)}99`}
                      letterSpacing="0.12em"
                      fontFamily="Assistant, sans-serif"
                    >
                      {String(t.id).padStart(2, "0")}
                    </text>
                    {/* Label text — split into lines */}
                    {words.length <= 1 ? (
                      <text x={0} y={5} textAnchor="middle" fontSize={9.5} fill="white" fontFamily="Assistant, sans-serif">{t.label}</text>
                    ) : words.length === 2 ? (
                      <>
                        <text x={0} y={0} textAnchor="middle" fontSize={9.5} fill="white" fontFamily="Assistant, sans-serif">{words[0]}</text>
                        <text x={0} y={12} textAnchor="middle" fontSize={9.5} fill="white" fontFamily="Assistant, sans-serif">{words[1]}</text>
                      </>
                    ) : (
                      <>
                        <text x={0} y={-4} textAnchor="middle" fontSize={9} fill="white" fontFamily="Assistant, sans-serif">{words[0]}</text>
                        <text x={0} y={7} textAnchor="middle" fontSize={9} fill="white" fontFamily="Assistant, sans-serif">{words[1]}</text>
                        <text x={0} y={18} textAnchor="middle" fontSize={9} fill="white" fontFamily="Assistant, sans-serif">{words[2]}</text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="r-counter" style={{ direction: "rtl" }}>
              <span dir="ltr"><span>{activeTopic + 1}</span> / 10</span> &nbsp; נושאי מחקר
            </div>
            <div className="r-progress">
              {TOPICS.map((_, i) => (
                <div
                  key={i}
                  className="r-prog-seg"
                  onClick={() => selectTopic(i)}
                  style={{ cursor: "pointer", background: activeTopic === i ? accent(i) : "rgba(255,255,255,0.12)" }}
                />
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="r-right" style={{ direction: "rtl", textAlign: "right" }}>
            <div className="r-topic-num" dir="ltr" style={{ textAlign: "right" }}>{String(topic.id).padStart(2, "0")}</div>
            <div className="r-topic-title">{topic.label}</div>
            <p className="r-topic-desc">{topic.description}</p>
            <div className="r-tags">
              {topic.tags.map((tag, i) => (
                <span key={tag} className="r-tag" style={{ borderColor: `${accent(i)}40`, color: `${accent(i)}99` }}>{tag}</span>
              ))}
            </div>

            <div className="r-divider" />

            {/* Key finding */}
            <div className="r-card">
              <div className="r-card-label">ממצא מרכזי</div>
              <div>
                <span className="r-finding-num">{topic.finding}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginInlineStart: 6 }}>
                  {topic.findingText}
                </span>
              </div>
            </div>

            {/* Participant insight */}
            <div className="r-card">
              <div className="r-card-label">תובנה ממשתתפים</div>
              <p className="r-quote">{topic.quote}</p>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>– משתתפים במחקר</div>
            </div>

            {/* Related studies */}
            <div className="r-card">
              <div className="r-card-label">מחקרים קשורים</div>
              <div className="r-studies-list">
                {topic.studies.map((s) => (
                  <div key={s} className="r-study-row">
                    <span dir="ltr" style={{ textAlign: "left" }}><span className="r-study-icon">☰</span>{s}</span>
                    <span style={{ color: "rgba(255,201,157,0.5)", fontSize: 11 }}>←</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Scroll hint — the section above is 100vh, so signal there is more below */}
        <div className="r-scroll-hint" aria-hidden>
          <span className="r-scroll-hint-text" style={{ direction: "rtl" }}>עוד למטה</span>
          <span className="r-scroll-hint-arrow">↓</span>
        </div>

        {/* ── Research insights — fills the lower page, 2 columns on desktop ── */}
        <section className="r-insights">
          <h2 className="r-insights-heading" style={{ direction: "rtl" }}>תובנות מרכזיות מהמחקר</h2>
          <p className="r-insights-sub" style={{ direction: "rtl" }}>
            ארבעה חוטים חוזרים כמעט בכל מחקר על תפיסה אוטיסטית.
          </p>

          <div className="r-insights-grid">
            {INSIGHTS.map((ins, i) => (
              <article key={ins.title} className="r-insight-card">
                <div className="r-insight-num" style={{ color: accent(i) }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="r-insight-title" style={{ color: accent(i), direction: "rtl", textAlign: "right" }}>{ins.title}</h3>
                <p className="r-insight-body" style={{ direction: "rtl", textAlign: "right" }}>{ins.body}</p>
                <div className="r-insight-source" dir="ltr" style={{ borderTopColor: `${accent(i)}33`, textAlign: "left" }}>
                  {ins.source}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* bottom padding */}
        <div style={{ height: 60 }} />

      </div>
    </>
  );
}
