import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTL, formatDateShort, REPEAT_LABELS, dueUrgencyClass, daysUntil } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Gem,
  HeartHandshake,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import TransactionDialog from "@/components/TransactionDialog";
import { toast } from "sonner";

const PIE_COLORS = ["#0f766e", "#e8b34b", "#c4622d", "#3d8f87", "#8a6d3b", "#1f5f5a", "#d98e4a", "#5f8575"];

export default function Home() {
  const [txOpen, setTxOpen] = useState(false);
  const utils = trpc.useUtils();
  const summary = trpc.dashboard.summary.useQuery(undefined, { refetchInterval: 60000 });
  const trend = trpc.transactions.monthlyTrend.useQuery();
  const byCategory = trpc.transactions.expenseByCategory.useQuery();

  const invalidate = () => {
    utils.dashboard.summary.invalidate();
    utils.transactions.monthlyTrend.invalidate();
    utils.transactions.expenseByCategory.invalidate();
  };

  if (summary.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  const s = summary.data;

  return (
    <div>
      {/* Karşılama bandı */}
      <div className="relative overflow-hidden rounded-2xl border border-sidebar/20 bg-sidebar text-sidebar-foreground mb-6">
        <img
          src="/banner.7f3a1c.png"
          alt=""
          className="absolute inset-y-0 right-0 h-full w-auto max-w-[55%] object-cover opacity-90 hidden sm:block"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/85 to-transparent sm:via-sidebar/40 hidden sm:block" />
        <div className="relative p-6 md:p-8 sm:max-w-[60%]">
          <p className="text-xs uppercase tracking-[0.2em] text-sidebar-primary font-semibold">
            {new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-semibold mt-1">
            Ev defteriniz açık
          </h1>
          <p className="text-sm text-sidebar-foreground/70 mt-2 max-w-md">
            Bu ay {formatTL(s?.monthIncome)} gelir, {formatTL(s?.monthExpense)} gider kaydedildi.
          </p>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setTxOpen(true)} className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
              <Plus className="h-4 w-4 mr-1" /> İşlem Ekle
            </Button>
            <Link href="/gorevler">
              <Button variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                Görevler
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <SummaryCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Bu Ay Gelir"
          value={formatTL(s?.monthIncome)}
          tone="text-emerald-700 bg-emerald-100"
        />
        <SummaryCard
          icon={<ArrowDownRight className="h-4 w-4" />}
          label="Bu Ay Gider"
          value={formatTL(s?.monthExpense)}
          tone="text-rose-700 bg-rose-100"
        />
        <SummaryCard
          icon={<Banknote className="h-4 w-4" />}
          label="Ay Neti"
          value={formatTL(s?.monthNet)}
          tone={(s?.monthNet ?? 0) >= 0 ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"}
        />
        <SummaryCard
          icon={<Gem className="h-4 w-4" />}
          label="Toplam Varlık"
          value={formatTL(s?.totalAssets)}
          tone="text-teal-700 bg-teal-100"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        {/* Trend grafiği */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg">Son 6 Ay — Gelir / Gider</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend.data ?? []} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={70}
                  tickFormatter={(v: number) => `${(v / 1000).toLocaleString("tr-TR")}k ₺`} />
                <ReTooltip formatter={(v: number | string) => formatTL(Number(v))} />
                <Bar dataKey="income" name="Gelir" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Gider" fill="#e8b34b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Kategori dağılımı */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg">Bu Ayın Giderleri</CardTitle>
          </CardHeader>
          <CardContent>
            {(byCategory.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                Bu ay henüz gider kaydı yok.
              </p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory.data}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {byCategory.data!.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v: number | string) => formatTL(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 space-y-1.5 max-h-32 overflow-auto">
              {byCategory.data?.slice(0, 6).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatTL(c.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Yaklaşan faturalar */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Yaklaşan Faturalar</CardTitle>
            <Link href="/faturalar"><Button variant="ghost" size="sm">Tümü</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(s?.upcomingBills.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Önümüzdeki 7 günde vadesi gelen fatura yok. 🎉</p>
            )}
            {s?.upcomingBills.map(b => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className={`text-xs ${dueUrgencyClass(b.nextDueDate)}`}>
                    {formatDateShort(b.nextDueDate)} · {b.nextDueDate ? `${daysUntil(b.nextDueDate)} gün` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatTL(b.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Yaklaşan görevler */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Yaklaşan Görevler</CardTitle>
            <Link href="/gorevler"><Button variant="ghost" size="sm">Tümü</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(s?.upcomingTasks.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Yaklaşan görev yok. 🎉</p>
            )}
            {s?.upcomingTasks.slice(0, 6).map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
                <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="shrink-0 text-[10px]">
                  {t.priority === "high" ? "Önemli" : t.kind === "reminder" ? "Hatırlatma" : "Görev"}
                </Badge>
                <p className="text-sm truncate flex-1">{t.title}</p>
                <span className={`text-xs shrink-0 ${dueUrgencyClass(t.dueDate?.toISOString().slice(0, 10))}`}>
                  {t.dueDate ? formatDateShort(t.dueDate) : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Durum kartları */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg">Durum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow
              icon={<CalendarClock className="h-4 w-4" />}
              label="Kalan taksit yükü"
              value={formatTL(s?.remainingInstallmentTotal)}
              note={`${s?.dueInstallmentsThisMonth.length ?? 0} taksit bu ay bekliyor`}
              href="/taksitler"
            />
            <StatusRow
              icon={<Banknote className="h-4 w-4" />}
              label="Borçlarımız"
              value={formatTL(s?.totalMyDebt)}
              note={`Alacaklarımız: ${formatTL(s?.totalReceivable)}`}
              href="/borclar"
            />
            <StatusRow
              icon={<HeartHandshake className="h-4 w-4" />}
              label="Kalan zekât"
              value={formatTL(s?.zakat.remaining)}
              note={s?.zakat.record ? `${new Date().getFullYear()} yılı` : "Henüz hesaplanmadı"}
              href="/zekat"
            />
            <StatusRow
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Yaklaşan sigorta/muayene"
              value={`${s?.expiringInsurances.length ?? 0} kayıt`}
              note="Yenileme zamanı gelenler"
              href="/sigortalar"
            />
            {(s?.expiringInsurances.length ?? 0) > 0 && (
              <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                {s!.expiringInsurances.map(i => `${i.kind === "muayene" ? "Muayene" : i.kind}: ${i.holder ?? ""} (${formatDateShort(i.endDate)})`).join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        onSuccess={() => {
          invalidate();
          toast.success("İşlem kaydedildi");
        }}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-0">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
          {icon}
          {label}
        </div>
        <p className="font-display text-2xl font-semibold mt-3 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusRow({ icon, label, value, note, href }: { icon: React.ReactNode; label: string; value: string; note?: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border px-3 py-2.5 hover:bg-accent/40 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium min-w-0">
          <span className="text-primary shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums shrink-0">{value}</span>
      </div>
      {note && <p className="text-xs text-muted-foreground mt-1 ml-6">{note}</p>}
    </Link>
  );
}
