import TransactionDialog from "@/components/TransactionDialog";
import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatTL, formatDateShort, PAYMENT_METHODS } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();

  const categories = trpc.meta.categories.list.useQuery();
  const list = trpc.transactions.list.useQuery({ limit: 500 });
  const deleteTx = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      utils.invalidate();
      toast.success("İşlem silindi");
    },
  });
  const utils = trpc.useUtils();

  const filtered = useMemo(() => {
    return (list.data ?? []).filter(t => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (catFilter !== "all" && String(t.categoryId ?? "none") !== catFilter) return false;
      if (methodFilter !== "all" && t.paymentMethod !== methodFilter) return false;
      return true;
    });
  }, [list.data, typeFilter, catFilter, methodFilter]);

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const openNew = () => {
    setEditId(undefined);
    setDialogOpen(true);
  };
  const openEdit = (id: number) => {
    setEditId(id);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="İşlemler"
        description="Tüm gelir ve gider kayıtları — filtreleyin, düzenleyin, arşivleyin."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Yeni İşlem
          </Button>
        }
      />

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Türler</SelectItem>
            <SelectItem value="income">Gelir</SelectItem>
            <SelectItem value="expense">Gider</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            <SelectItem value="none">Kategorisiz</SelectItem>
            {(categories.data ?? []).map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ödeme Şekilleri</SelectItem>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <div className="flex gap-2 text-sm">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 px-3 py-1.5">
            Gelir: {formatTL(totals.income)}
          </Badge>
          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 px-3 py-1.5">
            Gider: {formatTL(totals.expense)}
          </Badge>
          <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 px-3 py-1.5">
            Net: {formatTL(totals.net)}
          </Badge>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Kayıt bulunamadı. Sağ üstten yeni işlem ekleyin.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-3 pr-3 font-medium">Tarih</th>
                  <th className="py-3 pr-3 font-medium">Başlık</th>
                  <th className="py-3 pr-3 font-medium">Kategori</th>
                  <th className="py-3 pr-3 font-medium">Ödeme</th>
                  <th className="py-3 pr-3 font-medium text-right">Tutar</th>
                  <th className="py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDateShort(t.date)}</td>
                    <td className="py-2.5 pr-3 font-medium">
                      {t.title}
                      {t.description && <span className="block text-xs text-muted-foreground font-normal">{t.description}</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      {t.categoryName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.categoryColor ?? "#94a3b8" }} />
                          {t.categoryName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{t.paymentMethod}</td>
                    <td className={`py-2.5 pr-3 text-right tabular-nums font-semibold whitespace-nowrap ${t.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                      {t.type === "income" ? "+" : "−"}{formatTL(t.amount)}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm("Bu işlemi silmek istediğinize emin misiniz?")) deleteTx.mutate({ id: t.id });
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

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editId={editId}
        onSuccess={() => {
          utils.transactions.list.invalidate();
          utils.transactions.monthTotals.invalidate();
          toast.success("İşlem kaydedildi");
        }}
      />
    </div>
  );
}
