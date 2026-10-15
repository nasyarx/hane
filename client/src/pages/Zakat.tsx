import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatTL, formatDateShort, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { HeartHandshake, Info, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ZakatRecordRow {
  id: number;
  year: number;
  totalWealth: number;
  goldPricePerGram: number | null;
  nisabAmount: number | null;
  calculatedAmount: number;
  note: string | null;
  payments: { id: number; amount: number; paidDate: string; recipient: string | null }[];
  givenAmount: number;
  remainingAmount: number;
}

export default function Zakat() {
  const list = trpc.zakat.list.useQuery();
  const utils = trpc.useUtils();
  const saveRecord = trpc.zakat.saveRecord.useMutation();
  const removeRecord = trpc.zakat.deleteRecord.useMutation();
  const addPayment = trpc.zakat.addPayment.useMutation();
  const removePayment = trpc.zakat.deletePayment.useMutation();

  const [calcOpen, setCalcOpen] = useState(false);
  const [calcYear, setCalcYear] = useState(String(new Date().getFullYear()));
  const [totalWealth, setTotalWealth] = useState("");
  const [goldPrice, setGoldPrice] = useState("");
  const [calcNote, setCalcNote] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [payYear, setPayYear] = useState(String(new Date().getFullYear()));
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [recipient, setRecipient] = useState("");

  const records = (list.data ?? []) as ZakatRecordRow[];
  const currentYear = new Date().getFullYear();
  const current = records.find(r => r.year === currentYear);

  const refresh = () => {
    utils.zakat.list.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const doCalc = async () => {
    if (!totalWealth || !goldPrice) return;
    await saveRecord.mutateAsync({
      year: Number(calcYear),
      totalWealth: Number(totalWealth),
      goldPricePerGram: Number(goldPrice),
      note: calcNote.trim() || undefined,
    });
    refresh();
    toast.success(`${calcYear} yılı zekât hesabı kaydedildi`);
    setCalcOpen(false);
  };

  const doPay = async () => {
    if (!payAmount) return;
    await addPayment.mutateAsync({
      year: Number(payYear),
      amount: Number(payAmount),
      paidDate: payDate,
      recipient: recipient.trim() || undefined,
    });
    refresh();
    toast.success("Zekât ödemesi kaydedildi");
    setPayOpen(false);
    setPayAmount(""); setRecipient("");
  };

  return (
    <div>
      <PageHeader
        title="Zekat"
        description="Nisab (85 gram altın karşılığı) üzerinden yıllık zekâtınızı hesaplayın, verdiğiniz ödemeleri kaydedin ve kalanı görün."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setPayOpen(true); setPayYear(String(currentYear)); setPayDate(todayISO()); }}>
              <Plus className="h-4 w-4 mr-1" /> Zekât Ödemesi
            </Button>
            <Button onClick={() => { setCalcOpen(true); setCalcYear(String(currentYear)); }}>
              Zekât Hesapla
            </Button>
          </div>
        }
      />

      {/* Güncel yıl özeti */}
      <Card className="shadow-sm mb-6 border-primary/20 bg-gradient-to-br from-card to-accent/30">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            {currentYear} Yılı Zekât Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {current ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Hesaplanan Zekât</p>
                  <p className="font-display text-2xl font-semibold tabular-nums">{formatTL(current.calculatedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verilen</p>
                  <p className="font-display text-2xl font-semibold tabular-nums text-emerald-700">{formatTL(current.givenAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kalan</p>
                  <p className="font-display text-2xl font-semibold tabular-nums text-amber-700">{formatTL(current.remainingAmount)}</p>
                </div>
              </div>
              <Progress
                value={current.calculatedAmount > 0 ? Math.min(100, (current.givenAmount / current.calculatedAmount) * 100) : 0}
                className="h-2.5"
              />
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Malvarlığı: {formatTL(current.totalWealth)} · Altın gram: {formatTL(current.goldPricePerGram ?? 0)}</p>
                <p>Nisab: {formatTL(current.nisabAmount ?? 0)} (85 gr × gram fiyatı)</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              {currentYear} yılı için henüz hesap yapılmadı. "Zekât Hesapla" ile başlayın.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {records.length === 0 && (
          <Card className="lg:col-span-2 shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Henüz zekât hesabı yok.
            </CardContent>
          </Card>
        )}
        {records.map(r => (
          <Card key={r.id} className="shadow-sm">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-semibold">{r.year} Yılı</p>
                  <p className="text-xs text-muted-foreground">
                    Zekât: {formatTL(r.calculatedAmount)} · Verilen: {formatTL(r.givenAmount)} · Kalan:{" "}
                    <span className="text-amber-700 font-medium">{formatTL(r.remainingAmount)}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPayOpen(true);
                      setPayYear(String(r.year));
                      setPayDate(todayISO());
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ödeme
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(`${r.year} yılı hesabı silinsin mi?`)) {
                        removeRecord.mutate({ id: r.id }, { onSuccess: refresh });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {r.payments.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t pt-3">
                  {r.payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatDateShort(p.paidDate)}{p.recipient ? ` · ${p.recipient}` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">{formatTL(p.amount)}</span>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removePayment.mutate({ id: p.id }, { onSuccess: refresh })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hesap diyaloğu */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Zekât Hesapla</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Yıl</FieldLabel>
                <Input type="number" value={calcYear} onChange={e => setCalcYear(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Gram Altın (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={goldPrice} onChange={e => setGoldPrice(e.target.value)} placeholder="4520" />
              </Field>
            </div>
            <Field>
              <FieldLabel>Zekâta Tabi Malvarlığı (₺)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={totalWealth} onChange={e => setTotalWealth(e.target.value)} placeholder="Nakit + altın + birikim − borçlar" />
            </Field>
            <div className="flex gap-2 items-start rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Nisab = 85 gram altın karşılığı. Malvarlığı nisabın üzerindeyse zekât %2,5 olarak hesaplanır.
            </div>
            <Field>
              <FieldLabel>Not</FieldLabel>
              <Input value={calcNote} onChange={e => setCalcNote(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalcOpen(false)}>Vazgeç</Button>
            <Button onClick={doCalc} disabled={!totalWealth || !goldPrice}>Hesapla ve Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme diyaloğu */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Zekât Ödemesi</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Yıl</FieldLabel>
                <Input type="number" value={payYear} onChange={e => setPayYear(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Tutar (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tarih</FieldLabel>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Kimlere Verildi</FieldLabel>
                <Input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Yetimhane" />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Vazgeç</Button>
            <Button onClick={doPay} disabled={!payAmount}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
