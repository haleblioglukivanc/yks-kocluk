# deneme-analizi

Deneme analizinin **bulgu metnini** yazar. Dağılım (bilgi / dikkat / süre) ve önerilen
görevler veritabanındaki kural katmanında (`deneme_analizi_hazirla`) hesaplanır; bu
fonksiyon yalnız koça dönük 2-3 cümlelik bulguyu modelden ister ve aynı satıra yazar.

## Sınırlar
- Çıktı **koça** gider. Öğrenciye giden Kâmil cümlesi `deneme_analizi_karar` içinde
  şablondan üretilir; model metni öğrenciye hiç inmez.
- Koç onaylamadan (`deneme_analizi_karar('onayla')`) öğrenciye görev de mesaj da gitmez.
- Sağlayıcı anahtarı tanımlı değilse fonksiyon `atlandi` döner; sistem kural
  katmanıyla çalışmaya devam eder. Bulgu şablon cümle olur.

## Sağlayıcı bağımsız
`AI_SAGLAYICI` ortam değişkeni seçer: `cloudflare` (varsayılan) | `gemini` | `groq` | `anthropic`.
İstek ve çıktı biçimi hepsinde aynı; sağlayıcı değişince kod değişmez.
Anahtar tanımlı değilse fonksiyon `atlandi` döner, kural katmanı çalışmaya devam eder.

## Ortam değişkenleri (Supabase → Edge Functions → Secrets)
| Sağlayıcı | Gerekli | Varsayılan model |
|---|---|---|
| cloudflare | `CF_ACCOUNT_ID`, `CF_API_TOKEN` (Workers AI → Read) | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| gemini | `GEMINI_API_KEY` | `gemini-2.5-flash-lite` |
| groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` |
| anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` |

`AI_MODEL` ile model üstüne yazılır. Cloudflare seçildi: hesap zaten var,
Workers AI günlük ücretsiz hakkı (10.000 neuron) bizim hacmin çok üstünde.

## Gizlilik
Modele giden veri: ders adı, konu adı, doğru/yanlış/boş sayıları, konunun
öğrencideki durumu. Öğrenci adı, kimliği, koç bilgisi **gönderilmez**.

## Akış
1. `DenemeFormu` adım 2 (yanlış konuları) kaydedilince `deneme_analizi_hazirla(deneme_id)` çağrılır → taslak.
2. Ardından bu fonksiyon `{ analiz_id }` ile çağrılır → bulgu üstüne yazılır, `kaynak='ai'`.
3. Koç Bugün ekranında `AnalizKuyrugu` kartını görür; onaylar / siler.
4. Onayda seçili öneriler `gorevler`e, tek şablon cümle `kalem_olaylari`ne (`deneme_analizi`) yazılır.

Yetki: çağıran ya denemenin öğrencisi ya da koç/yönetici; rol veritabanından okunur.
