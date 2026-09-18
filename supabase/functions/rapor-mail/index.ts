import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// ---------------------------------------------------------------
// Ortam degiskenleri (Supabase > Edge Functions > Secrets)
//
//  MAIL_SAGLAYICI       smtp | brevo | resend      (varsayilan: smtp)
//  MAIL_GONDEREN_ADRES  gonderen e-posta adresi
//  MAIL_GONDEREN_AD     gorunen ad (varsayilan: YKS Koclugu)
//
//  smtp icin:   SMTP_SUNUCU (vars. smtp.gmail.com)
//               SMTP_PORT   (vars. 465)
//               SMTP_KULLANICI
//               SMTP_SIFRE   <- Google uygulama sifresi (16 hane)
//  brevo icin:  BREVO_API_KEY
//  resend icin: RESEND_API_KEY
// ---------------------------------------------------------------

const SAGLAYICI = (Deno.env.get("MAIL_SAGLAYICI") ?? "smtp").toLowerCase();
const GONDEREN_ADRES = Deno.env.get("MAIL_GONDEREN_ADRES") ?? Deno.env.get("SMTP_KULLANICI") ?? "";
const GONDEREN_AD = Deno.env.get("MAIL_GONDEREN_AD") ?? "YKS Koclugu";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const URL_ = Deno.env.get("SUPABASE_URL")!;

const MAX_DENEME = 3;
const PARTI = 25;

const db = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });

// ----------------------------- yardimcilar -----------------------------

function kacir(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sureMetni(dk: number | null): string {
  const d = Number(dk ?? 0);
  if (d < 60) return `${d} dk`;
  const s = Math.floor(d / 60);
  const k = d % 60;
  return k ? `${s} sa ${k} dk` : `${s} sa`;
}

function tarihMetni(g: string | null): string {
  if (!g) return "-";
  const [y, a, gg] = String(g).slice(0, 10).split("-");
  return `${gg}.${a}.${y}`;
}

const TREND_METNI: Record<string, string> = {
  yukseliyor: "Yukselis egiliminde",
  sabit: "Istikrarli",
  dusuyor: "Dusus egiliminde",
};

function cerceve(baslik: string, ic: string): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${kacir(baslik)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.08);">
<tr><td style="background:#2563eb;padding:20px 24px;">
<div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.2px;">${kacir(baslik)}</div>
<div style="color:#c7dbff;font-size:12px;margin-top:4px;">YKS Koclugu</div>
</td></tr>
<tr><td style="padding:24px;color:#1f2937;font-size:14px;line-height:1.6;">${ic}</td></tr>
<tr><td style="padding:16px 24px;background:#fafbfc;border-top:1px solid #eef0f3;color:#8a94a6;font-size:11px;line-height:1.5;">
Bu e-posta YKS Koclugu platformu tarafindan otomatik olarak olusturulmustur.<br>
Rapor almayi birakmak icin kocunuzla iletisime gecebilirsiniz.
</td></tr>
</table></td></tr></table></body></html>`;
}

function kutu(etiket: string, deger: string, renk = "#2563eb"): string {
  return `<td width="33%" style="padding:4px;"><div style="background:#f8fafc;border:1px solid #eef0f3;border-radius:10px;padding:12px 10px;text-align:center;">
<div style="font-size:19px;font-weight:700;color:${renk};">${kacir(deger)}</div>
<div style="font-size:10px;color:#8a94a6;text-transform:uppercase;letter-spacing:.6px;margin-top:3px;">${kacir(etiket)}</div>
</div></td>`;
}

// ----------------------------- sablonlar -----------------------------

function veliSablonu(v: Record<string, any>): string {
  const trend = TREND_METNI[String(v.trend)] ?? "-";
  const devam = v.devam_yuzdesi == null ? "-" : `%${v.devam_yuzdesi}`;
  const ic = `
<p style="margin:0 0 4px;">Merhaba,</p>
<p style="margin:0 0 18px;color:#4b5563;">
<strong>${kacir(v.ogrenci_ad)}</strong> icin
${tarihMetni(v.hafta_baslangic)} - ${tarihMetni(v.hafta_bitis)} haftasinin ozeti asagidadir.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
${kutu("Program Devami", devam)}
${kutu("Calisma Suresi", sureMetni(v.toplam_dakika), "#7c3aed")}
${kutu("Gidisat", trend, "#059669")}
</tr></table>
<div style="background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 8px 8px 0;padding:14px 16px;">
<div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Koc Degerlendirmesi</div>
<div style="color:#374151;white-space:pre-wrap;">${kacir(v.koc_yorumu)}</div>
</div>
${v.yaklasan_deneme ? `<p style="margin:16px 0 0;color:#4b5563;">Yaklasan deneme: <strong>${tarihMetni(v.yaklasan_deneme)}</strong></p>` : ""}`;
  return cerceve("Haftalik Ogrenci Raporu", ic);
}

function kocSablonu(v: Record<string, any>, gunluk: boolean): string {
  const g = v.genel ?? {};
  const ogr: any[] = Array.isArray(v.ogrenciler) ? v.ogrenciler : [];
  const yuzde = g.tamamlama_yuzdesi == null ? "-" : `%${g.tamamlama_yuzdesi}`;

  const satirlar = ogr.length === 0
    ? `<tr><td colspan="4" style="padding:14px;text-align:center;color:#8a94a6;">Kayit yok</td></tr>`
    : ogr.map((o) => {
        const oran = o.yuzde == null ? "-" : `%${o.yuzde}`;
        const renk = o.dakika === 0 ? "#dc2626" : (o.yuzde != null && o.yuzde < 50 ? "#d97706" : "#059669");
        return `<tr style="border-top:1px solid #eef0f3;">
<td style="padding:10px 8px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${renk};margin-right:7px;"></span>${kacir(o.ad_soyad)}</td>
<td align="right" style="padding:10px 8px;color:#4b5563;">${sureMetni(o.dakika)}</td>
<td align="right" style="padding:10px 8px;color:#4b5563;">${o.gorev_tamam}/${o.gorev_toplam}</td>
<td align="right" style="padding:10px 8px;font-weight:600;color:${renk};">${oran}</td>
</tr>`;
      }).join("");

  const ic = `
<p style="margin:0 0 18px;color:#4b5563;">
${gunluk ? tarihMetni(v.bitis) : `${tarihMetni(v.baslangic)} - ${tarihMetni(v.bitis)}`} donemi ozeti.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
${kutu("Toplam Calisma", sureMetni(g.toplam_dakika))}
${kutu("Gorev", `${g.gorev_tamam ?? 0}/${g.gorev_toplam ?? 0}`, "#7c3aed")}
${kutu("Tamamlama", yuzde, "#059669")}
</tr></table>
<div style="font-size:11px;font-weight:700;color:#8a94a6;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Ogrenci Dagilimi</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border:1px solid #eef0f3;border-radius:10px;">
<tr style="background:#f8fafc;font-size:10px;color:#8a94a6;text-transform:uppercase;letter-spacing:.5px;">
<td style="padding:9px 8px;">Ogrenci</td>
<td align="right" style="padding:9px 8px;">Sure</td>
<td align="right" style="padding:9px 8px;">Gorev</td>
<td align="right" style="padding:9px 8px;">Oran</td>
</tr>${satirlar}</table>`;
  return cerceve(gunluk ? "Gunluk Koclum Raporu" : "Haftalik Koclum Raporu", ic);
}

// Tanitim sitesinden gelen tanisma basvurusu (Kivanc'a)
function basvuruSablonu(v: Record<string, any>): string {
  const tel = String(v.telefon_ham ?? "").replace(/\D/g, "");
  const satir = (e: string, d: string) =>
    `<tr><td style="padding:6px 0;color:#8a94a6;width:120px;">${kacir(e)}</td><td style="padding:6px 0;color:#1f2937;">${kacir(d)}</td></tr>`;
  const ic = `
<p style="margin:0 0 14px;color:#4b5563;">Siteden yeni bir tanışma başvurusu geldi.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:16px;">
${satir("Ad soyad", `${v.ad_soyad} (${v.dolduran})`)}
${satir("Telefon", v.telefon)}
${satir("Sınav", `${v.sinav} · ${v.sinif}`)}
${satir("Aranma zamanı", v.arama_zamani)}
</table>
${v.not ? `<div style="background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:16px;color:#374151;white-space:pre-wrap;">${kacir(v.not)}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:8px;"><a href="tel:+90${tel}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px;">Ara</a></td>
<td><a href="https://wa.me/90${tel}" style="display:inline-block;background:#1f8f4e;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px;">WhatsApp</a></td>
</tr></table>`;
  return cerceve("Yeni tanışma başvurusu", ic);
}

// Sosyal medyada kriz / istismar içerikli mesaj (Kivanc'a, aninda)
function sosyalAcilSablonu(v: Record<string, any>): string {
  const kaynak = `${v.platform === "youtube" ? "YouTube" : "Instagram"} ${v.tur === "dm" ? "mesajı" : "yorumu"}`;
  const tur = v.kategori === "istismar" ? "istismar" : "kriz";
  const ic = `
${v.deneme ? `<p style="margin:0 0 14px;padding:10px 12px;background:#fff7e6;border-radius:8px;color:#7a4f05;font-weight:700;">Bu bir deneme kaydıdır; gerçek bir mesaj değil.</p>` : ""}
<p style="margin:0 0 14px;color:#4b5563;">Bir ${kacir(kaynak)} ${tur} içeriği taşıyor. Sabit güvenli yanıt panelde onayını bekliyor.</p>
<p style="margin:0 0 6px;color:#8a94a6;font-size:12px;">${kacir(v.gonderen ?? "Gönderen adı yok")}</p>
<div style="background:#fde7e4;border-left:3px solid #c81e2e;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:18px;color:#1f2937;white-space:pre-wrap;">${kacir(v.mesaj)}</div>
<a href="https://khkocluk.com/yonetim#sosyal" style="display:inline-block;background:#c81e2e;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px;">Panelde aç</a>`;
  return cerceve("Acil: sosyal medya mesajı", ic);
}

function htmlUret(tip: string, veri: Record<string, any>): string {
  switch (tip) {
    case "veli_haftalik": return veliSablonu(veri);
    case "koc_gunluk": return kocSablonu(veri, true);
    case "koc_haftalik": return kocSablonu(veri, false);
    case "ogrenci_haftalik": return kocSablonu(veri, false);
    case "basvuru": return basvuruSablonu(veri);
    case "sosyal_acil": return sosyalAcilSablonu(veri);
    default: return cerceve("Rapor", "<p>Icerik uretilemedi.</p>");
  }
}

// ----------------------------- gonderim -----------------------------

let smtpIstemci: SMTPClient | null = null;

function smtpAl(): SMTPClient {
  if (smtpIstemci) return smtpIstemci;
  const kullanici = Deno.env.get("SMTP_KULLANICI");
  const sifre = Deno.env.get("SMTP_SIFRE");
  if (!kullanici || !sifre) throw new Error("SMTP_KULLANICI / SMTP_SIFRE tanimli degil");

  smtpIstemci = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_SUNUCU") ?? "smtp.gmail.com",
      port: Number(Deno.env.get("SMTP_PORT") ?? "465"),
      tls: true,
      auth: { username: kullanici, password: sifre.replace(/\s+/g, "") },
    },
  });
  return smtpIstemci;
}

async function smtpKapat() {
  if (smtpIstemci) {
    try { await smtpIstemci.close(); } catch { /* yoksay */ }
    smtpIstemci = null;
  }
}

async function mailAt(alici: string, ad: string, konu: string, html: string): Promise<string> {
  if (!GONDEREN_ADRES) throw new Error("MAIL_GONDEREN_ADRES tanimli degil");

  if (SAGLAYICI === "smtp") {
    const istemci = smtpAl();
    await istemci.send({
      from: `${GONDEREN_AD} <${GONDEREN_ADRES}>`,
      to: ad ? `${ad} <${alici}>` : alici,
      subject: konu,
      html,
      content: "Bu e-postayi goruntulemek icin HTML destekli bir istemci kullanin.",
    });
    return "smtp";
  }

  if (SAGLAYICI === "resend") {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${GONDEREN_AD} <${GONDEREN_ADRES}>`,
        to: [alici], subject: konu, html,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`resend ${r.status}: ${JSON.stringify(j)}`);
    return String(j.id ?? "");
  }

  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": Deno.env.get("BREVO_API_KEY") ?? "",
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: GONDEREN_AD, email: GONDEREN_ADRES },
      to: [{ email: alici, name: ad || alici }],
      subject: konu,
      htmlContent: html,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`brevo ${r.status}: ${JSON.stringify(j)}`);
  return String(j.messageId ?? "");
}

// ----------------------------- yetki -----------------------------

async function yetkiliMi(req: Request): Promise<boolean> {
  const basli = req.headers.get("Authorization") ?? "";
  const jeton = basli.replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return false;
  if (jeton === SERVICE_KEY) return true;

  try {
    const yuk = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (yuk.role === "service_role") return true;
    if (!yuk.sub) return false;
    const { data } = await db.from("profiller").select("rol").eq("id", yuk.sub).single();
    return data?.rol === "yonetici" || data?.rol === "koc";
  } catch {
    return false;
  }
}

// ----------------------------- giris -----------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const basliklar = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (!(await yetkiliMi(req))) {
    return new Response(JSON.stringify({ hata: "yetkisiz" }), { status: 403, headers: basliklar });
  }

  let govde: Record<string, any> = {};
  try { govde = await req.json(); } catch { /* bos govde normal */ }

  // Baglanti testi: { "test": true } govdesi ile tek deneme maili atar
  if (govde.test) {
    try {
      const hedef = String(govde.alici ?? GONDEREN_ADRES);
      await mailAt(hedef, "", "YKS Koclugu - Test Maili",
        cerceve("Test Maili", "<p>Mail altyapisi calisiyor. Bu bir baglanti testidir.</p>"));
      await smtpKapat();
      return new Response(JSON.stringify({ tamam: true, saglayici: SAGLAYICI, alici: hedef }), { headers: basliklar });
    } catch (e) {
      await smtpKapat();
      return new Response(JSON.stringify({ tamam: false, saglayici: SAGLAYICI, hata: String(e) }),
        { status: 500, headers: basliklar });
    }
  }

  const { data: kuyruk, error } = await db
    .from("mail_kuyrugu")
    .select("id, alici_id, alici_email, rapor_tipi, konu, veri, deneme")
    .in("durum", ["bekliyor", "hata"])
    .lt("deneme", MAX_DENEME)
    .lte("planlanan", new Date().toISOString())
    .order("planlanan", { ascending: true })
    .limit(PARTI);

  if (error) {
    return new Response(JSON.stringify({ hata: error.message }), { status: 500, headers: basliklar });
  }

  let basarili = 0;
  let basarisiz = 0;

  for (const kayit of kuyruk ?? []) {
    await db.from("mail_kuyrugu").update({ durum: "gonderiliyor" }).eq("id", kayit.id);

    try {
      let adres = kayit.alici_email as string | null;
      let ad = "";

      if (kayit.alici_id) {
        const { data: k } = await db.auth.admin.getUserById(kayit.alici_id);
        adres = adres ?? k?.user?.email ?? null;
        const { data: p } = await db.from("profiller").select("ad_soyad").eq("id", kayit.alici_id).single();
        ad = p?.ad_soyad ?? "";
      }
      if (!adres) throw new Error("alici e-posta adresi bulunamadi");

      const html = htmlUret(kayit.rapor_tipi, (kayit.veri ?? {}) as Record<string, any>);
      const saglayiciId = await mailAt(adres, ad, kayit.konu, html);

      await db.from("mail_kuyrugu").update({
        durum: "gonderildi",
        gonderildi_zaman: new Date().toISOString(),
        saglayici_id: saglayiciId,
        hata_mesaji: null,
        deneme: (kayit.deneme ?? 0) + 1,
      }).eq("id", kayit.id);
      basarili++;
    } catch (e) {
      await db.from("mail_kuyrugu").update({
        durum: "hata",
        hata_mesaji: String(e).slice(0, 500),
        deneme: (kayit.deneme ?? 0) + 1,
      }).eq("id", kayit.id);
      basarisiz++;
    }
  }

  await smtpKapat();

  return new Response(
    JSON.stringify({ islenen: kuyruk?.length ?? 0, basarili, basarisiz, saglayici: SAGLAYICI }),
    { headers: basliklar },
  );
});
