import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILL_PERIOD_LABELS, dueUrgencyClass, daysUntil, formatTL, formatDateShort, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Banknote, Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BillRow {
  id: number;
  name: string;
  provider: string | null;
  amount: number;
  period: string;
  dueDay: number | null;
  nextDueDate: string | null;
  isActive: number;
  note: string | null;
  payments: { id: number; amount: number; paidDate: string; note: string | null }[];
}

export default function Bills() {
  const list = trpc.bills.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.bills.create.useMutation();
  const remove = trpc.bills.delete.useMutation();
  const markPaid = trpc.bills.markPaid.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [payBill, setPayBill] = useState<BillRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [dueDay, setDueDay] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");

  const bills = (list.data ?? []) as BillRow[];
  const monthlyTotal = bills.filter(b => b.isActive && b.period === "monthly").reduce((s, b) => s + b.amount, 0);

  const submit = async () => {
    if (!name.trim() || !amount) return;
    await create.mutateAsync({
      name: name.trim(),
      provider: provider.trim() || undefined,
      amount: Number(amount),
      period: period as "monthly" | "quarterly" | "yearly" | "once",
      dueDay: dueDay ? Number(dueDay) : undefined,
      nextDueDate: nextDueDate || undefined,
    });
    utils.bills.list.invalidate();
    utils.dashboard.summary.invalidate();
    toast.success("Fatura eklendi");
    setFormOpen(false);
    setName(""); setProvider(""); setAmount(""); setDueDay(""); setNextDueDate("");
  };

  const doMarkPaid = async () => {
    if (!payBill || !payAmount) return;
    await markPaid.mutateAsync({
      billId: payBill.id,
      amount: Number(payAmount),
      paidDate: payDate,
      createTransaction: true,
    });
    utils.bills.list.invalidate();
    utils.transactions.list.invalidate();
    utils.dashboard.summary.invalidate();
    toast.success(`${payBill.name} ödendi olarak işaretlendi ve gider kaydedildi`);
    setPayBill(null);
    setPayAmount("");
  };

  return (
    <div>
      <PageHeader
        title="Faturalar"
        description="Elektrik, su, doğalgaz, internet… Vade günlerini takip edin, ödendi işaretleyin; ödeme otomatik olarak gider işlemlerine işlenir."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Fatura
          </Button>
        }
      />

      <Badge variant="outline" className="mb-4 bg-accent border-accent text-accent-foreground px-3 py-1.5 text-sm">
        Aylık düzenli fatura toplamı: <strong className="ml-1">{formatTL(monthlyTotal)}</strong>
      </Badge>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bills.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardContent className="py-14 text-center">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Henüz fatura kaydı yok. "Yeni Fatura" ile ilk faturanızı ekleyin.</p>
            </CardContent>
          </Card>
        )}
        {bills.map(b => {
          const days = b.nextDueDate ? daysUntil(b.nextDueDate) : null;
          const paidThisPeriod = b.payments.length > 0;
          return (
            <Card key={b.id} className="shadow-sm">
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.provider ?? "—"} · {BILL_PERIOD_LABELS[b.period]}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm(`"${b.name}" faturası silinsin mi?`)) {
                          remove.mutate({ id: b.id }, { onSuccess: () => utils.bills.list.invalidate() });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{formatTL(b.amount)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${dueUrgencyClass(b.nextDueDate)}`}>
                    {b.nextDueDate ? `Vade: ${formatDateShort(b.nextDueDate)} (${days! < 0 ? `${-days!} gün gecikti` : `${days!} gün kaldı`})` : "Vade atanmadı"}
                  </span>
                  {!b.isActive ? <Badge variant="secondary">Pasif</Badge> : null}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">{b.payments.length} ödeme kaydı</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPayBill(b);
                      setPayAmount(String(b.amount));
                      setPayDate(todayISO());
                    }}
                  >
                    <Banknote className="h-3.5 w-3.5 mr-1" /> Ödendi
                  </Button>
                </div>
                {b.note && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{b.note}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Yeni fatura */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Yeni Fatura</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Fatura Adı</FieldLabel>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Elektrik" />
              </Field>
              <Field>
                <FieldLabel>Kurum</FieldLabel>
                <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="CK Boğaziçi" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tutar (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Periyot</FieldLabel>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BILL_PERIOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Vade Günü (1-31)</FieldLabel>
                <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Sonraki Vade</FieldLabel>
                <Input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!name.trim() || !amount}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme al */}
      <Dialog open={!!payBill} onOpenChange={v => !v && setPayBill(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Ödeme Kaydı — {payBill?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tutar (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Ödeme Tarihi</FieldLabel>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Ödeme gider işlemi olarak kaydedilir ve vade tarihi bir sonraki döneme ilerletilir.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayBill(null)}>Vazgeç</Button>
            <Button onClick={doMarkPaid} disabled={!payAmount}>Ödemeyi Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
