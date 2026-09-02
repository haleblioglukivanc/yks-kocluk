# deneme-analizi

Deneme analizinin **bulgu metnini** yazar. Dağılım (bilgi / dikkat / süre) ve önerilen
görevler veritabanındaki kural katmanında (`deneme_analizi_hazirla`) hesaplanır; bu
fonksiyon yalnız koça dönük 2-3 cümlelik bulguyu modelden ister ve aynı satıra yazar.

## Sınırlar
- Çıktı **koça** gider. Öğrenciye giden Kâmil cümlesi `deneme_analizi_karar` içinde
  şablondan üretilir; model metni öğrenciye hiç inmez.
- Koç onaylamadan (`deneme_analizi_karar('onayla')`) öğrenciye görev de mesaj da gitmez.
- `ANTHROPIC_API_KEY` tanımlı değilse fonksiyon `atlandi` döner; sistem kural
  katmanıyla çalışmaya devam eder. Bulgu şablon cümle olur.

## Ortam değişkenleri (Supabase → Edge Functions → Secrets)
- `ANTHROPIC_API_KEY` — zorunlu (yoksa atlanır)
- `ANTHROPIC_MODEL` — isteğe bağlı, varsayılan `claude-sonnet-4-6`

## Akış
1. `DenemeFormu` adım 2 (yanlış konuları) kaydedilince `deneme_analizi_hazirla(deneme_id)` çağrılır → taslak.
2. Ardından bu fonksiyon `{ analiz_id }` ile çağrılır → bulgu üstüne yazılır, `kaynak='ai'`.
3. Koç Bugün ekranında `AnalizKuyrugu` kartını görür; onaylar / siler.
4. Onayda seçili öneriler `gorevler`e, tek şablon cümle `kalem_olaylari`ne (`deneme_analizi`) yazılır.

Yetki: çağıran ya denemenin öğrencisi ya da koç/yönetici; rol veritabanından okunur.
