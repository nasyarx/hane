import { describe, expect, it } from "vitest";
import { computeZakat, nextRepeatDate } from "./lib/budget";

describe("nextRepeatDate", () => {
  it("günlük tekrar bir gün ekler", () => {
    const next = nextRepeatDate(new Date(2026, 0, 15, 9, 0), "daily");
    expect(next).toEqual(new Date(2026, 0, 16, 9, 0));
  });

  it("haftalık tekrar 7 gün ekler", () => {
    const next = nextRepeatDate(new Date(2026, 0, 15, 9, 0), "weekly");
    expect(next).toEqual(new Date(2026, 0, 22, 9, 0));
  });

  it("aylık tekrar ay sonu taşmasını düzeltir (31 Oca → 28 Şub)", () => {
    const next = nextRepeatDate(new Date(2026, 0, 31, 9, 0), "monthly");
    expect(next!.getFullYear()).toBe(2026);
    expect(next!.getMonth()).toBe(1); // Şubat
    expect(next!.getDate()).toBe(28);
  });

  it("yıllık tekrar bir yıl ekler", () => {
    const next = nextRepeatDate(new Date(2026, 4, 10, 9, 0), "yearly");
    expect(next).toEqual(new Date(2027, 4, 10, 9, 0));
  });

  it("tekrarsız görev için null döner", () => {
    expect(nextRepeatDate(new Date(), "none")).toBeNull();
  });
});

describe("computeZakat", () => {
  it("nisabın altında kalınca zekât 0 olur", () => {
    const r = computeZakat(80000, 4000); // nisab 85*4000 = 340.000
    expect(r.isAboveNisab).toBe(false);
    expect(r.calculatedAmount).toBe(0);
    expect(r.nisabAmount).toBe(340000);
  });

  it("nisabın üzerindeyken %2,5 hesaplar", () => {
    const r = computeZakat(400000, 4000); // nisab 340.000
    expect(r.isAboveNisab).toBe(true);
    expect(r.calculatedAmount).toBe(10000);
  });

  it("nisab sınırında zekât düşer", () => {
    const r = computeZakat(340000, 4000);
    expect(r.isAboveNisab).toBe(true);
    expect(r.calculatedAmount).toBe(8500);
  });
});
