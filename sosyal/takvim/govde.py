"""Videoların gövdesi: konu başlığı -> 3 kısa satır (her biri ~3 sn ekranda).
Başlığa bağlı tutulur, tarihe değil: takvim kayarsa gövde konusuyla gider.
'Aynı Hafta' serisinde satırlar sırayla koç / öğrenci / koç mesajıdır.
Gövdesi yazılmamış gün üretilmez; iş akışı uyarı verip atlar."""

GOVDE = {
 # Özel günler
 "Dünya Ruh Sağlığı Günü": ["Kalp çarpıntısı, uykusuzluk, mide ağrısı: kaygı böyle konuşur.", "Güvendiğin bir yetişkine anlatmak ilk adım.", "Uzun sürüyorsa okul rehber öğretmeni ya da bir uzman."],
 "İlk deneme bir harita": ["Netin düşük çıkabilir. Olması gereken bu.", "Hangi derste kaç boş var? Haritan o.", "Bir sonraki denemeye tek hedef: +2 net."],
 # Pazar Akşamı
 "Pazar akşamı ağırlığı": ["Pazar akşamı herkesin göğsüne biraz ağırlık çöker.", "Yarının ilk işini şimdi yaz. Sadece ilkini.", "Sonra telefonu bırak, erken uyu."],
 "Haftayı kapat": ["Bu haftanın tek iyi şeyini yaz.", "Bir soruyu ilk kez yapmak da sayılır.", "Kötüleri değil, iyi olanı hatırla. Yarın ona eklersin."],
 "Mevsim değişimi": ["Hava değişince uyku ve enerji de değişir.", "Birkaç gün yavaş hissetmen normal.", "Planı küçült, ritmi koru. Bir haftada alışırsın."],
 "Kendine koç ol": ["Kötü bir günde kendine ne diyorsun?", "Aynı şeyi bir arkadaşına söyler miydin?", "Kendine onunla konuştuğun gibi konuş."],
 # Haftanın Planı
 "Haftayı üç işle başlat": ["Pazartesi 20 iş yazınca cuma 5'i biter.", "Bu hafta sadece 3 iş seç. Hepsine gün ve saat ver.", "Üçü de biterse, dördüncüyü o zaman ekle."],
 "Plan kâğıtta değil, takvimde": ["‘Matematik çalışacağım’ bir niyet.", "‘Salı 19:00, 40 problem’ bir plan.", "Her işe gün ve saat ver. Plan o zaman çalışır."],
 "Okul yoğun haftası": ["Yazılı haftası geldi. Önce yazılılar.", "YKS için her gün sadece 30 dakika: paragraf ve problem.", "Yazılılar bitince tam plana dön. Hiçbir şey kaybolmadı."],
 "Pazartesi sendromu": ["Pazartesi ağır geliyorsa, pazar akşamı plan yoktur.", "Pazar akşamı 10 dakika: haftanın 3 işi.", "Pazartesi sabahı düşünmezsin, başlarsın."],
 # Ders Taktiği
 "Paragrafta önce soru kökü": ["Önce soru kökünü oku: ne soruluyor?", "Sonra paragrafı o gözle oku.", "Aradığını bilerek okuyan daha hızlı bulur."],
 "Problemlerde tabloyu çiz": ["Kişiler satıra, zamanlar sütuna.", "Bugün, x yıl önce, y yıl sonra: üç sütun.", "Tablo dolunca denklem kendini yazar."],
 "Açıyı çizime yaz": ["Soruda verilen her açıyı şeklin üstüne yaz.", "Sonra üçgenlerin iç açılarını tamamla.", "Çoğu zaman aradığın açı kendiliğinden çıkar."],
 "Birimle kontrol et": ["Cevabın birimi ne olmalı? Önce onu yaz.", "Hız m/s ise, işlemin sonunda m/s çıkmalı.", "Birim tutmuyorsa formülü yanlış kurmuşsundur."],
 # Aynı Hafta (koç / öğrenci / koç)
 "Mezun yılı": ["Geçen yıl nerede takıldın, biliyor musun?", "Deneme stresi ve düzensizlik sanırım.", "O zaman bu yılın planı ikisine göre. Aynı yıl değil bu."],
 "Yeni başlıyorum": ["Erken değil. En rahat yıl şu an.", "Ne kadar çalışayım peki?", "Günde 1 saat yeter. Ama her gün. Önce TYT temeli."],
 "Okul yetişmiyor": ["Yazılı haftası YKS'yi durdurmaz, küçültür.", "Her gün ne kadar?", "30 dakika paragraf ve problem. Yazılılar bitince tam plan."],
 "Dün hiç çalışmadım": ["Hayır. İki katı yaparsan yarın da yorgun olursun.", "Peki ne yapayım?", "Bugünün planı ne ise o. Dün geçti, bugün sayılır."],
 # Veli Köşesi
 "LGS velisi": ["1. Her denemeden sonra sonuç sorgusu.", "2. Kardeşle, kuzenle kıyaslamak.", "3. Hafta sonunu tamamen derse ayırmak."],
 "Mezun öğrenci": ["Mezun yılında en büyük risk yalnızlık ve düzensizlik.", "Sabah kalkış saati sabit olsun, gün bir yapıya otursun.", "Haftada bir gün dışarı çıkmak ceza değil, bakım."],
 "Yazılı haftası": ["Yazılı haftasında önce okul.", "YKS'ye her gün kısa bir parça: 30 dakika.", "Yazılı notları OBP'ye girer. İkisi rakip değil."],
 "Kaç soru çözdün diye sormayın": ["‘Kaç soru?’ sorusu bir sınav gibi gelir.", "Onun yerine: ‘Bugün en zor ne vardı?’", "Cevap sorun anlatır. Soru sayısı anlatmaz."],
 # Doğru Bilinen Yanlışlar (gerçek)
 "11. sınıf erken": ["11. sınıf, konuları acele etmeden oturtacağın yıl.", "Günde 1 saat TYT temeli, 12. sınıfta sana aylar kazandırır.", "Erken başlayan yavaş gidebilir. Geç başlayan koşmak zorunda."],
 "Son sınıfta her şey biter": ["Son sınıf sıfırdan başlama yılı değil.", "11. sınıfta ne attıysan onun üstüne kurarsın.", "Hiçbir şey atmadıysan da geç değil: plan küçük, düzen sıkı."],
 "Çok saat = çok net": ["12 saat masada oturmak, 12 saat çalışmak değil.", "Odaklı 5 saat, dağınık 12 saati geçer.", "Saat değil, çözülen ve dönülen soru sayılır."],
 "Deneme her gün çözülür": ["Her gün deneme çözen analize vakit bulamaz.", "Eylül–mart haftada 1, nisandan sonra 2.", "Deneme ölçer. Asıl artış analizden gelir."],
 # Deneme Günü
 "İlk deneme": ["İlk denemenin neti seni tanımlamaz.", "Boş bıraktıkların konu eksiğin, yanlışların dikkat eksiğin.", "İkisini ayrı listele. Pazartesinin planı hazır."],
 "Deneme sabahı rutini": ["Deneme sabahı yeni bir şey deneme.", "Her zamanki kahvaltı, su, aynı kalem.", "Sınav sabahı da böyle olacak. Şimdiden alış."],
}
