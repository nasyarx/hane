/**
 * Aile bütçesi — iş mantığı yardımcıları (saf fonksiyonlar, test edilebilir)
 */

export type Repeat = "none" | "daily" | "weekly" | "monthly" | "yearly";

/** Tekrarlanan bir görevin bir sonraki vade tarihini hesaplar. */
export function nextRepeatDate(from: Date, repeat: Repeat): Date | null {
  if (repeat === "none") return null;
  const d = new Date(from.getTime());
  switch (repeat) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly": {
      const day = d.getDate();
      d.setMonth(d.getMonth() + 1);
      // Ay sonu taşmalarını düzelt (31 Oca → 28/29 Şub)
      if (d.getDate() !== day) d.setDate(0);
      break;
    }
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d;
}

export const ZAKAT_RATE = 0.025;
export const NISAB_GRAMS_GOLD = 85;

export interface ZakatResult {
  nisabAmount: number; // 85 gram altın karşılığı TL
  isAboveNisab: boolean;
  calculatedAmount: number; // ödenecek zekât (malvarlığının %2,5'i)
}

/** Zekât hesaplaması: nisabın üzerindeyse malvarlığının %2,5'i. */
export function computeZakat(totalWealth: number, goldPricePerGram: number): ZakatResult {
  const nisabAmount = NISAB_GRAMS_GOLD * goldPricePerGram;
  const isAboveNisab = totalWealth >= nisabAmount;
  return {
    nisabAmount,
    isAboveNisab,
    calculatedAmount: isAboveNisab ? Math.round(totalWealth * ZAKAT_RATE * 100) / 100 : 0,
  };
}

/** Verilen bir ayın [başlangıç, bitiş) aralığını döner (yerel saat). */
export function monthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/** Belirtilen günden itibaren `days` gün sonunda gün sonu (23:59:59.999). */
export function endOfDayPlus(now: Date, days: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59, 59, 999);
  return d;
}
