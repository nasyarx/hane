# Aile Bütçesi - Project TODO

## Veritabanı
- [ ] Şema: kategoriler, işlemler, faturalar, borç/alacak, taksitler, sigorta/kasko/muayene, zekat, banka promosyon, birikim/varlıklar, kurslar + kurs ödemeleri, görevler/hatırlatmalar, aile üyeleri
- [ ] `pnpm db:push`

## Backend (tRPC)
- [ ] Kategori & işlem CRUD + filtreler
- [ ] Fatura CRUD + ödeme işaretleme
- [ ] Borç/Alacak CRUD + tahsilat/ödeme
- [ ] Taksit CRUD + taksit ödemesi
- [ ] Sigorta/kasko/muayene CRUD
- [ ] Zekat: hesap, verilen ödemeler, kalan
- [ ] Banka promosyon (gelen/giden) CRUD
- [ ] Birikim & varlıklar CRUD
- [ ] Kurs CRUD + kurs ücreti ödemeleri
- [ ] Görev/hatırlatma CRUD + tekrar mantığı (günlük/haftalık/aylık/yıllık)
- [ ] Dashboard özet endpoint'i

## Frontend
- [ ] Tema (index.css) + fontlar + DashboardLayout (Türkçe, giriş gerektirmeyen)
- [ ] Genel Bakış (dashboard)
- [ ] İşlemler sayfası
- [ ] Kategoriler sayfası
- [ ] Faturalar
- [ ] Borç & Alacak
- [ ] Taksitler
- [ ] Sigorta & Araç
- [ ] Zekat
- [ ] Banka Promosyon
- [ ] Birikim & Varlıklar
- [ ] Kurslar
- [ ] Görevler & Hatırlatmalar

## Test & Dağıtım
- [ ] Vitest testleri (tekrar hesabı, zekat, özet)
- [ ] `pnpm check` + `pnpm test`
- [ ] Preview deploy
