# karne-oku

Deneme karnesinin fotoğrafından ya da PDF'inden ders bazlı doğru/yanlış/boş
sayılarını çıkarır. Kaynak kod Supabase'de dağıtılmış sürümdedir
(`supabase functions download karne-oku` ile alınabilir).

## Kural

Model hiçbir şey kaydetmez. Okuduğunu `karne_yuklemeleri.cikti` alanına yazar;
koç deneme formunda görür, sayıları kontrol eder ve kaydı kendisi yapar.

## Sağlayıcı sırası

Görme yeteneğine göre: `gemini` → `anthropic` → `cloudflare`. Anahtarı
tanımlı olmayan sağlayıcı atlanır. `AI_KARNE_SAGLAYICI` ile tek sağlayıcı
zorlanabilir, `AI_KARNE_MODEL` ile model değiştirilebilir.

Cloudflare'in görme modeli PDF okumaz; PDF için Gemini ya da Anthropic
anahtarı gerekir. Ayrıca bu modeller tek seferlik kullanım onayı ister —
fonksiyon 403 alınca `agree` gönderip isteği tekrarlar.

## Neden üç ayrı ayıklayıcı var

Küçük görme modelleri JSON istense de düz metin döndürüyor ve aynı görüntüde
her seferinde başka biçim verebiliyor: bir seferinde
`Türkçe: 30 doğru, 6 yanlış, 4 boş`, bir seferinde ders adı üstte, altında
`Doğru: 30` satırları. Bunu istem yazarak çözmek güvenilir olmadı. Bu yüzden
sayılar biçimden bağımsız okunuyor: önce JSON, tutmazsa satır biçimi, o da
tutmazsa blok biçimi. Ayıklama yine tutmazsa aynı sağlayıcı bir kez daha
denenir.

Dikkat: "Tarih" hem bir TYT dersi hem de karne başlığında geçen bir kelime.
Atlanacak kelimeler listesinde bu yüzden yok; tarih satırı zaten sayı
kalıbına uymadığı için kendiliğinden eleniyor.

## Ders eşleştirme

`karne_eslestir` RPC'si karnedeki ders adını öğrencinin kataloğundaki derse
bağlar. Tam eşleşme yoksa içerme aranır ("Temel Matematik" → "Matematik").
E�leşmeyen satır düşmez; formda "şunları eşleştiremedim" diye gösterilir.
