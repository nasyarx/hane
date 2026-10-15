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
import { PROMO_DIRECTION_LABELS, PROMO_KIND_LABELS, formatTL, formatDateShort, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromoRow {
  id: number;
  bank: string;
  direction: string;
  kind: string;
  amount: number;
  date: string;
  description: string | null;
}

export default function Promotions() {
  const list = trpc.promotions.list.useQuery();
  const totals = trpc.promotions.totals.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.promotions.create.useMutation();
  const remove = trpc.promotions.delete.useMutation();

  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState("");
  const [direction, setDirection] = useState("in");
  const [kind, setKind] = useState("maas_promosyonu");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");

  const rows = (list.data ?? []) as PromoRow[];
  const bankTotals = new Map<string, number>();
  for (const r of rows) {
    bankTotals.set(r.bank, (bankTotals.get(r.bank) ?? 0) + (r.direction === "in" ? r.amount : -r.amount));
  }

  const refresh = () => {
    utils.promotions.list.invalidate();
    utils.promotions.totals.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const submit = async () => {
    if (!bank.trim() || !amount) return;
    await create.mutateAsync({
      bank: bank.trim(),
      direction: direction as "in" | "out",
      kind: kind as "maas_promosyonu" | "odul_puan" | "komisyon" | "diger",
      amount: Number(amount),
      date,
      description: description.trim() || undefined,
    });
    refresh();
    toast.success("Promosyon kaydedildi");
    setOpen(false);
    setBank(""); setAmount(""); setDescription("");
  };

  return (
    <div>
      <PageHeader
        title="Banka Promosyonları"
        description="Maaş promosyonları, ödül puanları ve banka masrafları — gelen ve giden ayrımıyla."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Kayıt
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <ArrowDownLeft className="h-3.5 w-3.5" /> Gelen
            </div>
            <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{formatTL(totals.data?.incoming)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800">
              <ArrowUpRight className="h-3.5 w-3.5" /> Giden
            </div>
            <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{formatTL(totals.data?.outgoing)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">
              <Landmark className="h-3.5 w-3.5" /> Net
            </div>
            <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{formatTL(totals.data?.net)}</p>
          </CardContent>
        </Card>
      </div>

      {bankTotals.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from(bankTotals.entries()).map(([b, v]) => (
            <Badge key={b} variant="outline" className="bg-card px-3 py-1.5 text-sm">
              {b}: <strong className={`ml-1 ${v >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatTL(v)}</strong>
            </Badge>
          ))}
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="pt-0 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Henüz promosyon kaydı yok.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-3 pr-3 font-medium">Tarih</th>
                  <th className="py-3 pr-3 font-medium">Banka</th>
                  <th className="py-3 pr-3 font-medium">Tür</th>
                  <th className="py-3 pr-3 font-medium">Yön</th>
                  <th className="py-3 pr-3 font-medium">Açıklama</th>
                  <th className="py-3 pr-3 font-medium text-right">Tutar</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDateShort(r.date)}</td>
                    <td className="py-2.5 pr-3 font-medium">{r.bank}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{PROMO_KIND_LABELS[r.kind] ?? r.kind}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline" className={r.direction === "in" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}>
                        {PROMO_DIRECTION_LABELS[r.direction]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.description ?? "—"}</td>
                    <td className={`py-2.5 pr-3 text-right tabular-nums font-semibold whitespace-nowrap ${r.direction === "in" ? "text-emerald-700" : "text-rose-700"}`}>
                      {r.direction === "in" ? "+" : "−"}{formatTL(r.amount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm("Bu kayıt silinsin mi?")) remove.mutate({ id: r.id }, { onSuccess: refresh });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Yeni Promosyon Kaydı</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Banka</FieldLabel>
                <Input value={bank} onChange={e => setBank(e.target.value)} placeholder="Ziraat Bankası" />
              </Field>
              <Field>
                <FieldLabel>Yön</FieldLabel>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Gelen</SelectItem>
                    <SelectItem value="out">Giden</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Tür</FieldLabel>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROMO_KIND_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Tutar (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Tarih</FieldLabel>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Açıklama</FieldLabel>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!bank.trim() || !amount}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
