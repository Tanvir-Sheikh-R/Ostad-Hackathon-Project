import type { Subject } from "@/lib/types";

/**
 * Subjects the picker must never offer.
 *
 * The backend hides subjects where no chapter has an embedding, but the browser can
 * still be holding an older catalog in localStorage — and a deployment can lag behind
 * the commit that changed the filter. So the exclusion is enforced here as well, on the
 * frontend only (this ships with the Vercel build; no backend rebuild needed).
 *
 * Matched two ways: the chapters.json subject key, and the label in either language, so
 * a renamed key still disappears.
 */
const HIDDEN_KEYS = new Set<string>([
  // 39 chapters in chapters.json, zero embedded -> nothing to search, quiz or answer.
  "general_songskrito",
]);

const HIDDEN_LABEL = /sanskrit|সংস্কৃত/i;

type SubjectLike = Pick<Subject, "subject" | "label"> & { label_en?: string };

export function isHiddenSubject(subject: SubjectLike): boolean {
  if (HIDDEN_KEYS.has(subject.subject)) {
    return true;
  }
  const labels = `${subject.label} ${subject.label_en ?? ""}`;
  return HIDDEN_LABEL.test(labels);
}
