# Astra Atlas — disaini- ja rakendusjuhis

See fail on Astra Atlase kasutajaliidese, käitumise ja andmete esitamise lähtejuhis. Rakendus on eestikeelne interaktiivne taevakaart, mis ühendab päris J2000 taevakoordinaatidel põhineva sodiaagikaardi ning eraldi, selgelt märgistatud lääne astroloogia sünnikuupäevatõlgenduse.

## 1. Toote eesmärk

Kasutaja peab saama:

1. uurida 12 traditsioonilist sodiaagi tähtkuju taevaskeral;
2. pöörata ja suumida kaarti;
3. valida tähtkuju kaardilt või valikmenüüst;
4. valida konkreetse tähe kaardilt või tähtede nimekirjast;
5. lugeda tähe nime, kataloogitähist, koordinaate, heledust, kaugust, spektriklassi ja allikat;
6. sisestada sünnikuupäeva või vanuse koos sünnikuu ja -päevaga;
7. saada lääne astroloogia päikesemärk ning avada see kaardil;
8. kasutada lehte mugavalt hiire, puute, klaviatuuri ja väikese ekraaniga.

Teaduslik taevainfo ja astroloogiline eneseanalüüs peavad olema visuaalselt ja tekstiliselt eristatavad. Astroloogiline tulemus on meelelahutuslik, mitte teaduslik isiksusehinnang.

## 2. Disainipõhimõte

Tasakaal on **60% praktilist kasutatavust / 40% visuaalset mõju**.

Kogemus peab olema selge, usaldusväärne, tehniline ilma külmuseta ning ruumiline ilma mängulise ulmekeeleta. Taevaskera on lehe ainus tugev visuaalne fookus. Ülejäänud liides toetab selle uurimist ega võistle sellega.

## 3. Visuaalne keel

Kasutajaliides kasutab heledat pilvevalget lõuendit, tindikarva teksti, signaalsinist ja elektrilist tsüaani. Tumesinine taevakaart loob rakenduse sees eraldi vaatlusruumi.

| Roll | Hele teema | Tume teema | Kasutus |
|---|---|---|---|
| Taust | `#F4F7FB` | `#07101F` | Lehe põhilõuend |
| Pind | `rgba(255,255,255,.78)` | `rgba(12,25,46,.74)` | Kaardid ja paneelid |
| Tugev pind | `#FFFFFF` | `#0D1A2D` | Vormiväljad ja kõrgemad pinnad |
| Põhitekst | `#0B1529` | `#EEF6FF` | Pealkirjad ja põhisisu |
| Teisene tekst | `#68758B` | `#93A1B7` | Abitekst ja metaandmed |
| Signaalsinine | `#0A42D8` | `#3E72FF` | Valik, põhinupp ja aktiivne navigeerimine |
| Sügav sinine | `#072E9F` | `#1846C5` | Gradiendi sügavus |
| Energiatsüaan | `#00A9D7` | `#00D9FF` | Fookus, valitud täht ja aktiivne detail |
| Edu | `#14BE81` | sama | Kehtiv või kinnitatud seisund |
| Viga | `#DE254F` | sama | Sisestusviga ja laadimisviga |

Reeglid:

- Ära kasuta üldist lilla-roosat „AI-gradienti”.
- Tsüaan tähistab aktiivsust, fookust või taevakaardi energiat; see ei ole dekoratiivne täitevärv.
- Helendust kasuta ainult valitud tähtedel, tähtkujudel, fookusel ja üksikutel orbit-elementidel.
- Klaasi kasuta kleepuvas ülaribas ja kaardi kontekstipaneelides, mitte igal kaardil.
- Varjud peavad looma hierarhiat, mitte jätma hõljuvate kleebiste muljet.

## 4. Tüpograafia

Põhikirjatüüp on `Inter, ui-sans-serif, system-ui, sans-serif`. Koordinaadid, järjekorranumbrid ja muud tehnilised metaandmed kasutavad monospace-kirja.

| Roll | Suurus ja laad |
|---|---|
| Lehe pealkiri | `clamp(2.65rem, 5vw, 5.25rem)`, kaal 650, tihe reavahe |
| Sektsiooni pealkiri | `clamp(1.6rem, 2.5vw, 2.2rem)` |
| Kaardi pealkiri | umbes `1.14rem`, kaal 650 |
| Põhitekst | `0.77–0.96rem`, reavahe `1.55–1.7` |
| Juhtnupu tekst | `0.70–0.80rem`, kaal 600–650 |
| Tehniline meta | `0.52–0.64rem`, monospace |

Suuri pealkirju kasutatakse ainult tegeliku hierarhia jaoks.

### „Kulmude” keeld

Sektsioonide, kaartide ja tulemuste kohal ei kasutata väikseid suurtähtedega eelsilte ehk „kulme”. Näited, mida mitte lisada: „3D TAEVAKAART · J2000”, „SÜNNIKUUPÄEVA JÄRGI”, „VALITUD TÄHTKUJU”.

Lubatud on funktsionaalsed metaandmed seal, kus need aitavad konkreetset väärtust mõista, näiteks `RA`, `DEC`, `HIP`, spektriklass, ladinakeelne nimi ja kataloogitähis.

## 5. Geomeetria ja ruum

- Juhtnupu raadius: `12px`.
- Sisukaardi raadius: `18px`.
- Põhipaneeli raadius: `22px`.
- Kompaktse elemendi raadius: `9px`.
- Vahed lähtuvad 4-pikslisest süsteemist: `4, 8, 12, 16, 20, 24, 32, 48, 72`.
- Töölaua külgriba on `242px`.
- Kleepuv ülariba on `76px`, mobiilis `66px`.
- Põhisisu maksimaalne laius on `1420px`.
- Tavapärane juhtnupp on vähemalt `42px` kõrge; puuteala siht on `44 × 44px` või suurem.
- Täispille kasutatakse ainult lühikeste olekute jaoks, mitte üldise kujundina.

## 6. Lehe struktuur

Leht koosneb fikseeritud vasaknavigeerimisest, kleepuvast ülaribast, sissejuhatusest, taevakaardi ja sünnikaardi plokist ning valitud tähtkuju detailidest.

Taevakaart on põhiveerus suurem kui sünnikaart. Alla `1100px` liiguvad need ühte veergu. Alla `800px` muutub külgriba väljasõitvaks menüüks. Alla `580px` muutuvad kõik sisukaardid üheveeruliseks.

Vasaknavis on kolm päris sihtpunkti: Taevakaart, Sünnikaart ja Tähtkuju detailid. Aktiivne link kasutab sinist teksti, heledat sinist pinda ja kahe piksli laiust vasakmarkerit. Mobiilis avaneb sama navigeerimine menüünupust ning taust kaetakse scrim-kihiga.

Ülaribal on lehe kontekst, tähtkuju kiirvalik ning hele/tume teema.

## 7. Taevakaart

Taevakaart on ortograafilise projektsiooniga taevaskera, mitte dekoratiivne suvaliste tähtedega pall.

Kaart peab:

- kasutama J2000 otsetõusu ja deklinatsiooni;
- näitama põhjasuunda üleval ning kasvavat otsetõusu vasakul, kui vaade on vastavalt joondatud;
- peitma tagumise poolkera tähed, mitte voltima neid ettepoole;
- ühendama tähtkuju tähed sfäärilistel suurringjoontel;
- kasutama tähtkuju kujude jaoks Stellarium Modern jooniseid;
- kasutama tähtede identiteedina HIP-numbrit;
- mitte väitma, et sfääri raadius näitab tähtede tegelikku kaugust;
- mitte esitama kaarti reaalaja horisondi- või vaatleja asukohakaardina.

Kaardil on RA ja DEC keskpunkti näit, suumi-, vähendamis- ja lähtestusnupp, valitud tähtkuju jooned, päris taustatähed, legend, andmemaht, tähtede valiknimekiri ning avatav täpsuse ja allikate selgitus.

### Kaardi liigutamine

- Hiire või sõrmega paremale lohistades peab sfäär liikuma paremale; liikumine ei tohi tunduda haaramisele vastupidine.
- Vertikaalne lohistamine kallutab vaadet samas tunnetuslikus suunas.
- Hiireratas suumib ja nooleklahvid pööravad fokuseeritud kaarti.
- Lähtestus taastab algvaate ja suumi.
- Kui seadmes on eelistatud vähendatud liikumist, toimub tähtkujule fookustamine kohe või peaaegu kohe.

### Tähtkuju valimine

Tähtkuju peab saama valida kaardi joonel või tähel klõpsates, ülariba valikmenüüst ja sünnikaardi tulemuse nupust.

Valik avab tumeda klaaspaneeli, kus on nimi, ladinakeelne nimi, lühend, taevapiirkond, lühikirjeldus ja link detailide juurde. Paneel peab olema suletav ning ei tohi peita kaardi kasutusvihjet enda alla.

### Tähe valimine

Iga nähtav põhi- ja taustatäht peab olema klikitav. Valitud täht avab paneeli, kus kuvatakse nimi, HIP-number, Bayeri või Flamsteedi tähis, tähtkuju, kirjeldus, näiv heledus, kaugushinnang, spektriklass, täpsed RA/DEC koordinaadid ja link kataloogikirjele.

Puuduva väärtuse korral kuvatakse selge puudumise märge. Tihedas tähtede rühmas peab sama info olema avatav nimekirjast. Mobiilis on tähepaneel kaardi sees keritav ning jätab sulgemisnupu nähtavaks.

## 8. Sünnikaart

Sünnikaart pakub kahte sisestusviisi:

1. täpne sünnikuupäev;
2. vanus koos sünnikuu ja -päevaga, mille põhjal pakutakse kontrollitav sünniaasta.

Sugu on valikuline ja ei mõjuta sodiaagimärgi arvutust. Kaamerat, soo automaattuvastust ega vanuse visuaalset hindamist ei kasutata.

Vormireeglid:

- tuleviku kuupäev pole lubatud;
- vanus peab jääma vahemikku `0–120`;
- päev peab olema valitud kuu jaoks kehtiv;
- vigane väli saab punase piiri, `aria-invalid` oleku ja konkreetse tekstilise veateate;
- kasutaja sisestust ei kustutata vea korral;
- pakutud kuupäev tuleb enne tulemuse arvutamist kasutajale nähtavalt näidata.

Tulemus sisaldab märgi nime, glüüfi, kuupäevavahemikku, elementi, kokkuvõtet, tugevust, arengukohta, rütmi ja planeeti. Nupp „Näita taevakaardil” seob astroloogilise tulemuse vastava astronoomilise tähtkujuga.

## 9. Tähtkuju detailid

Detailisektsioon näitab aktiivse tähtkuju kohta eestikeelset ja ladinakeelset nime, IAU lühendit, kirjeldust, müüti, heledaimat kaardistatud tähte, vaatlusaega, Eesti nähtavuse selgitust, taevapiirkonda ja pindala ruutkraadides.

Osaliselt nähtavate lõunataeva tähtkujude puhul tuleb öelda, et osa tähti jääb Eestis horisondi alla. Väidet „Eestis nähtav” ei kasutata ilma vaatlusaja ja horisondi piiranguta.

## 10. Andmemudel ja allikad

Kõik tähtkujude ja tähtede sisulised andmed asuvad JSON-failides, mitte HTML-is ega joonistuskoodi sisse kirjutatud objektides.

### `constellations.json`

Iga tähtkuju sisaldab vähemalt:

```text
id, name, latinName, abbreviation, glyph, range, months,
element, mode, planet, summary, strength, growth,
description, myth, best, location, area, visibilityNote,
stars, lines, figureSource
```

Iga täht sisaldab vähemalt:

```text
id, hip, name, catalogName, designation, aliases,
raHours, declinationDegrees, apparentMagnitude,
distanceLightYears, spectralType, description,
source, sourceUrl
```

### `data/sky-catalog.json`

Sisaldab päris taustatähti, epohhi, heleduse piiri, allikate metaandmeid ja kontrollsummasid.

### `data/sky-sources.json`

Sisaldab fikseeritud allikaversioone, litsentse, täiendavaid HIP-tunnuseid ja nimealiaseid.

Andmeallikad on HYG Database v4.1 tähtede andmeteks, Stellarium Modern sky culture ühendusjoonisteks, IAU WGSN ametlikeks nimedeks ning SIMBAD sõltumatuks HIP-identiteedi ja asukoha kontrolliks.

Tähenimi ei ole identiteedi primaarvõti. Nimed seotakse HIP-numbriga; lähedusotsinguga identiteeti ei arvata. Vanad või alternatiivsed nimed jäävad aliasteks, mitte eraldi tähtedeks.

## 11. Teadusliku sisu piirid

Rakendus peab alati selgelt ütlema:

- kaardil on 12 traditsioonilist astroloogilist sodiaagimärki;
- Päikese tegelik tee läbib ka Maokandja tähtkuju;
- IAU standardiseerib tähtkujude piirid, mitte ühe universaalse tähejoonise;
- tähtkujude kujundid on Maalt nähtavad suunad, mitte füüsiliselt lähestikku asuvate tähtede 3D-mudel;
- kaugusväärtus on kataloogihinnang ega määra kaardil tähe raadiust;
- astroloogiline sünnimärk ei ole sama mis Päikese asukoht IAU tähtkuju piirides.

Allikate ja piirangute selgitus peab olema kasutajale taevakaardi juures avatav, mitte ainult arendusdokumentatsioonis.

## 12. Liikumine

Rakendus kasutab vaikimisi lühikesi oleku- ja fookusüleminekuid. Eraldi liikumisrežiimi nuppu ei kuvata, sest kasutaja ei pea tehnilist animatsioonivalikut käsitsi haldama.

Kui operatsioonisüsteemis või brauseris on määratud `prefers-reduced-motion: reduce`, toimuvad fookusliikumised kohe ning CSS-animatsioonid ja üleminekud vähendatakse automaatselt praktiliselt nullini. Dekoratiivne liikumine ei tohi olla funktsiooni mõistmiseks vajalik.

## 13. Ligipääsetavus

- Kasuta semantilisi maamärke ja loogilist pealkirjajärjestust.
- Lehel peab olema põhisisule viiv skip-link.
- Kõigil ikoonnuppudel peab olema ligipääsetav nimi.
- Klaviatuuri fookus peab olema alati nähtav.
- Canvas peab olema klaviatuuriga fokuseeritav ja omama kirjeldavat `aria-label` väärtust.
- Dünaamilised tähe- ja sodiaagitulemused kasutavad sobivat `aria-live` ala.
- Veateated kasutavad `role="alert"` semantikat.
- Olekut ei edastata ainult värviga.
- Tekst peab jääma loetavaks 200% suurendusel.
- Tume teema peab olema sama läbimõeldud kui hele teema.
- Puute- ja hiireklikkide tabamisalad peavad arvestama erineva täpsusega sisendseadmeid.

## 14. Mikrokoopia

Hääl on täpne, rahulik, eestikeelne ja kergelt tehniline.

- Nupud algavad otsese tegevusega: „Leia”, „Näita”, „Vaata”, „Sulge”, „Taasta”.
- Veateade ütleb, mis on valesti ja mida kasutaja järgmisena tegema peab.
- Astronoomilisi fakte ei segata isiksusekirjeldustega.
- Teaduslikku ebakindlust ei peideta: puuduv väärtus kuvatakse „Kataloogis puudub”.
- Väldi turunduslikku täiteteksti, liigset vaimustust ja ebamäärast „AI” sõnavara.
- Kasuta terminit „tähtkuju” astronoomilise kujundi ja „sodiaagimärk” astroloogilise tulemuse kohta.

## 15. Keelatud mustrid

Ära lisa:

- sektsioonide kohale väikseid suurtähtedega „kulme”;
- juhuslikult genereeritud või väljamõeldud tähti;
- nime või koordinaadiläheduse järgi oletatud täheidentiteete;
- tagumise poolkera projektsiooni esiküljele;
- kaamera abil soo või vanuse tuvastamist;
- lilla-roosat AI-gradienti;
- helendust või klaasi igale komponendile;
- liigseid pillikujulisi juhtnuppe;
- eesmärgita animatsiooni;
- dekoratiivseid pseudoandmeid;
- mobiili jaoks lihtsalt kokkusurutud töölauapaigutust;
- väidet, et astroloogiline kirjeldus on teaduslik hinnang.

## 16. Kontroll ja valmimiskriteeriumid

Muudatus on valmis, kui:

1. kõik 12 tähtkuju avanevad nii kaardilt kui valikmenüüst;
2. tähtkuju ühendused vastavad fikseeritud Stellarium Modern andmetele;
3. kõik põhitähed on HIP-tunnusega ning nende asukohad läbivad SIMBADi kontrolli;
4. tähel klõpsamine avab õige tähe, ka CSS-skaalaga canvasel;
5. tähtkujul klõpsamine avab õige tähtkuju;
6. hiirega lohistamine liigub haaramisega samas tunnetuslikus suunas;
7. sünnikuupäeva ja vanusepõhine sisestus annavad õiged piirikuupäevad;
8. heledas ja tumedas teemas pole loetavusvigu;
9. 390 px laiusel ekraanil on kaart, vorm ja keritav tähepaneel kasutatavad;
10. klaviatuurifookus, vähendatud liikumine ja veateated toimivad;
11. konsoolis pole vigu ega hoiatusi;
12. allikad, litsentsid ja mudeli piirangud on kasutajale nähtavad;
13. `node scripts/verify-sky.mjs` läbib kohaliku kontrolli;
14. võrgu olemasolul läbib `node scripts/verify-sky.mjs --online` Stellariumi ja SIMBADi kontrolli.

## 17. AI-agendi rakendusreeglid

Enne kasutajaliidese muutmist:

1. säilita päris astronoomilised andmed ja HIP-identiteedid;
2. hoia andmesisu JSON-is ning esitusloogika JavaScriptis;
3. kontrolli, kas muudatus mõjutab hiirt, puudet, klaviatuuri või mobiilivaadet;
4. kasuta olemasolevaid värvi- ja pinnatokeneid ning austa automaatset vähendatud liikumise eelistust;
5. ära lisa uusi dekoratiivseid sildikesi ega „kulme”;
6. eelista selget funktsiooni uuele visuaalsele efektile;
7. testi vähemalt ühte päris tähte kaardilt ja nimekirjast;
8. käivita andmekontroll pärast tähe- või tähtkujumuudatust;
9. hoia astroloogiline tõlgendus teaduslikust taevainfost eraldi;
10. dokumenteeri uus allikas ja litsents failis `DATA-SOURCES.md`.

Astra Atlas on disainiga kooskõlas siis, kui kasutaja mõistab kohe, et saab uurida päris taevakaarti, leiab oma sodiaagimärgi ilma segaduseta ning saab iga kuvatud tähe ja tähtkuju kohta kontrollitava, selgelt sõnastatud info.
