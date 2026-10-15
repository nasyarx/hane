import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRESET_COLORS = ["#0f766e", "#e8b34b", "#c4622d", "#3d8f87", "#8a6d3b", "#1f5f5a", "#d98e4a", "#5f8575", "#7c5cbf", "#b0455c"];

export default function Definitions() {
  return (
    <div>
      <PageHeader
        title="Tanımlar"
        description="Gelir-gider kategorileri ve aile üyeleri — tüm kayıtlar bu tanımları kullanır."
      />
      <Tabs defaultValue="categories">
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="members">Aile Üyeleri</TabsTrigger>
        </TabsList>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="members"><MembersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesTab() {
  const categories = trpc.meta.categories.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.meta.categories.create.useMutation({
    onSuccess: () => {
      utils.meta.categories.list.invalidate();
      toast.success("Kategori eklendi");
      setOpen(false);
    },
  });
  const remove = trpc.meta.categories.delete.useMutation({
    onSuccess: () => {
      utils.meta.categories.list.invalidate();
      toast.success("Kategori silindi");
    },
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const grouped = {
    expense: (categories.data ?? []).filter(c => c.type === "expense"),
    income: (categories.data ?? []).filter(c => c.type === "income"),
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {(["expense", "income"] as const).map(t => (
          <Card key={t} className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="font-display text-lg">{t === "expense" ? "Gider Kategorileri" : "Gelir Kategorileri"}</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setType(t);
                  setColor(PRESET_COLORS[0]);
                  setName("");
                  setOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Ekle
              </Button>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {grouped[t].length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Henüz kategori yok.</p>
              )}
              {grouped[t].map(c => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm group"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  {c.name}
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => {
                      if (confirm(`"${c.name}" kategorisi silinsin mi?`)) remove.mutate({ id: c.id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Yeni Kategori</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field>
              <FieldLabel>Ad</FieldLabel>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={type === "expense" ? "Market" : "Maaş"} />
            </Field>
            <Field>
              <FieldLabel>Tür</FieldLabel>
              <Select value={type} onValueChange={v => setType(v as "expense" | "income")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gider</SelectItem>
                  <SelectItem value="income">Gelir</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Renk</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate({ name: name.trim(), type, color })}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MembersTab() {
  const members = trpc.meta.members.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.meta.members.create.useMutation({
    onSuccess: () => {
      utils.meta.members.list.invalidate();
      toast.success("Aile üyesi eklendi");
      setName("");
      setRelation("birey");
    },
  });
  const remove = trpc.meta.members.delete.useMutation({
    onSuccess: () => {
      utils.meta.members.list.invalidate();
      toast.success("Silindi");
    },
  });
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("birey");

  return (
    <Card className="shadow-sm max-w-xl">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">Aile Üyeleri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ad (örn. Elif)" className="flex-1" />
          <Select value={relation} onValueChange={setRelation}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["birey", "anne", "baba", "çocuk", "büyükanne", "dede"].map(r => (
                <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!name.trim()}
            onClick={() => create.mutate({ name: name.trim(), relation })}
          >
            <Plus className="h-4 w-4 mr-1" /> Ekle
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(members.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Henüz aile üyesi eklenmedi.</p>
          )}
          {(members.data ?? []).map(m => (
            <span key={m.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
              {m.name}
              <span className="text-xs text-muted-foreground">({m.relation})</span>
              <button
                className="text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => {
                  if (confirm(`"${m.name}" silinsin mi?`)) remove.mutate({ id: m.id });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
