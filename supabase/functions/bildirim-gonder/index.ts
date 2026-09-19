import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

/* Anlık bildirim göndericisi (19 Eylül 2026'da yeniden yazıldı).

   Kuyruk: public.bildirim_kuyrugu. Yalnız anlik=true satırlar buraya gelir;
   hangi olayın telefona gideceği tek yerde karar verilir: private.anlik_mi.
   Cron (her dakika) ve private.bildirim_ekle, bekleyen varsa bu fonksiyonu
   private.bildirim_gondericiyi_durt() ile çağırır.

   Her satır için alıcının bütün cihazlarına gider. Yükte ikon rakamı da
   var (rozet): uygulamadaki rozetle aynı hesap, public.bildirim_rozet.
   Süresi geçmiş satır (ör. dersi başlamış "15 dk sonra") gönderilmez.
   404/410 dönen cihaz silinir; 3 denemede gidemeyen satır günlüğe düşer. */

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY, { auth: { persistSession: false } });
const PARTI = 50;
const MAX_DENEME = 3;
const JSON_BASLIK = { "Content-Type": "application/json" };

const cevap = (govde: unknown, status = 200) =>
  new Response(JSON.stringify(govde), { status, headers: JSON_BASLIK });

function yetkiliMi(req: Request): boolean {
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return false;
  if (jeton === SERVICE_KEY) return true;
  try {
    const yuk = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return yuk.role === "service_role";
  } catch {
    return false;
  }
}

async function gunluk(mesaj: string, ayrinti: unknown = null, seviye = "hata") {
  try {
    await db.rpc("bildirim_gunluk_yaz", { p_mesaj: mesaj, p_seviye: seviye, p_ayrinti: ayrinti });
  } catch { /* günlük yazılamazsa gönderim durmasın */ }
}

const guncelle = (id: number, alanlar: Record<string, unknown>) =>
  db.from("bildirim_kuyrugu").update(alanlar).eq("id", id);

Deno.serve(async (req: Request) => {
  if (!yetkiliMi(req)) return cevap({ hata: "yetkisiz" }, 403);

  const { data: vapid, error: vHata } = await db.rpc("bildirim_vapid_al");
  if (vHata || !vapid?.genel || !vapid?.ozel) {
    await gunluk("VAPID anahtarları okunamadı: " + (vHata?.message ?? "boş"));
    return cevap({ hata: "vapid" }, 500);
  }
  webpush.setVapidDetails("mailto:haleblioglukivanc@gmail.com", vapid.genel, vapid.ozel);

  const simdi = new Date();
  const { data: kuyruk, error } = await db
    .from("bildirim_kuyrugu")
    .select("id, alici_id, tip, baslik, govde, yol, deneme, son_gecerlilik")
    .eq("anlik", true)
    .in("durum", ["bekliyor", "hata"])
    .lt("deneme", MAX_DENEME)
    .lte("planlanan", simdi.toISOString())
    .order("planlanan", { ascending: true })
    .limit(PARTI);
  if (error) {
    await gunluk("Kuyruk okunamadı: " + error.message);
    return cevap({ hata: error.message }, 500);
  }

  const ozet = { islenen: kuyruk?.length ?? 0, gonderildi: 0, eskidi: 0, cihazYok: 0, hatali: 0, silinenCihaz: 0 };

  for (const k of kuyruk ?? []) {
    if (k.son_gecerlilik && new Date(k.son_gecerlilik) <= simdi) {
      await guncelle(k.id, { durum: "eskidi" });
      ozet.eskidi++;
      continue;
    }
    await guncelle(k.id, { durum: "gonderiliyor" });

    const { data: cihazlar } = await db
      .from("bildirim_abonelikleri")
      .select("id, endpoint, p256dh, auth, hata_sayisi")
      .eq("profil_id", k.alici_id);
    if (!cihazlar?.length) {
      await guncelle(k.id, { durum: "cihaz_yok", deneme: k.deneme + 1 });
      ozet.cihazYok++;
      continue;
    }

    const { data: rozet } = await db.rpc("bildirim_rozet", { p_alici: k.alici_id });
    const yuk = JSON.stringify({
      id: k.id, tip: k.tip, baslik: k.baslik, govde: k.govde ?? "", yol: k.yol || "/",
      rozet: typeof rozet === "number" ? rozet : null,
    });
    // Zamana bağlı bildirim vakti geçince telefonda da bekletilmesin
    const ttl = k.son_gecerlilik
      ? Math.max(60, Math.floor((new Date(k.son_gecerlilik).getTime() - simdi.getTime()) / 1000))
      : 60 * 60 * 12;
    const aciliyet = k.tip === "gorusme" || k.tip === "ders_yaklasiyor" ? "high" : "normal";

    let basari = 0;
    const hatalar: string[] = [];
    for (const c of cihazlar) {
      try {
        await webpush.sendNotification(
          { endpoint: c.endpoint, keys: { p256dh: c.p256dh, auth: c.auth } },
          yuk,
          { TTL: ttl, urgency: aciliyet },
        );
        basari++;
        await db.from("bildirim_abonelikleri")
          .update({ son_kullanim: simdi.toISOString(), hata_sayisi: 0 }).eq("id", c.id);
      } catch (e: any) {
        const kod = Number(e?.statusCode ?? 0);
        if (kod === 404 || kod === 410) {
          // Telefonun bildirim servisi aboneliği artık tanımıyor. Kayıt silinir;
          // uygulama bir sonraki açılışta yenisini alır (bildirimKaydiniTazele).
          await db.from("bildirim_abonelikleri").delete().eq("id", c.id);
          ozet.silinenCihaz++;
          await gunluk("Ölü cihaz aboneliği silindi", { kod, profil: k.alici_id, servis: new URL(c.endpoint).host }, "bilgi");
        } else {
          hatalar.push(`${kod}: ${String(e?.body ?? e?.message ?? e).slice(0, 120)}`);
          await db.from("bildirim_abonelikleri").update({ hata_sayisi: (c.hata_sayisi ?? 0) + 1 }).eq("id", c.id);
        }
      }
    }

    if (basari > 0) {
      await guncelle(k.id, { durum: "gonderildi", gonderildi: simdi.toISOString(), deneme: k.deneme + 1, hata_mesaji: null });
      ozet.gonderildi++;
    } else if (hatalar.length === 0) {
      await guncelle(k.id, { durum: "cihaz_yok", deneme: k.deneme + 1 });
      ozet.cihazYok++;
    } else {
      await guncelle(k.id, { durum: "hata", deneme: k.deneme + 1, hata_mesaji: hatalar.join(" | ").slice(0, 500) });
      ozet.hatali++;
      if (k.deneme + 1 >= MAX_DENEME) {
        await gunluk("Bildirim 3 denemede gönderilemedi", { kuyruk_id: k.id, tip: k.tip, hata: hatalar[0] });
      }
    }
  }

  return cevap(ozet);
});
