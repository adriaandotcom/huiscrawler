const { Configuration, OpenAIApi } = require("openai");
const { OPENAI_API_KEY } = process.env;
const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const template = `

We are a hands-on Dutch couple looking for an house early 1900 in Amsterdam. We prefer to live on the ground floor with at least 70 square meters but if we can extend the house, 60m2 is fine to. We love giving BBQ parties for groups of friends and have people sleeping over. We are planning to have children in this house. Extra storage room or an garden house would be a plus.

Pretend you ware a crawler that needs to extract the data from a webpage perfectly. The response should extract this data: available, price, color, garden, rooftarrace, floor (null, 0, 1, 2, ...), year, rooms, size, servicecosts (sum of all monthly costs), rating (between 1-100 for the likeliness it fits our requirements), reason (one line explaining the rating). If the data is not available it should return null.

This is an example page: 

\`\`\`
Leuke hoekwoning met 3 slaapkamers en een diepe achtertuin met berging. Gelegen aan een rustige en kindvriendelijke straat in het aantrekkelijke Amsterdam West. Woonoppervlakte ca. 69m2 (exclusief zolder), perceeloppervlakte 208m2, bouwjaar 1941.

De J.P. Coenstraat is aantrekkelijk gelegen op loopafstand van bos, heide, supermarkt en diverse scholen. Op een paar minuten fietsafstand van winkelgebied "De Gijsbrecht" en het centrum van Hilversum met intercity treinstation. De straat ligt dichtbij uitvalswegen zoals A27 en N201.

Indeling:
Begane grond: Entree/gang, toilet en trapkast.

L-vormige woonkamer met zij raam en open slaande deuren naar de achtertuin. Uitgebouwde keuken met raam en deur richting de tuin.

Verdieping: Overloop, doucheruimte voorzien van wastafel. Totaal 3 slaapkamers waarvan 2 met vaste kastruimte.

Zolder: Vaste trap naar zolderverdieping met dakraam en CV-opstelling 2020. Nokhoogte 1.83. Desgewenst is de verdieping te gebruiken als bergzolder of tijdelijk als logeerruimte.

Bijzonderheden:
- Energielabel D
- Aantrekkelijke ligging!
- Grotendeels dubbel glas
- CV installatie uit 2020
- Ruime achtertuin
- Service kosten € 156,58 + € 13,66 (active, professional VvE) + one-off contribution 2023 € 57,99 + € 15,49 = extra € 63,48 per month = € 123,45 + € 10,00;


Wat u verder moeten weten:
- Verkoper verkoopt de woning voor eigen gebruik (of gebruik door eerstegraads familielid), welke persoon daar zijn/haar hoofdverblijf gaat hebben;
- Verkoper verkoopt met anti-speculatiebeding (niet verhuren noch verkopen gedurende een periode van 2 jaar);
- Het betreft een voormalige huurwoning van de Alliantie;
- Niet bewoning-, asbest- en ouderdomsclausule van toepassing;
- Verkoper behoudt zich het recht van gunning voor;
- In overleg per direct beschikbaar.

Deze informatie is door ons met de nodige zorgvuldigheid samengesteld. Onzerzijds wordt echter geen enkele aansprakelijkheid aanvaard voor enige onvolledigheid, onjuistheid of anderszins, dan wel de gevolgen daarvan. Alle opgegeven maten en oppervlakten zijn indicatief.

Overdracht
Vraagprijs 	€ 369.000 k.k.
Beschikbaarheid 	Te koop
Aangeboden sinds 	8 dagen
Bouw
Type 	Hoekwoning
Bouwjaar 	1941
Indeling
Oppervlakte 	69 m2
Inhoud 	294 m3
Aantal kamers 	4
\`\`\`

This is the expected JSON outcome for the page above: 

{
  "available": true,
  "price": 369000,
  "color": null, 
  "garden": true,
  "rooftarrace": false,
  "floor": 0,
  "year": 1941,
  "rooms": 4,
  "servicecosts": 133.45,
  "size": 69,
  "rating": 80,
  "reason": "Spacious garden (perfect for parties) with storage room. An attic which can be used as a 4th bedroom or guests sleeping over. Can't rent it out for 2 years. No erfpacht."
}

Now do the same for this page: 

\`\`\`
{{content}}
\`\`\`

`;

const page = `
Deze woning is gereserveerd voor verkoop aan huurders van Eigen Haard tot 22 mei 2023.
Ben je geen huurder van Eigen Haard? Ook dan kun je alvast reageren!

Ruim 3 KAMER BEGANE GROND APPARTEMENT met achtertuin op het zuidwesten. Het appartement beschikt over een separate berging naast de entree van het appartement. Het appartement ligt in een autovrij woonhofje met aan de voorzijde een speeltuintje.

Omgeving

Letterlijk om de hoek van het complex bevindt zich het levendige winkelcentrum de Amsterdamse Poort met een dagelijkse markt. Daarnaast is de Amsterdam Arena met omliggend winkel- en uitgaansgebied goed bereikbaar waar onder andere concerten en voetbalwedstrijden worden gehouden. Ook qua openbaar vervoer zit je hier uitstekend: diverse bushaltes zijn op loopafstand en ook de metro en de trein zijn vlakbij (NS Station Bijlmer). Met de auto ben je binnen een paar minuten op de A1, A2, A9 en A10!

Indeling
Entree/hal, royale woonkamer met toegang tot de separate keuken. De keuken is casco en kan dus nog geheel naar eigen smaak worden ingericht. Tevens is de muur tussen de kamer en de keuken gemakkelijk te verwijderen, waardoor er een open keuken gecreëerd kan worden. De ruime slaapkamer geeft toegang tot de ruime betegelde tuin gelegen op het westen. De tweede slaapkamer ligt aan de voorzijde van de woning. De badkamer is voorzien van een douche, wastafel en de wasmachineaansluiting. Het apart toilet is voorzien van een fonteintje. Tevens is er een berging naast de woning die vanaf de buitenzijde te bereiken is.

Kenmerken

• Verwarming en warm water via blokverwarming;
• De woning is voorzien van dubbele beglazing;
• Bouwjaar circa 1981;
• Woonoppervlakte ca 74 m²;
• Oplevering in overleg (kan snel);
• De servicekosten bedragen € 189,77 per maand, exclusief voorschot stookkosten € 100,-
• Vaste projectnotaris: Van Doorne te Amsterdam;
• De erfpachtcanon (Algemene Bepalingen 2000) is afgekocht tot 15 oktober 2031;
• Verkoop uitsluitend voor eigen bewoning als zijnde hoofdverblijf. De koper dient zich als hoofdbewoner op het adres in te schrijven. In de koopakte wordt hiervoor een zelfbewoningsclausule met kettingbeding opgenomen.
• Er is een anti-speculatiebeding van toepassing;
• Verkoper beschikt t.a.v. het verkochte over een energieprestatie certificaat dan wel een gelijkwaardig document als bedoeld in het Besluit energieprestatie gebouwen.

Voorrang aan doorstromers

Woont u nu in een huurwoning van Eigen Haard en wilt u van Eigen Haard een woning kopen? Dan krijgt u voorrang op andere belangstellenden. U krijgt deze voorrang omdat de huurwoning die u achterlaat, beschikbaar komt voor een andere woningzoekende die voldoet aan de toewijzingscriteria voor de woning. Woont u in een sociale huurwoning van een andere woningcorporatie in de Stadsregio Amsterdam? Ook dan kunt u voorrang krijgen. Vraag ernaar tijdens de bezichtiging.

Disclaimer

De getoonde informatie is door ons met zorg samengesteld op basis van beschikbare gegevens, maar kan afwijken van de werkelijke situatie. Hier kunnen geen rechten aan worden ontleend.


Te koop
Koop € 280.000 k.k.
Totale oppervlakte74 m2
Aantal kamers3
Bouwjaar1981
Soort bouwBestaande bouw
VerkoopmakelaarEigen Haard Verkoop
Emailverkoop@eigenhaard.nl
Telefoonnummer020 6 801 801
Voorzieningen Tuin
`;

const askChatGPT = async ({ prompt }) => {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion?.data?.choices?.[0]?.message.content;
    if (!text) return "";

    const trimmed = text.trim().replace(/^(\n)+/g, "");

    return trimmed;
  } catch (error) {
    logger.error(error);
    return "";
  }
};

// Return properties as js object via chatgpt 3.5 turbo
const parseProperties = async () => {
  const prompt = template.replace("{{content}}", page);
  const response = await askChatGPT({ prompt });
  if (!response) return null;

  try {
    const json = JSON.parse(response);
    return json;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

module.exports = {
  parseProperties,
};
