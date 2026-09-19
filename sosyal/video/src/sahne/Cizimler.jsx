// Metafor çizimleri — kendi çizimimiz (telif yok), tek dil:
// kalın mürekkep çizgi + arkasında biraz kaymış renk dolgusu (baskı kayması).
// Her parça: d = yol, kay = kaymış dolgu rengi, ic = yerinde dolgu rengi,
// cizgi: false = yalnız dolgu. Renkler P anahtarı ya da 'dolgu' (zeminin dolgu rengi).
import { P, ara, tohumla } from './ortak.js'

export const CIZIM = {
  pil: { vb: '0 0 300 190', parca: [
    { d: 'M20 30 h180 a20 20 0 0 1 20 20 v90 a20 20 0 0 1 -20 20 h-180 a20 20 0 0 1 -20 -20 v-90 a20 20 0 0 1 20 -20 z', kay: 'dolgu' },
    { d: 'M220 72 h18 v46 h-18' },
    { d: 'M40 50 h26 a8 8 0 0 1 8 8 v74 a8 8 0 0 1 -8 8 h-26 a8 8 0 0 1 -8 -8 v-74 a8 8 0 0 1 8 -8 z', ic: 'seftali' },
    { d: 'M138 52 l-24 44 h30 l-24 44' },
    { d: 'M262 20 l10 -10 M270 38 h14 M258 6 v-4', w: 4 },
  ] },
  dugum: { vb: '0 0 320 150', parca: [
    { d: 'M110 75 m-62 0 a62 62 0 1 0 124 0 a62 62 0 1 0 -124 0', ic: 'seftali', cizgi: false },
    { d: 'M6 90 c30 0 40 -60 74 -60 c34 0 30 46 0 58 c-28 12 -46 -28 -18 -40 c28 -12 46 28 22 46 c-18 14 -40 -6 -24 -30 c22 -30 60 6 250 6' },
    { d: 'M290 54 l24 16 l-24 16' },
  ] },
  'buyutec-kitap': { vb: '0 0 320 240', parca: [
    { d: 'M24 62 q64 -26 132 10 v150 q-66 -32 -132 -8 z', kay: 'dolgu' },
    { d: 'M156 72 q66 -36 132 -10 v152 q-66 -24 -132 8 z', kay: 'dolgu' },
    { d: 'M50 100 q40 -10 80 6 M50 132 q40 -10 80 6 M50 164 q30 -8 60 2', w: 4 },
    { d: 'M182 100 q40 -16 80 -6', w: 4 },
    { d: 'M232 150 m-46 0 a46 46 0 1 0 92 0 a46 46 0 1 0 -92 0', ic: 'krem' },
    { d: 'M266 184 l40 40' },
    { d: 'M220 136 q0 -16 14 -16 q14 0 14 14 q0 10 -12 14 v10 M236 176 v1', w: 5 },
  ] },
  'kavanoz-yildiz': { vb: '0 0 260 300', parca: [
    { d: 'M70 70 h120 v22 h-120 z', ic: 'amber' },
    { d: 'M78 92 q-34 20 -34 70 v88 a26 26 0 0 0 26 26 h120 a26 26 0 0 0 26 -26 v-88 q0 -50 -34 -70', kay: 'dolgu' },
    { d: 'M130 170 l14 28 l30 4 l-22 21 l6 30 l-28 -15 l-28 15 l6 -30 l-22 -21 l30 -4 z', ic: 'amber' },
    { d: 'M214 30 v26 M201 43 h26 M36 40 v18 M27 49 h18', w: 4 },
  ] },
  'ev-kalp': { vb: '0 0 260 240', parca: [
    { d: 'M30 110 l100 -86 l100 86 v108 h-200 z', kay: 'dolgu' },
    { d: 'M130 180 c-40 -26 -52 -46 -40 -64 c10 -14 30 -12 40 4 c10 -16 30 -18 40 -4 c12 18 0 38 -40 64 z', ic: 'seftali' },
    { d: 'M186 64 v-34 h24 v54', w: 5 },
  ] },
  'ay-bulut': { vb: '0 0 300 230', parca: [
    { d: 'M150 30 a70 70 0 1 0 70 90 a56 56 0 1 1 -70 -90 z', ic: 'limon' },
    { d: 'M60 200 a30 30 0 0 1 8 -58 a40 40 0 0 1 74 -8 a32 32 0 0 1 36 66 z', kay: 'dolgu' },
    { d: 'M240 40 h22 l-22 24 h22 M266 86 h14 l-14 16 h14', w: 4 },
  ] },
  'telefon-kilit': { vb: '0 0 240 300', parca: [
    { d: 'M60 20 h110 a20 20 0 0 1 20 20 v220 a20 20 0 0 1 -20 20 h-110 a20 20 0 0 1 -20 -20 v-220 a20 20 0 0 1 20 -20 z', kay: 'dolgu' },
    { d: 'M100 44 h30', w: 5 },
    { d: 'M84 150 h62 a6 6 0 0 1 6 6 v48 a6 6 0 0 1 -6 6 h-62 a6 6 0 0 1 -6 -6 v-48 a6 6 0 0 1 6 -6 z', ic: 'amber' },
    { d: 'M96 150 v-18 a19 19 0 0 1 38 0 v18' },
    { d: 'M115 172 v16', w: 6 },
    { d: 'M206 70 l14 -10 M210 100 h16', w: 4 },
  ] },
  'kum-saati': { vb: '0 0 220 300', parca: [
    { d: 'M78 92 q32 22 64 0 q-12 30 -32 52 q-20 -22 -32 -52 z', ic: 'seftali', cizgi: false },
    { d: 'M66 262 q44 -56 88 0 z', ic: 'seftali', cizgi: false },
    { d: 'M56 30 c0 70 54 90 54 120 c0 30 -54 50 -54 120 h108 c0 -70 -54 -90 -54 -120 c0 -30 54 -50 54 -120', kay: 'dolgu' },
    { d: 'M36 30 h148 M36 270 h148', w: 8 },
    { d: 'M110 152 v84', w: 3 },
  ] },
  kronometre: { vb: '0 0 260 280', parca: [
    { d: 'M34 160 a96 96 0 1 0 192 0 a96 96 0 1 0 -192 0', kay: 'dolgu' },
    { d: 'M130 160 v-80 a80 80 0 0 1 69 40 z', ic: 'seftali', cizgi: false },
    { d: 'M110 38 h40 M130 38 v26 M206 86 l18 -18' },
    { d: 'M130 160 v-62 M130 160 l38 24' },
  ] },
  takvim: { vb: '0 0 280 260', parca: [
    { d: 'M30 50 h220 a14 14 0 0 1 14 14 v166 a14 14 0 0 1 -14 14 h-220 a14 14 0 0 1 -14 -14 v-166 a14 14 0 0 1 14 -14 z', kay: 'dolgu' },
    { d: 'M16 100 h248 M80 28 v38 M200 28 v38' },
    { d: 'M62 142 h1 M112 142 h1 M162 142 h1 M212 142 h1 M62 192 h1 M112 192 h1 M212 192 h1', w: 12 },
    { d: 'M138 192 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0', ic: 'amber' },
  ] },
  merdiven: { vb: '0 0 300 240', parca: [
    { d: 'M20 220 h60 v-50 h60 v-50 h60 v-50 h60 v-50 v200 z', kay: 'dolgu', cizgi: false },
    { d: 'M20 220 h60 v-50 h60 v-50 h60 v-50 h60 v-50' },
    { d: 'M96 102 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0', ic: 'amber' },
    { d: 'M78 104 h-22 M82 86 h-14', w: 4 },
  ] },
  pusula: { vb: '0 0 260 260', parca: [
    { d: 'M30 130 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0', kay: 'dolgu' },
    { d: 'M108 130 l22 -78 l22 78 z', ic: 'seftali' },
    { d: 'M108 130 l22 78 l22 -78 z', ic: 'krem' },
    { d: 'M130 38 v12 M130 210 v12 M38 130 h12 M210 130 h12', w: 4 },
  ] },
  'dag-bayrak': { vb: '0 0 320 240', parca: [
    { d: 'M10 225 l110 -150 l50 60 l40 -40 l100 130 z', kay: 'dolgu' },
    { d: 'M92 113 l28 -38 l28 38 l-14 10 l-14 -10 l-14 10 z', ic: 'krem', w: 4 },
    { d: 'M120 14 l46 15 l-46 15 z', ic: 'amber' },
    { d: 'M120 75 v-62' },
  ] },
  filiz: { vb: '0 0 240 260', parca: [
    { d: 'M60 170 h120 l-16 70 h-88 z', kay: 'dolgu' },
    { d: 'M50 170 h140 M120 170 v-84' },
    { d: 'M120 124 c-40 0 -62 -30 -62 -62 c36 0 62 22 62 62 z', ic: 'nane' },
    { d: 'M120 102 c30 -4 56 -30 56 -60 c-34 0 -56 26 -56 60 z', ic: 'nane' },
    { d: 'M204 150 v20 M194 160 h20', w: 4 },
  ] },
  'kalem-silgi': { vb: '0 0 320 220', parca: [
    { d: 'M40 130 L210 40 L232 80 L62 170 Z', kay: 'dolgu' },
    { d: 'M40 130 L16 188 L62 170', ic: 'krem' },
    { d: 'M210 40 L232 80 L256 68 L234 28 Z', ic: 'seftali' },
    { d: 'M110 206 q20 -12 40 0 t40 0 t40 0', w: 4 },
  ] },
  kahve: { vb: '0 0 260 260', parca: [
    { d: 'M50 110 h140 v60 a56 56 0 0 1 -56 56 h-28 a56 56 0 0 1 -56 -56 z', kay: 'dolgu' },
    { d: 'M190 124 h14 a26 26 0 0 1 0 52 h-18' },
    { d: 'M92 92 q-14 -20 0 -40 t0 -40 M134 92 q-14 -20 0 -40 t0 -40', w: 5 },
    { d: 'M30 244 h180' },
  ] },
  ampul: { vb: '0 0 240 290', parca: [
    { d: 'M120 30 a80 80 0 0 1 48 144 v24 h-96 v-24 a80 80 0 0 1 48 -144 z', ic: 'limon' },
    { d: 'M84 212 h72 M90 234 h60 M104 256 h32' },
    { d: 'M100 150 l10 -30 l10 20 l10 -20 l10 30', w: 4 },
    { d: 'M14 96 h22 M204 96 h22 M44 30 l14 14 M196 30 l-14 14', w: 5 },
  ] },
  'bulut-yagmur': { vb: '0 0 300 250', parca: [
    { d: 'M210 64 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0', ic: 'amber' },
    { d: 'M70 146 a40 40 0 0 1 12 -78 a56 56 0 0 1 104 -10 a44 44 0 0 1 44 88 z', kay: 'dolgu' },
    { d: 'M100 176 l-10 26 M150 176 l-10 26 M200 176 l-10 26 M125 216 l-8 20 M175 216 l-8 20', w: 5 },
  ] },
  gunes: { vb: '0 0 260 260', parca: [
    { d: 'M72 130 a58 58 0 1 0 116 0 a58 58 0 1 0 -116 0', kay: 'dolgu' },
    { d: 'M72 130 a58 58 0 1 0 116 0 a58 58 0 1 0 -116 0', ic: 'amber' },
    { d: 'M130 26 v30 M130 204 v30 M26 130 h30 M204 130 h30 M56 56 l20 20 M184 184 l20 20 M204 56 l-20 20 M56 204 l20 -20' },
  ] },
  terazi: { vb: '0 0 300 250', parca: [
    { d: 'M150 40 v182 M100 232 h100' },
    { d: 'M50 74 L250 50' },
    { d: 'M20 144 q30 32 60 0 z', ic: 'seftali' },
    { d: 'M220 120 q30 32 60 0 z', ic: 'nane' },
    { d: 'M50 74 l-30 70 M50 74 l30 70 M250 50 l-30 70 M250 50 l30 70', w: 4 },
  ] },
  ayna: { vb: '0 0 220 300', parca: [
    { d: 'M110 130 m-80 0 a80 106 0 1 0 160 0 a80 106 0 1 0 -160 0', kay: 'dolgu' },
    { d: 'M110 130 m-60 0 a60 84 0 1 0 120 0 a60 84 0 1 0 -120 0', ic: 'krem' },
    { d: 'M80 96 q10 -30 34 -40 M74 122 q4 -10 10 -16', w: 5 },
    { d: 'M110 236 v44 M74 290 h72' },
  ] },
  zarf: { vb: '0 0 300 230', parca: [
    { d: 'M20 60 h260 v150 h-260 z', kay: 'dolgu' },
    { d: 'M20 60 l130 90 l130 -90' },
    { d: 'M150 176 c-20 -14 -26 -24 -20 -32 c6 -8 16 -6 20 2 c4 -8 14 -10 20 -2 c6 8 0 18 -20 32 z', ic: 'seftali' },
    { d: 'M258 30 l14 -12 M276 48 h16', w: 4 },
  ] },
  'hedef-tahtasi': { vb: '0 0 280 260', parca: [
    { d: 'M30 146 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0', kay: 'dolgu' },
    { d: 'M66 146 a64 64 0 1 0 128 0 a64 64 0 1 0 -128 0', ic: 'krem' },
    { d: 'M102 146 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0', ic: 'seftali' },
    { d: 'M130 146 L252 30 M238 32 l16 -4 l-4 16 M252 30 l16 -4 M252 30 l-4 16', w: 6 },
  ] },
  tabela: { vb: '0 0 280 280', parca: [
    { d: 'M140 36 v224 M100 268 h80' },
    { d: 'M140 56 h100 l30 26 l-30 26 h-100 z', ic: 'nane' },
    { d: 'M140 128 h-100 l-30 26 l30 26 h100 z', ic: 'seftali' },
    { d: 'M160 82 h50 M70 154 h50', w: 4 },
  ] },
  kulaklik: { vb: '0 0 280 260', parca: [
    { d: 'M50 164 v-34 a90 90 0 0 1 180 0 v34' },
    { d: 'M30 150 h40 v84 h-40 a10 10 0 0 1 -10 -10 v-64 a10 10 0 0 1 10 -10 z', kay: 'dolgu' },
    { d: 'M210 150 h40 a10 10 0 0 1 10 10 v64 a10 10 0 0 1 -10 10 h-40 z', kay: 'dolgu' },
    { d: 'M140 104 v42 a11 11 0 1 1 -11 -11 M140 104 l24 -8', w: 5 },
  ] },
  yaprak: { vb: '0 0 260 260', parca: [
    { d: 'M40 222 C40 110 110 40 232 30 C222 150 150 222 40 222 z', kay: 'dolgu' },
    { d: 'M40 222 L200 62 M92 170 l-10 -40 M92 170 l40 0 M142 120 l-6 -40 M142 120 l40 -2', w: 4 },
    { d: 'M212 172 q20 10 20 34 q-20 -6 -20 -34 z', ic: 'seftali' },
  ] },
  'kar-tanesi': { vb: '0 0 260 260', parca: [
    { d: 'M98 130 a32 32 0 1 0 64 0 a32 32 0 1 0 -64 0', ic: 'gok' },
    { d: 'M130 26 v208 M40 78 l180 104 M40 182 l180 -104' },
    { d: 'M130 58 l-18 -18 M130 58 l18 -18 M130 202 l-18 18 M130 202 l18 18 M68 94 l-26 4 M192 166 l26 -4 M68 166 l-26 -4 M192 94 l26 4', w: 5 },
  ] },
  bayrak: { vb: '0 0 300 260', parca: [
    { d: 'M50 34 q60 -24 120 0 t120 0 v112 q-60 -24 -120 0 t-120 0 z', ic: '#D9383F' },
    { d: 'M128 64 a32 32 0 1 0 24 52 a26 26 0 1 1 -24 -52 z', ic: 'krem', cizgi: false },
    { d: 'M168 80 l5 11 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8 l12 -1 z', ic: 'krem', cizgi: false },
    { d: 'M50 252 v-230' },
  ] },
  'kitap-yigini': { vb: '0 0 280 240', parca: [
    { d: 'M40 190 h200 v36 h-200 z', ic: 'seftali' },
    { d: 'M60 150 h170 v40 h-170 z', ic: 'nane' },
    { d: 'M30 112 h190 v38 h-190 z', ic: 'gok' },
    { d: 'M70 104 l150 -40 l10 36 l-150 40 z', ic: 'limon' },
    { d: 'M200 190 v36 M92 150 v40 M190 112 v38', w: 4 },
  ] },
  'kalp-atisi': { vb: '0 0 300 230', parca: [
    { d: 'M150 206 c-80 -50 -110 -90 -86 -130 c20 -32 64 -30 86 4 c22 -34 66 -36 86 -4 c24 40 -6 80 -86 130 z', kay: 'dolgu' },
    { d: 'M14 112 h76 l16 -34 l24 70 l18 -52 l12 16 h146', w: 6 },
  ] },
  'grafik-cubuk': { vb: '0 0 300 240', parca: [
    { d: 'M60 220 v-50 h36 v50 z', ic: 'seftali' },
    { d: 'M120 220 v-90 h36 v90 z', ic: 'nane' },
    { d: 'M180 220 v-70 h36 v70 z', ic: 'gok' },
    { d: 'M240 220 v-150 h36 v150 z', ic: 'amber' },
    { d: 'M30 20 v200 h262' },
    { d: 'M60 140 l60 -40 l50 26 l90 -96 M242 28 h20 v20', w: 4 },
  ] },
  optik: { vb: '0 0 270 300', parca: [
    { d: 'M40 20 h190 v260 h-190 z', kay: 'dolgu' },
    { d: 'M64 70 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M104 70 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M144 70 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M184 70 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M64 120 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M104 120 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M144 120 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M184 120 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M64 170 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M104 170 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M144 170 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M184 170 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M64 220 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M104 220 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M144 220 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M184 220 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0', w: 3 },
    { d: 'M104 70 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M64 120 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M184 170 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M144 220 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0', ic: 'murekkep', w: 3 },
    { d: 'M20 250 l40 -10 M14 230 l30 -4', w: 4 },
  ] },
  roket: { vb: '0 0 240 300', parca: [
    { d: 'M100 204 q20 80 20 80 q0 0 20 -80 z', ic: 'amber' },
    { d: 'M120 20 c40 30 50 90 40 184 h-80 c-10 -94 0 -154 40 -184 z', kay: 'dolgu' },
    { d: 'M100 100 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', ic: 'gok' },
    { d: 'M82 172 l-32 44 l36 -8 M158 172 l32 44 l-36 -8' },
  ] },
  'dusunce-balonu': { vb: '0 0 300 250', parca: [
    { d: 'M60 30 h180 a40 40 0 0 1 40 40 v60 a40 40 0 0 1 -40 40 h-120 l-44 44 v-44 h-16 a40 40 0 0 1 -40 -40 v-60 a40 40 0 0 1 40 -40 z', kay: 'dolgu' },
    { d: 'M108 100 h1 M150 100 h1 M192 100 h1', w: 16 },
  ] },
  damla: { vb: '0 0 300 250', parca: [
    { d: 'M150 20 c-20 34 -32 50 -32 66 a32 32 0 0 0 64 0 c0 -16 -12 -32 -32 -66 z', ic: 'gok' },
    { d: 'M40 196 a110 34 0 1 0 220 0 a110 34 0 1 0 -220 0', kay: 'gok' },
    { d: 'M80 196 q16 -10 32 0 t32 0 M170 206 q16 -10 32 0 t32 0', w: 4 },
  ] },
}

const renk = (k, zemin) => (k === 'dolgu' ? zemin.dolgu : P[k] || k)

// bas > 0: o karede kalemle çizilir. bas = 0: ilk karede tam çizili durur (kapak kuralı).
export function Cizim({ ad, f, gen, zemin, bas = 0, kalem = 6, suz = true, style }) {
  const c = CIZIM[ad]
  if (!c) return null
  const [, , w, h] = c.vb.split(' ').map(Number)
  const n = c.parca.length
  const toplam = bas <= 0 ? 1 : ara(f, bas, bas + 36)
  const zipla = suz ? Math.sin(Math.min(f, 24) / 24 * Math.PI) * 0.05 : 0   // 0. karede 0: kapak aynı kalır
  const oynat = suz ? `translateY(${Math.sin(f / 26) * 8}px) rotate(${Math.sin(f / 44) * 1.2}deg) scale(${1 + zipla})` : ''
  const mur = zemin.koyu ? P.krem : P.murekkep
  return <svg viewBox={c.vb} width={gen} height={(gen * h) / w} fill="none" strokeLinecap="round" strokeLinejoin="round"
    style={{ overflow: 'visible', transform: oynat, ...style }}>
    {c.parca.map((p, i) => {
      const q = Math.max(0, Math.min(1, toplam * n * 0.75 - i * 0.55))
      return <g key={i}>
        {p.kay && <path d={p.d} fill={renk(p.kay, zemin)} transform="translate(10 10)" opacity={q} />}
        {p.ic && <path d={p.d} fill={renk(p.ic, zemin)} opacity={q} />}
        {p.cizgi !== false && <path d={p.d} stroke={mur} strokeWidth={p.w ?? kalem} pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - q} />}
      </g>
    })}
  </svg>
}

// Arka plan süsleri: her gün farklı. Güne özel tohumla seçilir — kaç tane (bazı günler hiç),
// hangi iki şekil ailesi, nerede, hangi renkte. Yalnız içeriğin olmadığı boşluklara düşer,
// birbirine yaklaşmaz. Böylece hiçbir iki video aynı "süs kalıbından" çıkmış gibi durmaz.
const SEKIL = {
  arti: (x, y, b) => `M${x - b} ${y} h${2 * b} M${x} ${y - b} v${2 * b}`,
  carpi: (x, y, b) => `M${x - b * 0.7} ${y - b * 0.7} l${b * 1.4} ${b * 1.4} M${x + b * 0.7} ${y - b * 0.7} l${-b * 1.4} ${b * 1.4}`,
  kivilcim: (x, y, b) => `M${x} ${y - b} v${b * 0.6} M${x + b} ${y - b * 0.2} h${-b * 0.6} M${x - b * 0.8} ${y - b * 0.6} l${b * 0.45} ${b * 0.4}`,
  dalga: (x, y, b) => `M${x - b * 1.6} ${y} q${b * 0.4} ${-b * 0.7} ${b * 0.8} 0 t${b * 0.8} 0 t${b * 0.8} 0 t${b * 0.8} 0`,
  yay: (x, y, b) => `M${x - b} ${y + b * 0.4} q${b} ${-b * 1.4} ${b * 2} 0`,
  yildiz: (x, y, b) => `M${x} ${y - b} q${b * 0.15} ${b * 0.85} ${b} ${b} q${-b * 0.85} ${b * 0.15} ${-b} ${b} q${-b * 0.15} ${-b * 0.85} ${-b} ${-b} q${b * 0.85} ${-b * 0.15} ${b} ${-b} z`,
}
const AILE = Object.keys(SEKIL)

export function Susler({ f, tarih, dolu = [], renk: r, vurgu }) {
  const rnd = tohumla(tarih)
  if (rnd() < 0.18) return null                              // her beş günden biri süssüz
  const adet = 2 + Math.floor(rnd() * 4)                     // 2–5
  const aileler = [AILE[Math.floor(rnd() * AILE.length)], AILE[Math.floor(rnd() * AILE.length)]]
  const bos = (x, y) => !dolu.some(([x1, y1, x2, y2]) => x > x1 - 40 && x < x2 + 40 && y > y1 - 40 && y < y2 + 40)
  const nok = []
  for (let den = 0; den < 300 && nok.length < adet; den++) {
    const x = 50 + rnd() * 980, y = 150 + rnd() * 1330   // alt yazı alanına düşmesin, görünür kalsın
    if (bos(x, y) && nok.every((n) => Math.hypot(n.x - x, n.y - y) > 240)) {
      nok.push({ x, y, t: aileler[nok.length % 2], b: 11 + rnd() * 12, a: rnd() * 40 - 20, v: rnd() < 0.3, h: 0.6 + rnd() * 0.8 })
    }
  }
  return <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
    {nok.map((n, i) => {
      const x = n.x + Math.sin(f / (36 * n.h) + i) * 10, y = n.y + Math.cos(f / (48 * n.h) + i * 2) * 14
      const dolgulu = n.t === 'yildiz'
      return <path key={i} d={SEKIL[n.t](x, y, n.b)} transform={`rotate(${n.a + Math.sin(f / 60 + i) * 6} ${x} ${y})`}
        stroke={n.v ? vurgu : r} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
        fill={dolgulu ? (n.v ? vurgu : 'none') : 'none'} opacity={n.v ? 0.9 : 0.5} />
    })}
  </svg>
}
