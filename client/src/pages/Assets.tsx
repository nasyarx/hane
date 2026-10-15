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
import { ASSET_KIND_LABELS, formatTL, formatDateShort } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Gem, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";

interface AssetRow {
  id: number;
  kind: string;
  name: string;
  quantity: number;
  unit: string;
  purchaseValue: number;
  currentValue: number;
  purchaseDate: string | null;
  location: string | null;
  note: string | null;
}

const KIND_COLORS: Record<string, string> = {
  doviz: "#0f766e",
  altin: "#e8b34b",
  tasinmaz: "#c4622d",
  tasinir: "#3d8f87",
  nakit: "#1f5f5a",
  diger: "#8a6d3b",
};

export default function Assets() {
  const list = trpc.assets.list.useQuery();
  const summary = trpc.assets.summary.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.assets.create.useMutation();
  const update = trpc.assets.update.useMutation();
  const remove = trpc.assets.delete.useMutation();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AssetRow | null>(null);
  const [kind, setKind] = useState("doviz");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("TL");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  const rows = (list.data ?? []) as AssetRow[];

  const openNew = () => {
    setEdit(null);
    setKind("doviz"); setName(""); setQuantity("1"); setUnit("TL");
    setPurchaseValue(""); setCurrentValue(""); setPurchaseDate(""); setLocation(""); setNote("");
    setOpen(true);
  };
  const openEdit = (a: AssetRow) => {
    setEdit(a);
    setKind(a.kind); setName(a.name); setQuantity(String(a.quantity)); setUnit(a.unit);
    setPurchaseValue(String(a.purchaseValue)); setCurrentValue(String(a.currentValue));
    setPurchaseDate(a.purchaseDate ?? ""); setLocation(a.location ?? ""); setNote(a.note ?? "");
    setOpen(true);
  };

  const refresh = () => {
    utils.assets.list.invalidate();
    utils.assets.summary.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const submit = async () => {
    if (!name.trim()) return;
    const payload = {
      kind: kind as "doviz" | "altin" | "tasinmaz" | "tasinir" | "nakit" | "diger",
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit: unit.trim() || "TL",
      purchaseValue: Number(purchaseValue) || 0,
      currentValue: Number(currentValue) || 0,
      purchaseDate: purchaseDate || undefined,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
    };
    if (edit) {
      await update.mutateAsync({ id: edit.id, ...payload });
      toast.success("Varlık güncellendi");
    } else {
      await create.mutateAsync(payload);
      toast.success("Varlık eklendi");
    }
    refresh();
    setOpen(false);
  };

  const gain = (summary.data?.totalGain ?? 0);

  return (
    <div>
      <PageHeader
        title="Birikim & Varlıklar"
        description="Döviz, altın, taşınmaz, taşınır ve nakit birikimleriniz — güncel değerleriyle toplam servet görünümü."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Varlık
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">
              <Gem className="h-3.5 w-3.5" /> Toplam Güncel Değer
            </div>
            <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{formatTL(summary.data?.totalCurrent)}</p>
            <p className="text-xs text-muted-foreground mt-1">Alış maliyeti: {formatTL(summary.data?.totalPurchase)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${gain >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {gain >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} Değer Değişimi
            </div>
            <p className={`font-display text-2xl font-semibold mt-3 tabular-nums ${gain >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {gain >= 0 ? "+" : ""}{formatTL(gain)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">Tür Bazlı Dağılım</p>
            {(summary.data?.byKind.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Veri yok</p>
            ) : (
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.data!.byKind} dataKey="current" nameKey="kind" innerRadius={28} outerRadius={52} paddingAngle={2}>
                      {summary.data!.byKind.map(k => (
                        <Cell key={k.kind} fill={KIND_COLORS[k.kind] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v: number | string) => formatTL(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardContent className="py-14 text-center">
              <Gem className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Henüz varlık kaydı yok. Döviz, altın, ev veya eşyalarınızı ekleyin.</p>
            </CardContent>
          </Card>
        )}
        {rows.map(a => {
          const diff = a.currentValue - a.purchaseValue;
          return (
            <Card key={a.id} className="shadow-sm">
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline" className="mb-1.5" style={{ borderColor: KIND_COLORS[a.kind], color: KIND_COLORS[a.kind] }}>
                      {ASSET_KIND_LABELS[a.kind]}
                    </Badge>
                    <p className="font-semibold truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.quantity} {a.unit}{a.location ? ` · ${a.location}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm(`"${a.name}" silinsin mi?`)) remove.mutate({ id: a.id }, { onSuccess: refresh });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{formatTL(a.currentValue)}</p>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-muted-foreground">Alış: {formatTL(a.purchaseValue)}</span>
                  <span className={diff >= 0 ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                    {diff >= 0 ? "+" : ""}{formatTL(diff)}
                  </span>
                </div>
                {a.purchaseDate && <p className="text-xs text-muted-foreground mt-2">Alım: {formatDateShort(a.purchaseDate)}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{edit ? "Varlığı Düzenle" : "Yeni Varlık"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tür</FieldLabel>
                <Select value={kind} onValueChange={v => { setKind(v); setUnit(v === "altin" ? "gram" : v === "doviz" ? "USD" : "TL"); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_KIND_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Ad</FieldLabel>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Çeyrek altın / Dolar / Daire" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Miktar</FieldLabel>
                <Input type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Birim</FieldLabel>
                <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="gram / adet / USD" />
              </Field>
              <Field>
                <FieldLabel>Alım Tarihi</FieldLabel>
                <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Alış Değeri (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={purchaseValue} onChange={e => setPurchaseValue(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Güncel Değer (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Konum</FieldLabel>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Kasa / Banka / Ev" />
              </Field>
              <Field>
                <FieldLabel>Not</FieldLabel>
                <Input value={note} onChange={e => setNote(e.target.value)} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!name.trim()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
