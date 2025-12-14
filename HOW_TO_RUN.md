 HisMarketing - Kurulum ve Çalıştırma Kılavuzu

Bu doküman, HisMarketing projesinin nasıl kurulacağını ve çalıştırılacağını adım adım açıklar.

 Gereksinimler

 Sistem Gereksinimleri
- **İşletim Sistemi**: Windows, macOS veya Linux
- **Python**: 3.8 veya üzeri
- **RAM**: Minimum 4GB (8GB önerilir)
- **Disk Alanı**: Minimum 500MB

 Yazılım Gereksinimleri
- Python 3.8+
- pip (Python paket yöneticisi)
- Git (opsiyonel, indirme için)

 1. Projeyi İndirme

### GitHub'dan İndirme
```bash
git clone https://github.com/[kullanici-adi]/hismarketing.git
cd hismarketing
```

### ZIP Dosyası ile
1. Proje ZIP dosyasını indirin
2. ZIP'i bir klasöre çıkarın
3. Terminal/CMD ile proje klasörüne gidin

##  2. Kurulum

### Adım 1: Sanal Ortam Oluşturma (Önerilen)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
venv\Scripts\activate
```

### Adım 2: Bağımlılıkları Yükleme

```bash
pip install -r requirements.txt
```

Bu komut aşağıdaki paketleri yükleyecektir:
- Flask==3.0.0
- Flask-CORS==4.0.0
- pandas==2.1.4
- numpy==1.26.2
- scikit-learn==1.3.2
- openpyxl==3.1.2
- requests==2.31.0
- python-dateutil==2.8.2
- matplotlib==3.8.2
- seaborn==0.13.0
- Werkzeug==3.0.1
- joblib==1.3.2
- scipy==1.11.4
- reportlab==4.0.8

### Adım 3: Gerekli Klasörlerin Kontrolü

Aşağıdaki klasörlerin mevcut olduğundan emin olun (yoksa otomatik oluşacaktır):
- `uploads/` - Yüklenen dosyalar için
- `user_data/` - Kullanıcı verileri için
- `images/` - Logo ve görseller için

##  3. Uygulamayı Çalıştırma

### Temel Çalıştırma

```bash
python app.py
```

### Başarılı Başlatma Çıktısı

```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
 * Running on http://[YOUR-IP]:5000
```

### Tarayıcıda Açma

Uygulama başladıktan sonra tarayıcınızda aşağıdaki adresi açın:

```
http://localhost:5000
```

veya

```
http://127.0.0.1:5000
```

##  4. İlk Kullanım

### Adım 1: Kayıt Olma
1. Ana sayfada **"Kayıt Ol"** butonuna tıklayın
2. Gerekli bilgileri doldurun:
   - Ad Soyad
   - E-posta
   - İşletme Adı
   - Şifre (en az 6 karakter)
3. **"Kayıt Ol"** butonuna tıklayın
4. Otomatik olarak dashboard'a yönlendirileceksiniz

### Adım 2: Veri Yükleme
1. Dashboard'da **"Veri Yükle"** sekmesine gidin
2. Excel (.xlsx) veya CSV (.csv) dosyanızı sürükleyin veya seçin
3. Sistem dosyanızı otomatik olarak analiz edecektir
4. Algılanan sütunlar gösterilecektir
5. **"Verileri Analiz Et"** butonuna tıklayın

### Adım 3: Analiz Sonuçlarını Görüntüleme
1. **"Analiz"** sekmesine gidin
2. Toplam gelir, gider, kâr istatistiklerini görün
3. Grafikleri inceleyin:
   - Aylık satış trendi
   - Ürün bazlı kâr dağılımı
4. En çok satan ürünler tablosunu görüntüleyin
5. İsterseniz **"PDF İndir"** ile rapor alın

### Adım 4: Tahmin Oluşturma
1. **"Tahmin"** sekmesine gidin
2. **"Tahmin Oluştur"** butonuna tıklayın
3. AI sistemi analiz yapacaktır (birkaç saniye sürebilir)
4. 6 aylık tahmin sonuçlarını görüntüleyin
5. Her ürün için aylık tahminler tabloda gösterilir
6. Doğruluk yüzdesi görüntülenir
7. Öneriler listesini inceleyin
8. **"Excel İndir"** ile tahmin raporunu indirin

## 5. Veri Formatı

### Desteklenen Formatlar
- **Excel**: .xlsx, .xls
- **CSV**: .csv (UTF-8, Latin1, CP1254 encoding'leri desteklenir)

### Örnek Veri Yapısı

Sistem esnek sütun isimleri kabul eder, ancak ideal bir veri yapısı:

| Tarih | Ürün | Adet | Fiyat | Gelir | Maliyet |
|-------|------|------|-------|-------|---------|
| 2024-01-01 | Süt | 10 | 25 | 250 | 150 |
| 2024-01-02 | Ekmek | 50 | 5 | 250 | 100 |

**Not:** Sütun isimleri farklı olabilir:
- "Tarih", "Date", "Gün", "Zaman" → Tarih olarak algılanır
- "Ürün", "Product", "Mal", "Item" → Ürün olarak algılanır
- "Adet", "Miktar", "Quantity" → Miktar olarak algılanır
- vb.

### Minimum Gereksinimler
- En az **10 satır** veri (daha fazlası daha iyi tahmin sağlar)
- En az **1 ay** geçmiş veri
- Ürün ve miktar bilgisi (diğer alanlar opsiyonel)

##  6. Sorun Giderme

### Problem: "Module not found" hatası

**Çözüm:**
```bash
pip install -r requirements.txt --upgrade
```

### Problem: Port 5000 zaten kullanımda

**Çözüm:** `app.py` dosyasının son satırını değiştirin:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # 5001 veya başka port
```

### Problem: Dosya yüklenmiyor

**Çözüm:**
1. Dosya boyutunun 50MB'den küçük olduğundan emin olun
2. Dosya formatının .xlsx veya .csv olduğunu kontrol edin
3. Tarayıcı konsolunu kontrol edin (F12)

### Problem: Analiz/Tahmin çalışmıyor

**Çözüm:**
1. Verinin en az 10 satır içerdiğinden emin olun
2. Tarih sütununun doğru formatta olduğunu kontrol edin
3. Terminal/CMD'de hata mesajlarını kontrol edin

##  7. İpuçları

### Daha İyi Tahminler İçin
1. **Daha fazla geçmiş veri**: En az 3-6 aylık veri kullanın
2. **Tam veriler**: Eksik veriler olsa da sistem çalışır, ancak tam veriler daha iyi sonuç verir
3. **Tutarlı format**: Aynı formatta veri kullanın
4. **Kategorize edilmiş ürünler**: Benzer ürünleri gruplandırın

### Performans İpuçları
1. İlk seferde 20-30 ürünle test edin
2. Çok büyük dosyalar (>50MB) için veriyi bölün
3. Tarayıcı cache'ini düzenli temizleyin

##  8. Güncelleme

Projeyi güncellemek için:

```bash
git pull origin main
pip install -r requirements.txt --upgrade
```

##  9. Uygulamayı Durdurma

Terminal/CMD'de:
- **Windows**: `Ctrl + C`
- **macOS/Linux**: `Ctrl + C`

Sanal ortamdan çıkmak için:
```bash
deactivate
```

##  10. Destek

Sorun yaşarsanız:
1. Terminal/CMD'deki hata mesajlarını kontrol edin
2. Tarayıcı konsolunu (F12) kontrol edin
3. README.md dosyasını okuyun
4. GitHub Issues'da sorun bildirin

##  11. Kontrol Listesi

Başlamadan önce:
- [ ] Python 3.8+ yüklü
- [ ] Sanal ortam oluşturuldu ve aktif
- [ ] Bağımlılıklar yüklendi
- [ ] Logo dosyası `images/` klasöründe
- [ ] Terminal'de `python app.py` çalıştırıldı
- [ ] Tarayıcıda http://localhost:5000 açıldı

##  Başarılar!

Artık HisMarketing'i kullanmaya başlayabilirsiniz. İyi analizler ve tahminler!

---

** Sorularınız için:** GitHub hisimsekk1
** E-posta:** hisimsekcontact@gmail.com
