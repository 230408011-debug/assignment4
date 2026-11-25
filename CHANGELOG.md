# 📋 Furio FC — Sürüm Güncelleme Notları (CHANGELOG)

**Sürüm:** `0.9.4`  
**Sürüm Kodu (VersionCode):** `2`  
**Platform:** Android (Capacitor 8 / Phaser 3)  
**Tarih:** 12 Ekim 2026  

---

## 🚀 Genel Bakış
Bu sürüm, Furio FC'nin fiziksel hız/stamina mekaniklerini, veri bütünlüğünü (Single Source of Truth), sosyal medya etkileşim algoritmalarını, kadro yönetimini, ekonomi dengesini ve Android mağaza yayın hazırlığını (marka temizliği, ProGuard/R8, adaptive ikon ve splash setleri) baştan sona modernize eden kapsamlı bir ana güncellemedir.

---

## 🛠️ Detaylı Değişiklikler ve Kök Neden Analizleri

### 1. Hız ve Sprint Dengesi (A, B)
* **Kök Neden:** "SPD" göstergesi delta time düzensizlikleri ve ham piksel sıçramaları nedeniyle 3-80 km/h arasında gerçek dışı dalgalanıyordu. Dribble ve taban hız kaynakları birden fazla noktada kontrolsüz toplanıyordu.
* **Yapılan Düzeltmeler:**
  - Hız hesaplaması EMA (Exponential Moving Average, 200ms pencere) filtresi ile yumuşatıldı.
  - Sabit dönüşüm katsayısı tanımlandı (`1 px/s = 0.116 km/h`).
  - Oyuncu koşu hızı 8-25 km/h, sprint hızı 28-36 km/h aralığına oturtuldu; 36 km/h (310.3 px/s) üzerine sert sınır (hard clamp) konuldu.
  - Top sürme hız cezası top kontrolü ve dribble niteliğine göre dinamik hale getirildi (min 0.88, max 0.94 çarpanı).
  - Santra (kickoff), gol ve pozisyon resetlerinde hız ve EMA tamponu anında sıfırlandı.
  - Sprint mekanizması 3 duruma bağlandı (Active, Pressed, Locked). Stamina tükenince yumuşakça (soft decay, 0.4s) normal koşuya dönüş sağlandı.
  - Stamina tüketim ve yenilenme oranları oyuncunun Stamina ve Physical niteliklerine dinamik bağlandı.

### 2. Veri ve Rating Tek Kaynağı (C, D, H)
* **Kök Neden:** Oyuncu reytingi farklı sahnelerde keyfi ve tutarsız hesaplanıyordu. Maç içi reyting gol olsa bile 6.0'da kalabiliyor veya anlamsız düşebiliyordu. Sezon ortası kulüp değişikliğinde lig fikstürleri ve puan durumu kopuyordu.
* **Yapılan Düzeltmeler:**
  - `GameStateManager.calculatePlayerOVR` ağırlıklı FIFA/eFootball formülü ile standardize edildi (ST: Şut 35%, Hız 25%, Dribble 20%, Pas 10%, Fizik 10%).
  - Maç içi canlı reyting `recordMatchRatingEvent` event-driven motoruna bağlandı. Gol (+1.2), asist (+0.8), isabetli pas (+0.1), kritik müdahale (+0.3) ile taban 6.0'dan [1.0, 10.0] aralığında gerçekçi puanlama sağlandı.
  - Bakiye tek kaynağı `GameStateManager.getEZ()`, `setEZ()`, `addEZ()` ile standardize edildi; tüm sahneler buradan okuyacak şekilde refactor edildi.
  - `CareerManager.getOrInitSquad` güncellendi: Yedek kulübesi artık jenerik 65 puanlık klonlar yerine kulübün ligine ve ülkesine özel benzersiz isim ve dengeli niteliklere sahip 3 yedek oyuncu üretir.
  - Sezon ortası transferde (`acceptContractMidSeason`) ve kariyer onarımında (`validateAndRepairCareerState`), yeni kulübün yerel ligi sıfırdan inşa edilip oynanmış haftalar simüle edilerek puan durumu ve fikstür %100 senkronize edildi.
  - `KitSelectionScene`: Kulüp güçleri `calculateTeamPower` ile hesaplandı; rakip oyuncu kartı net kulüp etiketiyle (`⭐ ÖNEMLİ OYUNCU (Kulüp Adı)`) ve kullanıcı kartı (İsim, Pos, GEN) ile gösterildi.

### 3. Sosyal Medya ve Taraftar Topluluğu (G)
* **Kök Neden:** `SocialMediaData` içerisinde binlik format ('K') yerine Türkçe 'Bin' kısaltması olarak 'B' kullanılmıştı; bu durum uluslararası arayüzde 17K takipçiye 95.0B (95 Milyar) beğeni gibi tutarsız gösterimlere yol açıyordu.
* **Yapılan Düzeltmeler:**
  - `formatNumber` metodu düzeltildi: 1.000 üzeri için 'K', 1.000.000 üzeri için 'M' kullanıldı.
  - Topluluk istatistikleri kulüp taraftar tabanına göre dengelendi (Beğeni 10K-45K, Yorum 1K-6K, Aktif Taraftar 15K-35K, Post başı beğeni 80-950).
  - Furiogram kategori kartları gerçek maç verisine bağlandı:
    - `⚽ GOL ANI`: Sadece oyuncu gol attıysa ve gerçek maç dakikasıyla gösterilir. Gol yoksa `🧤 SAVUNMA` kartı devreye girer.
    - `🏟️ STATTAN`: Gerçek maç şut sayısı, pas isabeti ve oyuncu reytingini yansıtır.
    - `🎉 KUTLAMA` / `🤝 DESTEK`: Galibiyette kutlama, beraberlikte mücadele, mağlubiyette destek kartı gösterilir.
  - Sağ kenar çubuğuna **🎁 MAÇ ÖDÜLLERİ VE GELİR** paneli eklendi (Turnuva adı, Maç Primi, Gol Primi, Kazanılan XP, Toplam EZ ve Kasa Bakiyesi).
  - FX ve Futiotic sekmelerine tam etkileşim ve sesli Toast bildirimleri eklendi (Video izleme tepkisi, beğeni artırma, tweet repost).

### 4. Kadro ve Arayüz Çakışmaları (E, J)
* **Kök Neden:** Sahne geçişlerinde `shutdown()` metodunun Phaser event listener'larına bağlanmaması nedeniyle önceki sahnelerin container ve metin nesneleri arka planda kalıyordu. Kadro sekmesinde 3v3 formatı için kafa karıştırıcı "İlk 11" ifadesi bulunuyordu.
* **Yapılan Düzeltmeler:**
  - `CareerWorldScene` kadro sekmesi başlığı `⚽ BAŞLANGIÇ KADROSU (3 OYUNCU)` olarak güncellendi, rozet `BAŞLANGIÇ` yapıldı.
  - Takım Geni göstergesi sabit 74 yerine `GameStateManager.calculateTeamPower(activeSquad)` dinamik motoruna bağlandı.
  - Kadro kartlarındaki nitelik etiketleri (HIZ, ŞUT, PAS...) okunabilir 10px boyutuna yükseltildi.
  - `shutdown()` metodu `this.events.once('shutdown')` ile Phaser yaşam döngüsüne bağlandı ve `this.children.removeAll(true)` ile bellek sızıntıları önlendi.

### 5. Ekonomi ve Oyuncu Gelişimi (I)
* **Kök Neden:** Beceri geliştirme maliyetleri dengesizdi ve maç başı gelirlerle örtüşmüyordu.
* **Yapılan Düzeltmeler:**
  - `src/data/EconomyConfig.js` oluşturuldu ve sisteme entegre edildi.
  - Geliştirme maliyetleri kademelendirildi (50->60: 240 EZ, 60->70: 360 EZ, 70->80: 480 EZ, 80->90: 620 EZ, 90->100: 800 EZ). İlk gelişim adımı 3-4 maçta, tam seviye 25-35 maçlık kariyer periyodunda tamamlanabilir hale getirildi.
  - Ödüllü reklam (Rewarded Ad) ve IAP ürün kataloğu kancaları hazırlandı.

### 6. Marka Temizliği ve Varlıklar (K)
* **Kök Neden:** `ball_3d.png` üzerinde telifli marka detayları bulunuyordu. Android uygulamasında varsayılan Capacitor mavi 'X' ikonu mevcuttu. İskoçya ligindeki bir kulüp gerçek 'Dundee United' ismiyle birebir aynıydı.
* **Yapılan Düzeltmeler:**
  - Telifli unsurlar kaldırılarak 1024x1024 boyutunda, dikiş detaylı, modern ve şeffaf RGBA PNG futbol topu üretilip `assets/ball_3d.png`, `www/assets/ball_3d.png` ve Android asset klasörlerine yerleştirildi.
  - Android adaptive ikon seti (`ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`, `ic_launcher_background.png`) Furio FC kalkan amblemi ile tüm mipmap klasörleri (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) için üretildi.
  - Tüm drawable ve drawable-*dpi klasörlerindeki splash ekranları Furio FC gece stadyumu ve neon amblem temasıyla güncellendi.
  - 120 kulüplük marka benzerliği taraması yapıldı: Birebir eşleşen tek kulüp `Dundee United` güvenli kurgusal ismi olan `Dundee Orange` olarak değiştirildi. Risk düzeyi %100 sıfırlandı (`scratch/TRADEMARK_AUDIT_REPORT.md`).

### 7. Android Release ve ProGuard/R8 (L)
* **Yapılan Düzeltmeler:**
  - `package.json` ve `android/app/build.gradle` sürümleri `versionName "0.9.4"`, `versionCode 2` olarak eşitlendi.
  - `android/app/build.gradle` release build tipinde `minifyEnabled true` aktifleştirildi.
  - `android/app/proguard-rules.pro` dosyasına Capacitor Bridge, JavascriptInterface, WebKit ve Reflection koruma kuralları eklendi.
  - Release ve Debug APK üretimi Gradle ile derlenip doğrulandı.

---

## 🧪 Test ve Doğrulama
- **Birim & Fizik Testleri:** `scratch/test_gameplay_fixes.js` (Hız sınırı, EMA, stamina, maç reytingi) -> **PASS**
- **16 Maddelik Tam Regresyon Testi:** `scratch/run_full_qa.js` (Veritabanı, kadro, fikstür, transfer, kayıt saklama) -> **16/16 PASS**
- **Marka ve Telif Taraması:** `scratch/audit_trademarks.js` -> **120/120 GÜVENLİ (0 Yüksek Risk)**
- **Android Gradle Derlemesi:** Release APK & Debug APK başarıyla oluşturuldu.
