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
import { Progress } from "@/components/ui/progress";
import { DEBT_KIND_LABELS, dueUrgencyClass, daysUntil, formatTL, formatDateShort, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { HandCoins, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DebtRow {
  id: number;
  kind: string;
  counterparty: string;
  description: string | null;
  totalAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  isSettled: number;
  payments: { id: number; amount: number; paidDate: string; note: string | null }[];
}

export default function Debts() {
  const list = trpc.debts.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.debts.create.useMutation();
  const remove = trpc.debts.delete.useMutation();
  const pay = trpc.debts.pay.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<"debt" | "receivable">("debt");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [payDebt, setPayDebt] = useState<DebtRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());

  const debts = (list.data ?? []) as DebtRow[];
  const myDebt = debts.filter(d => d.kind === "debt" && !d.isSettled).reduce((s, d) => s + d.remainingAmount, 0);
  const receivable = debts.filter(d => d.kind === "receivable" && !d.isSettled).reduce((s, d) => s + d.remainingAmount, 0);

  const refresh = () => {
    utils.debts.list.invalidate();
    utils.transactions.list.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const submit = async () => {
    if (!counterparty.trim() || !totalAmount) return;
    await create.mutateAsync({
      kind,
      counterparty: counterparty.trim(),
      description: description.trim() || undefined,
      totalAmount: Number(totalAmount),
      dueDate: dueDate || undefined,
    });
    refresh();
    toast.success("Kayıt eklendi");
    setFormOpen(false);
    setCounterparty(""); setDescription(""); setTotalAmount(""); setDueDate("");
  };

  const doPay = async () => {
    if (!payDebt || !payAmount) return;
    const res = await pay.mutateAsync({
      debtId: payDebt.id,
      amount: Number(payAmount),
      paidDate: payDate,
      createTransaction: true,
    });
    refresh();
    toast.success(res.isSettled ? "Kayıt tamamen kapandı 🎉" : "Ödeme kaydedildi");
    setPayDebt(null);
    setPayAmount("");
  };

  return (
    <div>
      <PageHeader
        title="Borç & Alacak"
        description="Kimden ne aldık, kime ne verdik — ödemeler ilerledikçe kalan tutarlar otomatik güncellenir."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Kayıt
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 px-3 py-1.5 text-sm">
          Toplam borcumuz: <strong className="ml-1">{formatTL(myDebt)}</strong>
        </Badge>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 px-3 py-1.5 text-sm">
          Toplam alacağımız: <strong className="ml-1">{formatTL(receivable)}</strong>
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {debts.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardContent className="py-14 text-center">
              <HandCoins className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Henüz borç veya alacak kaydı yok.</p>
            </CardContent>
          </Card>
        )}
        {debts.map(d => {
          const paidPct = d.totalAmount > 0 ? Math.round(((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100) : 0;
          return (
            <Card key={d.id} className={`shadow-sm ${d.isSettled ? "opacity-60" : ""}`}>
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{d.counterparty}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.description ?? "—"}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${d.kind === "debt" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}
                  >
                    {DEBT_KIND_LABELS[d.kind]}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2 mt-3">
                  <span className="font-display text-2xl font-semibold tabular-nums">{formatTL(d.remainingAmount)}</span>
                  <span className="text-xs text-muted-foreground">/ {formatTL(d.totalAmount)}</span>
                </div>
                <Progress value={paidPct} className="mt-2 h-2" />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">%{paidPct} ödendi</span>
                  <span className={`text-xs ${dueUrgencyClass(d.dueDate)}`}>
                    {d.dueDate ? `Vade: ${formatDateShort(d.dueDate)}` : "Vade yok"}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    {d.isSettled ? "Kapandı ✓" : `${d.payments.length} ödeme`}
                  </span>
                  <div className="flex gap-1">
                    {!d.isSettled && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPayDebt(d);
                          setPayAmount(String(d.remainingAmount));
                          setPayDate(todayISO());
                        }}
                      >
                        Ödeme
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm(`"${d.counterparty}" kaydı silinsin mi?`)) {
                          remove.mutate({ id: d.id }, { onSuccess: refresh });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Yeni kayıt */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Yeni Borç / Alacak</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <Field>
              <FieldLabel>Tür</FieldLabel>
              <Select value={kind} onValueChange={v => setKind(v as "debt" | "receivable")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debt">Borcumuz (biz ödeyeceğiz)</SelectItem>
                  <SelectItem value="receivable">Alacağımız (bize ödenecek)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Kişi / Kurum</FieldLabel>
                <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Ahmet Abi" />
              </Field>
              <Field>
                <FieldLabel>Tutar (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Açıklama</FieldLabel>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ev tadilatı" />
              </Field>
              <Field>
                <FieldLabel>Vade Tarihi</FieldLabel>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!counterparty.trim() || !totalAmount}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme */}
      <Dialog open={!!payDebt} onOpenChange={v => !v && setPayDebt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {payDebt?.kind === "debt" ? "Borç Ödemesi" : "Alacak Tahsilatı"} — {payDebt?.counterparty}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tutar (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Tarih</FieldLabel>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {payDebt?.kind === "debt"
                ? "Ödeme gider işlemi olarak kaydedilir."
                : "Tahsilat gelir işlemi olarak kaydedilir."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDebt(null)}>Vazgeç</Button>
            <Button onClick={doPay} disabled={!payAmount}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
