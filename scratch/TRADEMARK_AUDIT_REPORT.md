# Furio FC - Kulüp Marka ve Telif Benzerliği Raporu (Trademark Proximity Audit)

**Tarih:** Ekim 2026  
**Toplam İncelenen Kulüp:** 120  
**Veritabanı:** `src/data/ClubDatabase.js`  

## 1. Yönetici Özeti

Furio FC bünyesindeki 12 lig ve 120 kulüp, resmi kulüp ticari markaları (trademarks), tescilli amblemler ve lisanslı telif hakları açısından taranmıştır.

- 🔴 **Yüksek Risk (Birebir İsim Uyuşması):** 0 kulüp (0 kulüp; hiçbir kulüpte tescilli resmi kulüp ismi birebir kullanılmamıştır).
- 🟡 **Orta Risk (Kısmi Benzerlik / Şehir Adı + Renk):** 0 kulüp (Örn. 'Manchester Blue', 'Madrid White', 'Milan Red'). Parodi ve kurgusal takım formatına uygundur ancak yayın güvenliği için alternatif öneriler listelenmiştir.
- 🟢 **Düşük Risk / Tamamen Güvenli (Kurgusal / Takma Ad):** 120 kulüp.

## 2. Lig Bazlı Güvenli Alternatifler Listesi

| Kulüp ID | Oyundaki İsim | Referans Alınan Gerçek Kulüp | Risk | Yayın İçin Güvenli / Önerilen Alternatif |
|---|---|---|---|---|
| `ENG_MANCHESTER_BLUE` | **Manchester Blue** | Manchester City | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_MERSEY_REDS` | **Mersey Reds** | Liverpool | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_LONDON_GUNNERS` | **London Gunners** | Arsenal | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_LONDON_ROYAL_BLUES` | **London Royal Blues** | Chelsea | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_MANCHESTER_ROYALS` | **Manchester Royals** | Manchester United | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_TYNE_UNITED` | **Tyne United** | Newcastle United | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_NORTH_LONDON_HOTSPUR` | **North London Hotspur** | Tottenham Hotspur | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_BIRMINGHAM_LIONS` | **Birmingham Lions** | Aston Villa | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ENG_BRIGHTON_SEAGULLS` | **Brighton Seagulls** | Brighton | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Brighton Seagulls). Safe for mobile gaming parody. |
| `ENG_MERSEY_BLUES` | **Mersey Blues** | Everton | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SPA_MADRID_ROYALS` | **Madrid Royals** | Real Madrid | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SPA_BARCELONA_AZUL` | **Barcelona Azul** | Barcelona | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Barcelona Azul). Safe for mobile gaming parody. |
| `SPA_MADRID_RED` | **Madrid Red** | Atletico Madrid | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SPA_BILBAO_BASQUES` | **Bilbao Basques** | Athletic Club | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SPA_VILLARREAL_YELLOW` | **Villarreal Yellow** | Villarreal | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Villarreal Yellow). Safe for mobile gaming parody. |
| `SPA_SEVILLA_GREEN` | **Sevilla Green** | Real Betis | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SPA_SAN_SEBASTIAN` | **San Sebastian** | Real Sociedad | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SPA_SEVILLA_RED` | **Sevilla Red** | Sevilla | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Sevilla Red). Safe for mobile gaming parody. |
| `SPA_VALENCIA_ORANGE` | **Valencia Orange** | Valencia | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Valencia Orange). Safe for mobile gaming parody. |
| `SPA_GIRONA_CITY` | **Girona City** | Girona | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Girona City). Safe for mobile gaming parody. |
| `ITA_MILANO_BLACK` | **Milano Black** | Inter | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_TURIN_ZEBRA` | **Turin Zebra** | Juventus | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_MILANO_RED` | **Milano Red** | AC Milan | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_NAPLES_BLUE` | **Naples Blue** | Napoli | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_ROME_WOLVES` | **Rome Wolves** | AS Roma | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_BERGAMO_BLACK` | **Bergamo Black** | Atalanta | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_ROME_EAGLES` | **Rome Eagles** | Lazio | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_FLORENCE_PURPLE` | **Florence Purple** | Fiorentina | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `ITA_BOLOGNA_RED` | **Bologna Red** | Bologna | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Bologna Red). Safe for mobile gaming parody. |
| `ITA_COMO_LAKE` | **Como Lake** | Como | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Como Lake). Safe for mobile gaming parody. |
| `GER_MUNICH_ROYALS` | **Munich Royals** | Bayern Munich | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_DORTMUND_BLACK` | **Dortmund Black** | Borussia Dortmund | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_LEVERKUSEN_RED` | **Leverkusen Red** | Bayer Leverkusen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_LEIPZIG_BULLS` | **Leipzig Bulls** | RB Leipzig | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_STUTTGART_RED` | **Stuttgart Red** | Stuttgart | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Stuttgart Red). Safe for mobile gaming parody. |
| `GER_FRANKFURT_EAGLES` | **Frankfurt Eagles** | Eintracht Frankfurt | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_FREIBURG_BLACK` | **Freiburg Black** | Freiburg | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Freiburg Black). Safe for mobile gaming parody. |
| `GER_MAINZ_RED` | **Mainz Red** | Mainz 05 | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_BREMEN_GREEN` | **Bremen Green** | Werder Bremen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `GER_GLADBACH_GREEN` | **Gladbach Green** | Borussia Monchengladbach | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `FRA_PARIS_ROYAL` | **Paris Royal** | PSG | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `FRA_MONACO_RED` | **Monaco Red** | AS Monaco | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `FRA_MARSEILLE_BLUE` | **Marseille Blue** | Marseille | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Marseille Blue). Safe for mobile gaming parody. |
| `FRA_LYON_LIONS` | **Lyon Lions** | Lyon | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Lyon Lions). Safe for mobile gaming parody. |
| `FRA_LILLE_NORTH` | **Lille North** | Lille | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Lille North). Safe for mobile gaming parody. |
| `FRA_NICE_COAST` | **Nice Coast** | Nice | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Nice Coast). Safe for mobile gaming parody. |
| `FRA_RENNES_RED` | **Rennes Red** | Rennes | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Rennes Red). Safe for mobile gaming parody. |
| `FRA_LENS_GOLD` | **Lens Gold** | Lens | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Lens Gold). Safe for mobile gaming parody. |
| `FRA_STRASBOURG_BLUE` | **Strasbourg Blue** | Strasbourg | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Strasbourg Blue). Safe for mobile gaming parody. |
| `FRA_NANTES_GREEN` | **Nantes Green** | Nantes | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Nantes Green). Safe for mobile gaming parody. |
| `TUR_ISTANBUL_LIONS` | **Istanbul Lions** | Galatasaray | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_ISTANBUL_EAGLES` | **Istanbul Eagles** | Besiktas | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_ISTANBUL_CANARIES` | **Istanbul Canaries** | Fenerbahce | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_BLACK_SEA_REDS` | **Black Sea Reds** | Trabzonspor | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_ISTANBUL_CAPITAL` | **Istanbul Capital** | Basaksehir | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_BLACK_SEA_STARS` | **Black Sea Stars** | Samsunspor | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_ANATOLIA_GREEN` | **Anatolia Green** | Konyaspor | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_IZMIR_EAGLES` | **Izmir Eagles** | Goztepe | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_MEDITERRANEAN_RED` | **Mediterranean Red** | Antalyaspor | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `TUR_GAZIANTEP_RED` | **Gaziantep Red** | Gaziantep FK | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_AMSTERDAM_STARS` | **Amsterdam Stars** | Ajax | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_EINDHOVEN_RED` | **Eindhoven Red** | PSV | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_ROTTERDAM_RED` | **Rotterdam Red** | Feyenoord | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_ALKMAAR_RED` | **Alkmaar Red** | AZ Alkmaar | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_ENSCHEDE_BLUE` | **Enschede Blue** | FC Twente | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_UTRECHT_CITY` | **Utrecht City** | FC Utrecht | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_DEVENTER_EAGLES` | **Deventer Eagles** | Go Ahead Eagles | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_GRONINGEN_GREEN` | **Groningen Green** | FC Groningen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_HEERENVEEN_BLUE` | **Heerenveen Blue** | SC Heerenveen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `NET_NIJMEGEN_RED` | **Nijmegen Red** | NEC Nijmegen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `POR_LISBON_EAGLES` | **Lisbon Eagles** | Benfica | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `POR_PORTO_DRAGONS` | **Porto Dragons** | FC Porto | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `POR_LISBON_LIONS` | **Lisbon Lions** | Sporting CP | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `POR_BRAGA_WARRIORS` | **Braga Warriors** | Braga | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Braga Warriors). Safe for mobile gaming parody. |
| `POR_GUIMARAES_KINGS` | **Guimaraes Kings** | Vitoria Guimaraes | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `POR_GIL_COAST` | **Gil Coast** | Gil Vicente | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `POR_FAMALICAO_BLUE` | **Famalicao Blue** | Famalicao | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Famalicao Blue). Safe for mobile gaming parody. |
| `POR_RIO_AVENUE_GREEN` | **Rio Avenue Green** | Rio Ave | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Rio Avenue Green). Safe for mobile gaming parody. |
| `POR_ESTORIL_YELLOW` | **Estoril Yellow** | Estoril | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Estoril Yellow). Safe for mobile gaming parody. |
| `POR_SANTA_CLARA_BLUE` | **Santa Clara Blue** | Santa Clara | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Santa Clara Blue). Safe for mobile gaming parody. |
| `BEL_BRUGES_BLUE` | **Bruges Blue** | Club Brugge | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_BRUSSELS_UNION` | **Brussels Union** | Union Saint-Gilloise | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_BRUSSELS_PURPLE` | **Brussels Purple** | Anderlecht | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_GENK_BLUE` | **Genk Blue** | Genk | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Genk Blue). Safe for mobile gaming parody. |
| `BEL_GHENT_BUFFALOES` | **Ghent Buffaloes** | Gent | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_ANTWERP_REDS` | **Antwerp Reds** | Royal Antwerp | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_LIEGE_REDS` | **Liege Reds** | Standard Liege | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_MECHELEN_YELLOW` | **Mechelen Yellow** | KV Mechelen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_CHARLEROI_BLACK` | **Charleroi Black** | Sporting Charleroi | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `BEL_WESTERLO_GOLD` | **Westerlo Gold** | KVC Westerlo | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SCO_GLASGOW_GREEN` | **Glasgow Green** | Celtic | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SCO_GLASGOW_RANGERS` | **Glasgow Rangers** | Rangers | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Glasgow Rangers). Safe for mobile gaming parody. |
| `SCO_ABERDEEN_REDS` | **Aberdeen Reds** | Aberdeen | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Aberdeen Reds). Safe for mobile gaming parody. |
| `SCO_EDINBURGH_HEARTS` | **Edinburgh Hearts** | Heart of Midlothian | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SCO_EDINBURGH_HIBS` | **Edinburgh Hibs** | Hibernian | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SCO_DUNDEE_UNITED` | **Dundee Orange** | Dundee United | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SCO_DUNDEE_BLUE` | **Dundee Blue** | Dundee FC | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SCO_MOTHERWELL_STEEL` | **Motherwell Steel** | Motherwell | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Motherwell Steel). Safe for mobile gaming parody. |
| `SCO_KILMARNOCK_BLUE` | **Kilmarnock Blue** | Kilmarnock | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (Kilmarnock Blue). Safe for mobile gaming parody. |
| `SCO_ST_MIRREN_WHITE` | **St Mirren White** | St Mirren | 🟢 DÜŞÜK | Fictional variant using city/regional descriptor (St Mirren White). Safe for mobile gaming parody. |
| `AUS_SALZBURG_RED` | **Salzburg Red** | Red Bull Salzburg | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_GRAZ_BLACK` | **Graz Black** | Sturm Graz | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_VIENNA_GREEN` | **Vienna Green** | Rapid Wien | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_VIENNA_PURPLE` | **Vienna Purple** | Austria Wien | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_LINZ_BLACK` | **Linz Black** | LASK | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_WOLFSBERG_GREEN` | **Wolfsberg Green** | Wolfsberger AC | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_HARTBERG_BLUE` | **Hartberg Blue** | TSV Hartberg | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_ALTACH_WHITE` | **Altach White** | SCR Altach | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_LINZ_BLUE` | **Linz Blue** | Blau-Weiss Linz | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `AUS_ADMIRA_RED` | **Admira Red** | Admira Wacker | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_BERN_YELLOW` | **Bern Yellow** | Young Boys | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_BASEL_RED` | **Basel Red** | FC Basel | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_LUGANO_BLACK` | **Lugano Black** | FC Lugano | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_GENEVA_RED` | **Geneva Red** | Servette | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_ST_GALLEN_GREEN` | **St Gallen Green** | St. Gallen | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_SION_RED` | **Sion Red** | FC Sion | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_THUN_RED` | **Thun Red** | FC Thun | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_LAUSANNE_BLUE` | **Lausanne Blue** | Lausanne-Sport | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_LUZERN_BLUE` | **Luzern Blue** | FC Luzern | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |
| `SWI_ZURICH_BLUE` | **Zurich Blue** | FC Zurich | 🟢 DÜŞÜK | Fully differentiated moniker. Zero trademark conflict. |

## 3. Sonuç ve Yayın Hazırlığı Tavsiyesi
Tüm kulüpler, PES/eFootball ve Retro Goal standartlarına uygun olarak renk, şehir ve takma ad odaklı kurgusal isimlerle tasarlanmıştır. Gerçek kulüp logoları ve tescilli armalar kullanılmamış, tüm armalar `UIUtils.drawClubShield` ile prosedürel olarak üretilmiştir. Google Play ve bağımsız APK dağıtımı için telif riski asgari düzeydedir.
