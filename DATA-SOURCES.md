# Taevakaardi andmed

Tähe identiteet on Hipparcose katalooginumber (`hip`), mitte nimi ega lähim koordinaat. Sünnikuupäeva tõlgendus kasutab 12 astroloogilist päikesemärki; see ei arvuta Päikese asukohta IAU tähtkujude piiride järgi.

- `constellations.json`: tähtkujude kirjeldused, tähtede info ja ühendused.
- `data/sky-catalog.json`: päris taustatähed kuni näiva tähesuuruseni 5,5, allikad ja SHA-256 kontrollsummad.
- `data/sky-sources.json`: fikseeritud allikaversioonid, täiendavate tähtede HIP-numbrid ja nimealiased.

Tähed ja kaugushinnangud: **HYG Database v4.1**, David Nash / Astronexus, [lähteandmed](https://github.com/astronexus/HYG-Database), **CC BY-SA 4.0**. Asendid on J2000, kaugused on kataloogi parsekiväärtusest valgusaastateks teisendatud hinnangud. Puuduva parallaksi 100000 pc asendusväärtust ei kuvata kaugusena. Kaksiktähtede fotomeetria võib kirjeldada lahutamata süsteemi.

Joonised: **Stellarium Modern sky culture**, Stellariumi meeskond, [lähteandmed](https://github.com/Stellarium/stellarium/tree/master/skycultures/modern), **CC BY-SA 4.0**. Kõik 12 joonist säilitavad allika täpsed HIP-ühendused. Mõned lisatähed on klikitavad ka joonise servadeta. Tähtkuju joonisel pole üht universaalset standardit; IAU standardiseerib taevaalade piirid, mitte tähtedevahelised kujundijooned.

Tähenimed: [IAU WGSN](https://exopla.net/star-names/modern-iau-star-names/), seostatud HIP-numbritega. Nimetabeli asukohti ei kasutata: auditis ilmnesid selle Alrescha ja Tegmine koordinaatides vead. Nimed nagu Kullat Nunu säilitatakse aliasena, mitte teise tähena. Lambda Aquarii nimi on Shatabhisha; Hydor tähistab 2 Ceti.

Siinsed HYG ja Stellariumi andmete tuletised on samuti [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) all. Muudatused: tähtede valik, Eesti kirjeldused, kaugusühikute teisendus, nimede uuendamine ja polüjoonte teisendus servadeks. Illustreerivaid pilte ei kasutata.

Kaart on ortograafilise projektsiooniga taevaskera, millel põhjasuund on üleval ja kasvav RA vasakul, kui vaade on vastavalt joondatud. Tagumise poolkera tähti ei kuvata. Jooned järgivad sfääri suurringjooni. Tähtede tegelikud kaugused ei määra raadiust: kujundid on Maalt nähtavad suunad. See ei ole reaalaja horisondikaart ega tähtede ruumilise kauguse mudel.

Uuendamine (vajab võrku): `node scripts/enrich-stars.mjs`.

Kohalik kontroll: `node scripts/verify-sky.mjs`.

Sõltumatu kontroll Stellariumi ja SIMBADi vastu: `node scripts/verify-sky.mjs --online`.

Kontrollitud 17.09.2026: kõik 12 ühendusjoonist kattusid Stellariumi fikseeritud versiooniga. Kõigi 152 põhitähe HIP-identiteedid leidusid SIMBADis üheselt; suurim J2000 asendierinevus oli 0,957 kaaresekundit. Automaatkontroll katkestab üle 2 kaaresekundi erinevuse korral. 2698 taustatähte pärinevad otse HYG kataloogist, neid ei võrreldud ükshaaval SIMBADiga.

Brauseris kontrolliti kõigi 12 tähtkuju valikut, Antarese avamist kaardilt, Alphergi avamist tähtede nimekirjast ning keritavat täheinfot 390 × 844 mobiilivaates. Kohalik kontroll katab ka orientatsiooni, tagumise poolkera peitmise ja klikkimise CSS-skaalaga kaardil.
