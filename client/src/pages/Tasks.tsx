import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABELS, REPEAT_LABELS, formatDateShort } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { BellRing, CheckCircle2, ListChecks, Plus, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  kind: string;
  repeat: string;
  priority: string;
  dueDate: Date | string | null;
  completed: number;
}

export default function Tasks() {
  const list = trpc.tasks.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.tasks.create.useMutation();
  const complete = trpc.tasks.complete.useMutation();
  const reopen = trpc.tasks.reopen.useMutation();
  const remove = trpc.tasks.delete.useMutation();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("task");
  const [repeat, setRepeat] = useState("none");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "overdue">("all");

  const tasks = (list.data ?? []) as TaskRow[];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const filtered = tasks.filter(t => {
    if (t.completed && !showCompleted) return false;
    if (!t.completed && filter !== "all") {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      if (filter === "overdue") {
        if (!due || due >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return false;
      } else if (filter === "today") {
        if (!due || due.toISOString().slice(0, 10) !== todayStr) return false;
      } else if (filter === "week") {
        if (!due || due > weekEnd) return false;
      }
    }
    return true;
  });
  const openCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.length - openCount;

  const refresh = () => {
    utils.tasks.list.invalidate();
    utils.tasks.upcoming.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const submit = async () => {
    if (!title.trim()) return;
    const ms = dueDate ? new Date(`${dueDate}T${dueTime || "12:00"}:00`).getTime() : undefined;
    await create.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      kind: kind as "task" | "reminder",
      repeat: repeat as "none" | "daily" | "weekly" | "monthly" | "yearly",
      priority: priority as "low" | "normal" | "high",
      dueDate: ms ?? null,
    });
    refresh();
    toast.success(repeat !== "none" ? "Görev eklendi — her tekrarında yeni vade otomatik oluşur" : "Görev eklendi");
    setOpen(false);
    setTitle(""); setDescription(""); setDueDate(""); setDueTime(""); setRepeat("none"); setPriority("normal");
  };

  const onToggle = (t: TaskRow) => {
    if (t.completed) {
      reopen.mutate({ id: t.id }, { onSuccess: refresh });
    } else {
      complete.mutate(
        { id: t.id },
        {
          onSuccess: () => {
            refresh();
            if (t.repeat !== "none") toast.success(`Tamamlandı ✓ — sonraki ${REPEAT_LABELS[t.repeat]?.toLowerCase()} vade oluşturuldu`);
            else toast.success("Tamamlandı ✓");
          },
        }
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Görevler & Hatırlatmalar"
        description="Günlük, haftalık ve aylık yapılacaklar — tekrarlı görevler tamamlandığında yeni vade otomatik oluşur."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Görev
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="outline" className="bg-accent border-accent text-accent-foreground px-3 py-1.5 text-sm">
          Açık: <strong className="ml-1">{openCount}</strong>
        </Badge>
        <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-800 px-3 py-1.5 text-sm">
          Tamamlanan: <strong className="ml-1">{doneCount}</strong>
        </Badge>
        <div className="flex-1" />
        {(["all", "overdue", "today", "week"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Tümü" : f === "overdue" ? "Geciken" : f === "today" ? "Bugün" : "Bu Hafta"}
          </Button>
        ))}
        <Button size="sm" variant={showCompleted ? "default" : "outline"} onClick={() => setShowCompleted(v => !v)}>
          Bitenleri Göster
        </Button>
      </div>

      <div className="grid gap-2.5 max-w-3xl">
        {filtered.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="py-14 text-center">
              <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Bu filtrede görev yok.</p>
            </CardContent>
          </Card>
        )}
        {filtered.map(t => {
          const due = t.dueDate ? new Date(t.dueDate) : null;
          const overdue = !t.completed && due && due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition-opacity ${t.completed ? "opacity-55" : ""} ${overdue ? "border-destructive/40" : ""}`}
            >
              <Checkbox
                checked={!!t.completed}
                onCheckedChange={() => onToggle(t)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                  {t.kind === "reminder" && (
                    <BellRing className="inline h-3.5 w-3.5 ml-1.5 text-amber-600" />
                  )}
                </p>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {due && (
                    <span className={`text-xs ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      📅 {formatDateShort(due)}
                      {overdue && " · gecikti"}
                    </span>
                  )}
                  {t.repeat !== "none" && (
                    <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">
                      <Repeat className="h-3 w-3" /> {REPEAT_LABELS[t.repeat]}
                    </span>
                  )}
                  {t.priority === "high" && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Önemli</Badge>
                  )}
                  {t.priority === "low" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Düşük</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                {!t.completed && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-700" onClick={() => onToggle(t)} title="Tamamla">
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    if (confirm(`"${t.title}" silinsin mi?`)) remove.mutate({ id: t.id }, { onSuccess: refresh });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Yeni görev */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Yeni Görev / Hatırlatma</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <Field>
              <FieldLabel>Başlık</FieldLabel>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Elektrik faturasını öde" />
            </Field>
            <Field>
              <FieldLabel>Açıklama</FieldLabel>
              <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Tür</FieldLabel>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Görev</SelectItem>
                    <SelectItem value="reminder">Hatırlatma</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Önem</FieldLabel>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Tarih</FieldLabel>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Saat</FieldLabel>
                <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Tekrar</FieldLabel>
                <Select value={repeat} onValueChange={setRepeat}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPEAT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={!title.trim()}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
