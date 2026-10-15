/** Para, tarih ve etiket yardımcıları */

export function formatTL(value: number | null | undefined, opts?: { compact?: boolean }): string {
  const v = value ?? 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: opts?.compact ? 0 : 2,
    minimumFractionDigits: opts?.compact ? 0 : 2,
  }).format(v);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length <= 10 ? value + "T12:00:00" : value) : value;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length <= 10 ? value + "T12:00:00" : value) : value;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD → unix ms (öğlen saatiyle, yerel kaymaya karşı) */
export function isoToMs(iso: string): number {
  return new Date(iso + "T12:00:00").getTime();
}

export const INCOME_TYPE_LABELS: Record<string, string> = {
  income: "Gelir",
  expense: "Gider",
};

export const PAYMENT_METHODS = [
  "nakit",
  "kredi kartı",
  "banka kartı",
  "havale/EFT",
  "otomatik ödeme",
  "senet",
  "diğer",
];

export const BILL_PERIOD_LABELS: Record<string, string> = {
  monthly: "Aylık",
  quarterly: "3 Aylık",
  yearly: "Yıllık",
  once: "Tek seferlik",
};

export const DEBT_KIND_LABELS: Record<string, string> = {
  debt: "Borcumuz",
  receivable: "Alacağımız",
};

export const INSURANCE_KIND_LABELS: Record<string, string> = {
  sigorta: "Sigorta",
  kasko: "Kasko",
  muayene: "Araç Muayene",
  diger: "Diğer",
};

export const ASSET_KIND_LABELS: Record<string, string> = {
  doviz: "Döviz",
  altin: "Altın",
  tasinmaz: "Taşınmaz",
  tasinir: "Taşınır",
  nakit: "Nakit",
  diger: "Diğer",
};

export const PROMO_DIRECTION_LABELS: Record<string, string> = {
  in: "Gelen",
  out: "Giden",
};

export const PROMO_KIND_LABELS: Record<string, string> = {
  maas_promosyonu: "Maaş Promosyonu",
  odul_puan: "Ödül / Puan",
  komisyon: "Komisyon / Masraf",
  diger: "Diğer",
};

export const FEE_PERIOD_LABELS: Record<string, string> = {
  monthly: "Aylık",
  per_lesson: "Ders Başına",
  per_term: "Dönemlik",
};

export const WEEK_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export const REPEAT_LABELS: Record<string, string> = {
  none: "Tekrarsız",
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
  yearly: "Yıllık",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
};

/** Vade yakınlığına göre renk sınıfı */
export function dueUrgencyClass(dateStr: string | null | undefined): string {
  if (!dateStr) return "text-muted-foreground";
  const days = daysUntil(dateStr);
  if (days < 0) return "text-destructive font-semibold";
  if (days <= 3) return "text-amber-600 font-semibold";
  return "text-muted-foreground";
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr.length <= 10 ? dateStr + "T12:00:00" : dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
