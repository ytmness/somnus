import { FAQ_ENTRIES, type FaqEntry } from "@/lib/chatbot/faqs";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchFaq(question: string): FaqEntry | null {
  const text = fold(question);
  if (text.length < 2) return null;

  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of FAQ_ENTRIES) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const key = fold(keyword);
      if (!key) continue;
      if (text === key) score += 6;
      else if (text.includes(key)) score += 3;
      else {
        const parts = key.split(" ").filter((part) => part.length > 3);
        const hits = parts.filter((part) => text.includes(part)).length;
        score += hits;
      }
    }
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best || best.score < 2) return null;
  return best.entry;
}

export const FAQ_FALLBACK =
  "Eso se me sale un poco. Prueba con comprar, mis boletos, entrar al evento o pagos. Si es un caso tuyo, escribe a tickets@somnus.live.";
