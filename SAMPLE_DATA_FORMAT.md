# 📊 Örnek Veri Dosyası Formatı

Bu dosya, HisMarketing sistemine yükleyebileceğiniz örnek veri formatlarını açıklar.

## ✅ Desteklenen Formatlar

- **Excel**: `.xlsx`, `.xls`
- **CSV**: `.csv` (UTF-8, Latin1, CP1254 encoding)

## 📋 Örnek Veri Yapıları

### Örnek 1: Temel Format (Türkçe)

| Tarih | Ürün Adı | Adet | Birim Fiyat | Toplam Gelir | Maliyet |
|-------|----------|------|-------------|--------------|---------|
| 01.01.2024 | Süt 1L | 15 | 25.00 | 375.00 | 200.00 |
| 01.01.2024 | Ekmek | 50 | 5.00 | 250.00 | 100.00 |
| 02.01.2024 | Süt 1L | 20 | 25.00 | 500.00 | 270.00 |
| 02.01.2024 | Peynir Beyaz | 8 | 150.00 | 1200.00 | 800.00 |

### Örnek 2: İngilizce Format

| Date | Product | Quantity | Price | Revenue | Cost |
|------|---------|----------|-------|---------|------|
| 2024-01-01 | Milk 1L | 15 | 25.00 | 375.00 | 200.00 |
| 2024-01-01 | Bread | 50 | 5.00 | 250.00 | 100.00 |
| 2024-01-02 | Milk 1L | 20 | 25.00 | 500.00 | 270.00 |

### Örnek 3: Karışık Format (Farklı Sütun İsimleri)

| gun | mal_adi | sayi | ucret | satis | alis |
|-----|---------|------|-------|-------|------|
| 2024-01-01 | Süt | 15 | 25 | 375 | 200 |
| 2024-01-01 | Ekmek | 50 | 5 | 250 | 100 |

## 🎯 Sütun Türleri ve Alternatif İsimler

### 1. Tarih Sütunu
**Algılanan İsimler:**
- `tarih`, `date`, `gün`, `gun`, `day`, `zaman`, `time`, `dönem`, `donem`, `period`

**Desteklenen Formatlar:**
- `01.01.2024`
- `2024-01-01`
- `01/01/2024`
- `2024-01-01 10:30:00`

### 2. Ürün Sütunu
**Algılanan İsimler:**
- `ürün`, `urun`, `product`, `item`, `stok`, `mal`, `article`, `name`, `ad`, `isim`

**Örnekler:**
- `Süt 1L`
- `Ekşi Mayalı Köy Ekmeği`
- `Product-001`

### 3. Miktar/Adet Sütunu
**Algılanan İsimler:**
- `adet`, `miktar`, `quantity`, `qty`, `amount`, `sayi`, `sayı`, `number`, `count`, `piece`

**Format:**
- Tam sayı: `10`, `50`, `100`
- Ondalık: `10.5`, `25.75`

### 4. Fiyat Sütunu
**Algılanan İsimler:**
- `fiyat`, `price`, `tutar`, `ucret`, `ücret`, `cost`, `birim`, `unit`

**Format:**
- `25.00`
- `150.50`
- `5000`

### 5. Gelir Sütunu
**Algılanan İsimler:**
- `gelir`, `revenue`, `sales`, `satış`, `satis`, `toplam`, `total`

**Format:**
- `375.00`
- `1200.50`

### 6. Maliyet/Gider Sütunu
**Algılanan İsimler:**
- `maliyet`, `cost`, `gider`, `expense`, `alış`, `alis`, `purchase`

**Format:**
- `200.00`
- `800.50`

### 7. Kategori Sütunu (Opsiyonel)
**Algılanan İsimler:**
- `kategori`, `category`, `grup`, `group`, `type`, `tip`, `tür`, `tur`, `class`

**Örnekler:**
- `Süt Ürünleri`
- `Bakery`
- `Temel Gıda`

## 💡 Önemli Notlar

### ✅ Yapılabilir
- Farklı dillerde sütun isimleri kullanabilirsiniz
- Yazım hataları olabilir (sistem düzeltir)
- Eksik sütunlar olabilir (sistem tamamlar)
- Farklı tarih formatları kullanabilirsiniz
- Virgül veya nokta ondalık ayırıcı olabilir

### ⚠️ Dikkat Edilmesi Gerekenler
- **En az 10 satır** veri olmalı (daha fazlası daha iyi)
- **En az 1 ay** geçmiş veri bulunmalı
- **Tarih ve Ürün** sütunları mutlaka olmalı
- Dosya boyutu **50MB'den küçük** olmalı

### ❌ Yapmayın
- Boş dosya yüklemeyin
- Sadece başlık satırı yüklemeyin
- Çok fazla birleştilmiş hücre kullanmayın
- Grafikler veya resimler eklemeyin

## 📈 Veri Kalitesi İpuçları

### İyi Kaliteli Veri İçin:
1. **Tutarlı Format**: Aynı tarih formatını kullanın
2. **Tam Kayıtlar**: Mümkün olduğunca tüm sütunları doldurun
3. **Doğru Değerler**: Negatif miktar veya fiyat kullanmayın
4. **Güncel Veri**: Son 3-12 ay arası veri ideal
5. **Çeşitlilik**: Farklı ürünler ve dönemler

### Örnek: Mükemmel Veri Seti
```
✅ 200+ satır veri
✅ 6 aylık geçmiş
✅ 20-50 farklı ürün
✅ Tüm sütunlar dolu
✅ Tutarlı format
```

## 🔄 Veri Hazırlama Adımları

### Excel'de:
1. İlk satır başlık olmalı
2. Her sütuna anlamlı isim verin
3. Boş satırları silin
4. Tarih hücrelerini tarih formatına çevirin
5. `.xlsx` veya `.csv` olarak kaydedin

### CSV'de:
1. UTF-8 encoding kullanın
2. Virgül veya noktalı virgül ayırıcı
3. Tırnak işaretlerini kaldırın (opsiyonel)
4. İlk satır başlık olmalı

## 📥 Test Verisi Oluşturma

Eğer test etmek istiyorsanız:

1. Excel'de yeni bir dosya açın
2. Yukarıdaki örnek formatlardan birini kopyalayın
3. 20-50 satır veri ekleyin
4. Farklı tarihler ve ürünler kullanın
5. Kaydedin ve HisMarketing'e yükleyin

## 🎓 Örnek Kullanım Senaryoları

### Market
- Günlük satışlar
- Ürün bazında miktar ve gelir
- Haftalık/Aylık toplamlar

### Restoran
- Günlük malzeme kullanımı
- Yemek satış adetleri
- Maliyet ve gelir

### E-Ticaret
- Sipariş bazlı satışlar
- Ürün kategorileri
- Müşteri bazlı analizler

## ❓ SSS

**S: Tüm sütunlar zorunlu mu?**
C: Hayır! Sistem eksik sütunları otomatik tamamlar. Minimum tarih ve ürün bilgisi yeterli.

**S: Farklı para birimleri kullanabilir miyim?**
C: Evet, ancak tutarlı olmalı. Sistem rakamları analiz eder, para birimi sembolü önemli değil.

**S: Çok büyük dosya yükleyebilir miyim?**
C: Maksimum 50MB. Daha büyük dosyalar için veriyi bölün veya özetleyin.

**S: Tarih formatım çok farklı, çalışır mı?**
C: Sistem yaygın formatları algılar. Sorun olursa standart formata (`YYYY-MM-DD`) çevirin.

---

**💡 İpucu**: İlk kez kullanıyorsanız, küçük bir test dosyası ile başlayın (50-100 satır).
