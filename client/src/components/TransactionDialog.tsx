import { Button } from "@/components/ui/button";
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
import { PAYMENT_METHODS, isoToMs, todayISO } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

/** Gelir/gider işlemi ekleme/düzenleme diyaloğu */
export default function TransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  editId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
  editId?: number;
}) {
  const categories = trpc.meta.categories.list.useQuery();
  const create = trpc.transactions.create.useMutation();
  const update = trpc.transactions.update.useMutation();

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [paymentMethod, setPaymentMethod] = useState("nakit");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setTitle("");
      setCategoryId("none");
      setDescription("");
      setDate(todayISO());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId]);

  // editId verilirse mevcut işlemi çek
  const txList = trpc.transactions.list.useQuery({ limit: 500 }, { enabled: open && !!editId });
  useEffect(() => {
    if (editId && txList.data) {
      const t = txList.data.find(x => x.id === editId);
      if (t) {
        setType(t.type as "income" | "expense");
        setAmount(String(t.amount));
        setTitle(t.title);
        setCategoryId(t.categoryId ? String(t.categoryId) : "none");
        setPaymentMethod(t.paymentMethod);
        setDescription(t.description ?? "");
        setDate(new Date(t.date).toISOString().slice(0, 10));
      }
    }
  }, [editId, txList.data]);

  const submit = async () => {
    if (!title.trim() || !amount) return;
    const payload = {
      type,
      amount: Number(amount),
      title: title.trim(),
      categoryId: categoryId !== "none" ? Number(categoryId) : null,
      paymentMethod,
      date: isoToMs(date),
      description: description.trim() || undefined,
    };
    if (editId) await update.mutateAsync({ id: editId, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
    onSuccess?.();
  };

  const catList = (categories.data ?? []).filter(c => c.type === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editId ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
            >
              Gider
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className={type === "income" ? "bg-emerald-700 hover:bg-emerald-800" : ""}
            >
              Gelir
            </Button>
          </div>
          <Field>
            <FieldLabel>Başlık</FieldLabel>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === "expense" ? "Market alışverişi" : "Maaş"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Tutar (₺)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </Field>
            <Field>
              <FieldLabel>Tarih</FieldLabel>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Kategori</FieldLabel>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kategorisiz</SelectItem>
                  {catList.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Ödeme Şekli</FieldLabel>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel>Açıklama (opsiyonel)</FieldLabel>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !amount || create.isPending || update.isPending}>
            {editId ? "Kaydet" : "Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
