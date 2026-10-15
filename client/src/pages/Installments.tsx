import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { daysUntil, dueUrgencyClass, formatTL, formatDateShort, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InstallmentRow {
  id: number;
  title: string;
  place: string | null;
  totalAmount: number;
  installmentCount: number;
  paidCount: number;
  monthlyAmount: number;
  startDate: string | null;
  isActive: number;
  payments: { id: number; installmentNo: number; amount: number; paidDate: string }[];
}

export default function Installments() {
  const list = trpc.installments.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.installments.create.useMutation();
  const remove = trpc.installments.delete.useMutation();
  const pay = trpc.installments.pay.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [count, setCount] = useState("");
  const [monthly, setMonthly] = useState("");
  const [startDate, setStartDate] = useState(todayISO());

  const [payInst, setPayInst] = useState<InstallmentRow | null>(null);
  const [payDate, setPayDate] = useState(todayISO());

  const rows = (list.data ?? []) as InstallmentRow[];
  const remainingTotal = rows.filter(r => r.isActive).reduce((s, r) => s + (r.installmentCount - r.paidCount) * r.monthlyAmount, 0);
  const monthlyLoad = rows.filter(r => r.isActive).reduce((s, r) => s + r.monthlyAmount, 0);

  const refresh = () => {
    utils.installments.list.invalidate();
    utils.transactions.list.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const submit = async () => {
    if (!title.trim() || !totalAmount || !count) return;
    await create.mutateAsync({
      title: title.trim(),
      place: place.trim() || undefined,
      totalAmount: Number(totalAmount),
      installmentCount: Number(count),
      monthlyAmount: Number(monthly || totalAmount) / Number(count),
      startDate: startDate || undefined,
    });
    refresh();
    toast.success("Taksit eklendi");
    setFormOpen(false);
    setTitle(""); setPlace(""); setTotalAmount(""); setCount(""); setMonthly("");
  };

  const doPay = async () => {
    if (!payInst) return;
    await pay.mutateAsync({
      installmentId: payInst.id,
      amount: payInst.monthlyAmount,
      paidDate: payDate,
      createTransaction: true,
    });
    refresh();
    toast.success("Taksit ödendi ve gider olarak kaydedildi");
    setPayInst(null);
  };

  return (
    <div>
      <PageHeader
        title="Taksitler"
        description="Taksitli alışverişler ve krediler — her ödeme gider işlemlerine otomatik işlenir."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Taksit
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-accent text-accent-foreground border-accent px-3 py-1.5 text-sm">
          Aylık taksit yükü: <strong className="ml-1">{formatTL(monthlyLoad)}</strong>
        </Badge>
        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 px-3 py-1.5 text-sm">
          Kalan toplam: <strong className="ml-1">{formatTL(remainingTotal)}</strong>
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardContent className="py-14 text-center">
              <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Henüz taksit kaydı yok.</p>
            </CardContent>
          </Card>
        )}
        {rows.map(i => {
          const pct = Math.round((i.paidCount / i.installmentCount) * 100);
          const start = i.startDate ? new Date(i.startDate + "T12:00:00") : null;
          const nextDue = start && !i.isActive === false && i.paidCount < i.installmentCount
            ? new Date(start.getFullYear(), start.getMonth() + i.paidCount, start.getDate())
            : null;
          return (
            <Card key={i.id} className={`shadow-sm ${!i.isActive ? "opacity-60" : ""}`}>
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.place ?? "—"}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant={i.isActive ? "default" : "secondary"} className="shrink-0">
                      {i.paidCount}/{i.installmentCount}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm(`"${i.title}" silinsin mi?`)) {
                          remove.mutate({ id: i.id }, { onSuccess: refresh });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="font-display text-2xl font-semibold mt-3 tabular-nums">
                  {formatTL(i.monthlyAmount)}
                  <span className="text-sm font-normal text-muted-foreground"> / ay</span>
                </p>
                <Progress value={pct} className="mt-2 h-2" />
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="text-muted-foreground">%{pct} tamamlandı · kalan {formatTL((i.installmentCount - i.paidCount) * i.monthlyAmount)}</span>
                  {nextDue && (
                    <span className={dueUrgencyClass(nextDue.toISOString().slice(0, 10))}>
                      Sıradaki: {formatDateShort(nextDue)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">{i.payments.length} ödeme kaydı</span>
                  {i.isActive ? (
                    <Button size="sm" onClick={() => { setPayInst(i); setPayDate(todayISO()); }}>
                      Taksit Öde
                    </Button>
                  ) : (
                    <Badge variant="secondary">Bitti ✓</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Yeni taksit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Yeni Taksit</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Ürün / Kredi</FieldLabel>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Buzdolabı" />
              </Field>
              <Field>
                <FieldLabel>Mağaza / Banka</FieldLabel>
                <Input value={place} onChange={e => setPlace(e.target.value)} placeholder="Teknosa" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Toplam (₺)</FieldLabel>
                <Input type="number" min="0" value={totalAmount} onChange={e => {
                  setTotalAmount(e.target.value);
                  if (count) setMonthly(String(Number(e.target.value) / Number(count)));
                }} />
              </Field>
              <Field>
                <FieldLabel>Taksit Sayısı</FieldLabel>
                <Input type="number" min="1" value={count} onChange={e => {
                  setCount(e.target.value);
                  if (totalAmount) setMonthly(String(Number(totalAmount) / Number(e.target.value)));
                }} />
              </Field>
              <Field>
                <FieldLabel>Aylık (₺)</FieldLabel>
                <Input type="number" min="0" value={monthly} onChange={e => setMonthly(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>İlk Ödeme Tarihi</FieldLabel>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!title.trim() || !totalAmount || !count}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Taksit öde */}
      <Dialog open={!!payInst} onOpenChange={v => !v && setPayInst(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              Taksit Öde — {payInst?.title} ({(payInst?.paidCount ?? 0) + 1}/{payInst?.installmentCount})
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field>
              <FieldLabel>Tarih</FieldLabel>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </Field>
            <p className="text-sm text-muted-foreground">
              Ödenecek tutar: <strong className="text-foreground">{formatTL(payInst?.monthlyAmount ?? 0)}</strong> — gider işlemi olarak kaydedilir.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayInst(null)}>Vazgeç</Button>
            <Button onClick={doPay}>Ödemeyi Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
