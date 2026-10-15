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
import { INSURANCE_KIND_LABELS, daysUntil, dueUrgencyClass, formatTL, formatDateShort } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InsuranceRow {
  id: number;
  kind: string;
  holder: string | null;
  provider: string | null;
  policyNo: string | null;
  amount: number | null;
  startDate: string | null;
  endDate: string | null;
  reminderDays: number;
  isActive: number;
  note: string | null;
}

export default function Insurances() {
  const list = trpc.insurances.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.insurances.create.useMutation();
  const update = trpc.insurances.update.useMutation();
  const remove = trpc.insurances.delete.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState("sigorta");
  const [holder, setHolder] = useState("");
  const [provider, setProvider] = useState("");
  const [policyNo, setPolicyNo] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const rows = (list.data ?? []) as InsuranceRow[];
  const now = new Date();
  const expiring = rows.filter(r => {
    if (!r.endDate || !r.isActive) return false;
    const d = new Date(r.endDate + "T12:00:00");
    const remindFrom = new Date(d);
    remindFrom.setDate(remindFrom.getDate() - r.reminderDays);
    return remindFrom <= now && d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const refresh = () => {
    utils.insurances.list.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const submit = async () => {
    if (!holder.trim()) return;
    await create.mutateAsync({
      kind: kind as "sigorta" | "kasko" | "muayene" | "diger",
      holder: holder.trim(),
      provider: provider.trim() || undefined,
      policyNo: policyNo.trim() || undefined,
      amount: amount ? Number(amount) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      note: note.trim() || undefined,
    });
    refresh();
    toast.success("Kayıt eklendi");
    setFormOpen(false);
    setHolder(""); setProvider(""); setPolicyNo(""); setAmount(""); setStartDate(""); setEndDate(""); setNote("");
  };

  const renew = async (r: InsuranceRow) => {
    // 1 yıl uzat
    const cur = r.endDate ? new Date(r.endDate + "T12:00:00") : new Date();
    const next = new Date(cur);
    next.setFullYear(next.getFullYear() + 1);
    await update.mutateAsync({ id: r.id, startDate: cur.toISOString().slice(0, 10), endDate: next.toISOString().slice(0, 10) });
    refresh();
    toast.success("Yenileme kaydedildi (1 yıl uzatıldı)");
  };

  return (
    <div>
      <PageHeader
        title="Sigorta & Araç"
        description="Sigortalar, kaskolar ve araç muayeneleri — bitiş yaklaştığında bu sayfa sizi uyarır."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Kayıt
          </Button>
        }
      />

      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 mb-4 text-sm text-amber-900">
          ⚠️ Yaklaşan yenilemeler: {expiring.map(r => `${INSURANCE_KIND_LABELS[r.kind]} — ${r.holder ?? ""} (${formatDateShort(r.endDate)})`).join(" · ")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardContent className="py-14 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Henüz sigorta/kasko/muayene kaydı yok.</p>
            </CardContent>
          </Card>
        )}
        {rows.map(r => {
          const days = r.endDate ? daysUntil(r.endDate) : null;
          const kindBadge =
            r.kind === "muayene" ? "bg-teal-50 text-teal-800 border-teal-200"
            : r.kind === "kasko" ? "bg-indigo-50 text-indigo-800 border-indigo-200"
            : "bg-accent text-accent-foreground border-accent";
          return (
            <Card key={r.id} className={`shadow-sm ${!r.isActive ? "opacity-60" : ""}`}>
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline" className={`mb-1.5 ${kindBadge}`}>{INSURANCE_KIND_LABELS[r.kind]}</Badge>
                    <p className="font-semibold truncate">{r.holder ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.provider ?? ""}{r.policyNo ? ` · Poliçe: ${r.policyNo}` : ""}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => {
                      if (confirm("Bu kayıt silinsin mi?")) {
                        remove.mutate({ id: r.id }, { onSuccess: refresh });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {r.amount ? (
                  <p className="font-display text-xl font-semibold mt-3 tabular-nums">{formatTL(r.amount)}</p>
                ) : null}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-muted-foreground">
                    {r.startDate ? `${formatDateShort(r.startDate)} →` : ""} {r.endDate ? formatDateShort(r.endDate) : "Bitiş yok"}
                  </span>
                  {r.endDate && (
                    <span className={dueUrgencyClass(r.endDate)}>
                      {days! < 0 ? `${-days!} gün geçti` : `${days!} gün kaldı`}
                    </span>
                  )}
                </div>

                {r.endDate && (
                  <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => renew(r)}>
                    Yenile (1 yıl uzat)
                  </Button>
                )}
                {r.note && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{r.note}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Yeni kayıt */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Yeni Sigorta / Kasko / Muayene</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tür</FieldLabel>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSURANCE_KIND_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Plaka / Kişi</FieldLabel>
                <Input value={holder} onChange={e => setHolder(e.target.value)} placeholder="34 ABC 123" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Kurum</FieldLabel>
                <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="Anadolu Sigorta" />
              </Field>
              <Field>
                <FieldLabel>Poliçe No</FieldLabel>
                <Input value={policyNo} onChange={e => setPolicyNo(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Ücret (₺)</FieldLabel>
                <Input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Başlangıç</FieldLabel>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Bitiş</FieldLabel>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Not</FieldLabel>
              <Input value={note} onChange={e => setNote(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!holder.trim()}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
