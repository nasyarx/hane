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
import { FEE_PERIOD_LABELS, WEEK_DAYS, formatTL, formatDateShort, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CalendarCheck, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CourseRow {
  id: number;
  person: string;
  courseName: string;
  institution: string | null;
  instructor: string | null;
  days: string;
  time: string | null;
  feeAmount: number;
  feePeriod: string;
  startDate: string | null;
  endDate: string | null;
  isActive: number;
  note: string | null;
  payments: { id: number; amount: number; paidDate: string; periodLabel: string | null }[];
  paidTotal: number;
}

export default function Courses() {
  const list = trpc.courses.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.courses.create.useMutation();
  const update = trpc.courses.update.useMutation();
  const remove = trpc.courses.delete.useMutation();
  const pay = trpc.courses.pay.useMutation();
  const deletePayment = trpc.courses.deletePayment.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<CourseRow | null>(null);
  const [person, setPerson] = useState("");
  const [courseName, setCourseName] = useState("");
  const [institution, setInstitution] = useState("");
  const [instructor, setInstructor] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feePeriod, setFeePeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const [payCourse, setPayCourse] = useState<CourseRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [periodLabel, setPeriodLabel] = useState("");

  const rows = (list.data ?? []) as CourseRow[];
  const active = rows.filter(r => r.isActive);
  const monthlyLoad = active.filter(r => r.feePeriod === "monthly").reduce((s, r) => s + r.feeAmount, 0);

  const refresh = () => {
    utils.courses.list.invalidate();
    utils.transactions.list.invalidate();
    utils.dashboard.summary.invalidate();
  };

  const openNew = () => {
    setEdit(null);
    setPerson(""); setCourseName(""); setInstitution(""); setInstructor("");
    setDays([]); setTime(""); setFeeAmount(""); setFeePeriod("monthly");
    setStartDate(""); setEndDate(""); setNote("");
    setFormOpen(true);
  };
  const openEdit = (c: CourseRow) => {
    setEdit(c);
    setPerson(c.person); setCourseName(c.courseName); setInstitution(c.institution ?? "");
    setInstructor(c.instructor ?? ""); setDays(c.days ? c.days.split(",").map(s => s.trim()).filter(Boolean) : []);
    setTime(c.time ?? ""); setFeeAmount(String(c.feeAmount)); setFeePeriod(c.feePeriod);
    setStartDate(c.startDate ?? ""); setEndDate(c.endDate ?? ""); setNote(c.note ?? "");
    setFormOpen(true);
  };

  const toggleDay = (d: string) => {
    setDays(cur => (cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]));
  };

  const submit = async () => {
    if (!person.trim() || !courseName.trim()) return;
    const payload = {
      person: person.trim(),
      courseName: courseName.trim(),
      institution: institution.trim() || undefined,
      instructor: instructor.trim() || undefined,
      days: days.join(", "),
      time: time.trim() || undefined,
      feeAmount: Number(feeAmount) || 0,
      feePeriod: feePeriod as "monthly" | "per_lesson" | "per_term",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      note: note.trim() || undefined,
    };
    if (edit) {
      await update.mutateAsync({ id: edit.id, ...payload });
      toast.success("Kurs güncellendi");
    } else {
      await create.mutateAsync(payload);
      toast.success("Kurs kaydedildi");
    }
    refresh();
    setFormOpen(false);
  };

  const doPay = async () => {
    if (!payCourse || !payAmount) return;
    await pay.mutateAsync({
      courseId: payCourse.id,
      amount: Number(payAmount),
      paidDate: payDate,
      periodLabel: periodLabel.trim() || undefined,
      createTransaction: true,
    });
    refresh();
    toast.success("Kurs ücreti ödendi ve gider olarak kaydedildi");
    setPayCourse(null);
    setPayAmount(""); setPeriodLabel("");
  };

  return (
    <div>
      <PageHeader
        title="Kurslar"
        description="Kendiniz ve çocuklarınız için kurs kayıtları — günler, ücretler ve ödeme takibi."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Kurs
          </Button>
        }
      />

      <Badge variant="outline" className="mb-4 bg-accent border-accent text-accent-foreground px-3 py-1.5 text-sm">
        Aktif {active.length} kurs · Aylık ücret yükü: <strong className="ml-1">{formatTL(monthlyLoad)}</strong>
      </Badge>

      {/* Haftalık ders programı */}
      {active.length > 0 && (
        <Card className="shadow-sm mb-6">
          <CardContent className="pt-0">
            <p className="text-sm font-semibold font-display text-lg mb-3 pt-1">Haftalık Program</p>
            <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {WEEK_DAYS.map(d => {
                const dayCourses = active.filter(c => c.days.includes(d));
                return (
                  <div key={d} className="rounded-xl border p-3 min-h-20">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{d}</p>
                    {dayCourses.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50">—</p>
                    ) : (
                      <div className="space-y-1.5">
                        {dayCourses.map(c => (
                          <div key={c.id} className="rounded-lg bg-accent/60 px-2 py-1.5">
                            <p className="text-xs font-medium truncate">{c.courseName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{c.person}{c.time ? ` · ${c.time}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardContent className="py-14 text-center">
              <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-3">Henüz kurs kaydı yok.</p>
            </CardContent>
          </Card>
        )}
        {rows.map(c => (
          <Card key={c.id} className={`shadow-sm ${!c.isActive ? "opacity-60" : ""}`}>
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.courseName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.person}{c.institution ? ` · ${c.institution}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Aktif" : "Bitti"}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(`"${c.courseName} (${c.person})" silinsin mi?`)) {
                        remove.mutate({ id: c.id }, { onSuccess: refresh });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {c.days.split(",").filter(Boolean).map(d => (
                  <span key={d} className="rounded-md bg-accent/70 px-2 py-0.5 text-[11px] font-medium">{d.trim()}</span>
                ))}
                {c.time && <span className="text-xs text-muted-foreground">{c.time}</span>}
              </div>

              <p className="font-display text-xl font-semibold mt-3 tabular-nums">
                {formatTL(c.feeAmount)}
                <span className="text-xs font-normal text-muted-foreground"> · {FEE_PERIOD_LABELS[c.feePeriod]}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ödenen toplam: {formatTL(c.paidTotal)} ({c.payments.length} ödeme)
              </p>

              <div className="flex gap-1.5 mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    setPayCourse(c);
                    setPayAmount(String(c.feeAmount));
                    setPayDate(todayISO());
                    const now = new Date();
                    setPeriodLabel(now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }));
                  }}
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1" /> Ücret Öde
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Düzenle</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update.mutate({ id: c.id, isActive: c.isActive ? 0 : 1 }, { onSuccess: refresh })}
                >
                  {c.isActive ? "Bitir" : "Yeniden Aç"}
                </Button>
              </div>

              {c.payments.length > 0 && (
                <div className="mt-3 space-y-1 border-t pt-2.5">
                  {c.payments.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {formatDateShort(p.paidDate)}{p.periodLabel ? ` · ${p.periodLabel}` : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium tabular-nums">{formatTL(p.amount)}</span>
                        <button className="text-muted-foreground hover:text-destructive" onClick={() => deletePayment.mutate({ id: p.id }, { onSuccess: refresh })}>
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

      {/* Kurs formu */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{edit ? "Kursu Düzenle" : "Yeni Kurs"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Kim (Kişi)</FieldLabel>
                <Input value={person} onChange={e => setPerson(e.target.value)} placeholder="Zeynep" />
              </Field>
              <Field>
                <FieldLabel>Kurs Adı</FieldLabel>
                <Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Piyano / İngilizce" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Kurum</FieldLabel>
                <Input value={institution} onChange={e => setInstitution(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Eğitmen</FieldLabel>
                <Input value={instructor} onChange={e => setInstructor(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Günler</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      days.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Saat</FieldLabel>
                <Input value={time} onChange={e => setTime(e.target.value)} placeholder="18:00-19:30" />
              </Field>
              <Field>
                <FieldLabel>Ücret (₺)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Ücret Dönemi</FieldLabel>
                <Select value={feePeriod} onValueChange={setFeePeriod}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FEE_PERIOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <Button onClick={submit} disabled={!person.trim() || !courseName.trim()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ücret ödeme */}
      <Dialog open={!!payCourse} onOpenChange={v => !v && setPayCourse(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Ücret Ödemesi — {payCourse?.courseName}</DialogTitle>
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
            <Field>
              <FieldLabel>Dönem Etiketi</FieldLabel>
              <Input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="Kasım 2026" />
            </Field>
            <p className="text-xs text-muted-foreground">Ödeme gider işlemi olarak kaydedilir.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayCourse(null)}>Vazgeç</Button>
            <Button onClick={doPay} disabled={!payAmount}>Ödemeyi Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
