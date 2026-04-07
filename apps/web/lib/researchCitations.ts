export type Citation = {
  id: string;
  label: string;
  filename: string;
  excerpt: string;
};

export const CITATIONS: Citation[] = [
  {
    id: "DEP",
    label: "Milton et al. — Double Empathy (2022)",
    filename: "D. Milton - The_double_empathy_problem_ten_years_on - PPDF.pdf",
    excerpt:
      "“the ‘double empathy problem’ refers to a breakdown in mutual understanding… a problem for both parties… interaction between autistic and non-autistic people as a primarily mutual and interpersonal issue.”",
  },
  {
    id: "EPF",
    label: "Mottron et al. — Enhanced Perceptual Functioning (2006)",
    filename: "Enhanced_Perceptual_Functioning_in_Autis.pdf",
    excerpt:
      "“locally oriented visual and auditory perception, enhanced low-level discrimination… autonomy of low-level information processing toward higher-order operations…”",
  },
  {
    id: "G-AUD",
    label: "Grandin — Inside View (auditory)",
    filename: "An_Inside_View_of_Autism.pdf",
    excerpt:
      "“My hearing is like having a hearing aid with the volume control stuck on ‘super loud.’ … an open microphone that picks up everything… I can’t modulate incoming auditory stimulation.”",
  },
  {
    id: "G-TAC",
    label: "Grandin — Inside View (tactile)",
    filename: "An_Inside_View_of_Autism.pdf",
    excerpt:
      "“petticoats itched and scratched… Most people adapt… Even now… it takes me three to four days to fully adapt…”",
  },
];

export function citationById(id: string) {
  return CITATIONS.find((c) => c.id === id) ?? null;
}

