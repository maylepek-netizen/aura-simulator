// Shared Hebrew copy for the reflection / summary screen. Both
// app/summary/page.tsx and the ReflectionScreen in app/result/page.tsx render
// this identical text, so it lives here to guarantee they never drift.
//
// Gender agreement: singular masculine / singular feminine, with the plural form
// kept as the neutral fallback (Non-binary / Prefer not to say). The past-tense
// 2nd-person singular "חווית" is identical for masc/fem in unvocalised Hebrew;
// only the plural ("חוויתם") differs.

export type ReflectionText = {
  headline: string;
  statement: string;
  subtitle: string;
  bankButton: string;
  newButton: string;
};

export function getReflectionText(gender: string | undefined): ReflectionText {
  const g = (gender ?? "").toLowerCase();
  const experienced = g === "male" || g === "female" ? "חווית" : "חוויתם";
  const wouldLike = g === "male" ? "האם תרצה" : g === "female" ? "האם תרצי" : "האם תרצו";
  return {
    headline: "כל תפיסה מספרת סיפור אחר.",
    statement: `מה ש${experienced} היה רק פרשנות אפשרית אחת של העולם.`,
    subtitle: `${wouldLike} לחקור נקודת מבט נוספת?`,
    bankButton: "בנק הסימולציות",
    newButton: "סימולציה חדשה",
  };
}
