HisMarketing - Yapay Zeka Destekli Stok Tahmin Sistemi

Proje Hakkında

HisMarketing, küçük ve orta ölçekli işletmeler için geliştirilmiş, yapay zeka destekli akıllı bir stok tahmin ve yönetim platformudur. Geçmiş satış verilerinizi analiz ederek, gelecekte hangi ürünün ne kadar satılacağını yüksek doğrulukla tahmin eder.

 Temel Amaç

-  Stok fazlasını azaltmak
-  Eksik stok nedeniyle satış kaybını önlemek
-  Kâr oranını artırmak
-  Veri odaklı kararlar almak

Özellikler

 Akıllı Veri Anlama
- Esnek Veri Formatı: Excel (.xlsx) ve CSV (.csv) dosyaları desteklenir
- Otomatik Sütun Algılama: Farklı dillerdeki veya hatalı yazılmış sütun isimleri otomatik olarak algılanır
- Eksik Veri Yönetimi: Eksik veriler akıllıca doldurulur, sistem durdurmaz

Detaylı Analiz
- Toplam gelir, gider ve kâr-zarar analizi
- Ürün bazlı performans raporları
- Aylık satış trendleri ve grafikler
- En çok/az satan ürünler listesi

6 Aylık Tahmin
- Her ürün için ayrı tahmin (aynı değer tüm ürünlere verilmez)
- Çoklu faktör analizi:
  - Hava durumu
  -  Hafta içi / hafta sonu
  -  Özel günler ve tatiller
  -  Sezonsal etkiler
  -  Ürün bozulma süresi
  -  Konum ve rekabet yoğunluğu
  

Model Doğruluğu
- MAPE ve RMSE metriklerle hesaplanan doğruluk
- Her tahmin için doğruluk yüzdesi gösterilir
- Şeffaf ve güvenilir sonuçlar

Raporlama
- PDF formatında analiz raporları
- Excel formatında tahmin raporları
- İndirilebilir ve paylaşılabilir formatlar

Teknolojiler

Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Chart.js (Grafikler için)
- Font Awesome (İkonlar için)
- Responsive tasarım

Backend
- Python 3.8+
- Flask (Web framework)
- Flask-CORS (Cross-origin resource sharing)

AI/ML
- Pandas (Veri işleme)
- NumPy (Sayısal hesaplamalar)
- Scikit-learn (Makine öğrenmesi)
  - Random Forest Regressor
  - Gradient Boosting Regressor
- Özel veri anlama algoritmaları

Veri İşleme
- OpenPyXL (Excel okuma/yazma)
- ReportLab (PDF oluşturma)

Proje Yapısı

```
hismarket/
│
├── app.py                      # Ana Flask uygulaması
├── requirements.txt            # Python bağımlılıkları
├── .gitignore                 # Git ignore dosyası
│
├── backend/                   # Backend modülleri
│   ├── data_intelligence.py   # Akıllı veri anlama modülü
│   ├── prediction_engine.py   # Tahmin motoru
│   ├── external_data.py       # Harici veri sağlayıcı
│   └── utils.py              # Yardımcı fonksiyonlar
│
├── templates/                 # HTML şablonları
│   ├── index.html            # Ana sayfa
│   ├── auth.html             # Giriş/Kayıt sayfası
│   └── dashboard.html        # Dashboard
│
├── static/                    # Statik dosyalar
│   ├── css/                  # CSS dosyaları
│   │   ├── styles.css        # Ana sayfa CSS
│   │   ├── auth.css          # Giriş/Kayıt CSS
│   │   └── dashboard.css     # Dashboard CSS
│   │
│   └── js/                   # JavaScript dosyaları
│       ├── main.js           # Ana sayfa JS
│       ├── auth.js           # Giriş/Kayıt JS
│       └── dashboard.js      # Dashboard JS
│
├── images/                    # Görseller
│   └── logo.png              # Logo dosyası
│
├── uploads/                   # Yüklenen dosyalar (otomatik oluşur)
└── user_data/                # Kullanıcı verileri (otomatik oluşur)
```

Tasarım

Renk Paleti
- Ana Renkler: Beyaz (#FFFFFF) ve Lacivert (#0a2463)
- Vurgular: Açık Lacivert (#2563eb)
- Arka Plan: Açık Gri (#f8fafc)

Tasarım İlkeleri
-  Sade ve profesyonel görünüm
-  Mobil ve masaüstü uyumlu (Responsive)
-  Kolay navigasyon
-  Görsel hiyerarşi
-  Erişilebilirlik

Önemli Özellikler

1. Zorunlu Sütun Yok
Sistem, yüklenen verideki sütunları otomatik olarak algılar. Belirli bir sütun formatı beklemez.

2. Çoklu Dil Desteği
Sütun isimleri Türkçe, İngilizce veya karışık olabilir. Sistem anlamsal eşleştirme yapar.

3. Akıllı Eksik Veri Yönetimi
Eksik veriler yüzünden analiz durdurmaz. Akıllı algoritmalarla eksiklikler doldurulur.

4. Dinamik Feature Engineering
AI, satışları etkileyen yeni faktörleri otomatik olarak keşfedebilir.

5. Ürün Bazlı Tahmin
Her ürün için ayrı model eğitilir, farklı tahminler üretilir.

Güvenlik

- Şifreler hash'lenerek saklanır
- Token tabanlı authentication
- CORS koruması
- Dosya tipi ve boyut kontrolü
- Kullanıcı verilerinin izolasyonu

Kullanım Senaryoları

Market / Süpermarket
- Günlük tüketim ürünlerinin stok tahmini
- Bozulabilir ürünler için özel tahmin
- Sezonsal ürün planlaması

Restoran / Kafe
- Malzeme ihtiyaç tahmini
- Hafta içi / hafta sonu farklılaşması
- Özel günlerde yoğunluk tahmini

E-Ticaret
- Ürün talep tahmini
- Kampanya dönemlerinde stok planlaması
- Kategori bazlı analiz

Hedef Kitle

- Küçük ve orta ölçekli işletmeler
- Perakende mağazalar
- Restoran ve kafeler
- E-ticaret şirketleri
- Franchise zincirleri

Destek ve İletişim

Proje hakkında sorularınız için:
- GitHub Issues kullanabilirsiniz
- Kod katkılarınızı Pull Request olarak gönderebilirsiniz

Lisans

Bu proje MIT lisansı altında lisanslanmıştır.


