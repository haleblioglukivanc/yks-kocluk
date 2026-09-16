#!/usr/bin/env bash
# Tur 0 — makine taraması. Kökten çalıştır: bash denetim/tara.sh
# Gerekli: npm ci (proje) + (cd denetim && npm install && npx playwright install --with-deps chromium webkit)
set -u
cd "$(dirname "$0")/.."
mkdir -p denetim/ham denetim/ekran
echo "== yapı"
npm run build > denetim/ham/build.log 2>&1; echo "build: $? (uyarı $(grep -ci warning denetim/ham/build.log))"
{ du -sh dist | cut -f1 | sed 's/^/toplam /'; find dist/assets -type f \( -name '*.js' -o -name '*.css' \) -printf '%s %f\n' | sort -rn | head -5 | awk '{printf "%s %.0fKB\n",$2,$1/1024}'; } > denetim/ham/dist-boyut.txt
npm audit --json > denetim/ham/audit.json 2>/dev/null; echo "audit: $(node -e "const v=require('./denetim/ham/audit.json').metadata.vulnerabilities;console.log(Object.entries(v).map(([k,n])=>k+' '+n).join(', '))")"
(cd denetim && npx knip --directory .. --config denetim/knip.json --reporter json --no-exit-code --no-config-hints > ham/knip.json 2> ham/knip.err); echo "knip: $(node -e "const k=require('./denetim/ham/knip.json');console.log((k.files||[]).length+' ölü dosya')")"
echo "== statik"; node denetim/statik.mjs
echo "== rls"; node denetim/rls.mjs
echo "== ekran"; node denetim/ekran.mjs
echo "== lighthouse"
CHROME_PATH=$(cd denetim && node -e "console.log(require('playwright').chromium.executablePath())")
for s in "tanitim:/" "giris:/giris"; do ad=${s%%:*}; yol=${s#*:}
  (cd denetim && CHROME_PATH=$CHROME_PATH npx lighthouse "https://khkocluk.com$yol" --preset=perf --form-factor=mobile --screenEmulation.mobile --output=json --output-path="ham/lh-$ad.json" --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new --no-sandbox --ignore-certificate-errors" --quiet >/dev/null 2>&1); echo "lighthouse $ad: $?"
done
echo "== rapor"; node denetim/rapor.mjs
