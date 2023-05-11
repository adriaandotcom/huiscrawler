const { Configuration, OpenAIApi } = require("openai");
const { OPENAI_API_KEY, PROMPT } = process.env;
const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

if (!PROMPT) throw new Error("PROMPT is required");

const template = `
${PROMPT}

Pretend you ware a crawler that needs to extract the data from a webpage perfectly. The response should extract this data: available, price, color, garden, rooftarrace, floor (null, 0, 1, 2, ...), year, rooms, size, servicecosts (sum of all monthly costs), rating (between 1-100 for the likeliness it fits our requirements), reason (one line explaining the rating: at least one positive and one negative). If the data is not available it should return null.

This is an example page: 

\`\`\`
Leuke hoekwoning met 3 slaapkamers en een diepe achtertuin met berging. Gelegen aan een rustige en kindvriendelijke straat in het aantrekkelijke Amsterdam West. Woonoppervlakte ca. 69m2 (exclusief zolder), perceeloppervlakte 208m2, bouwjaar 1941.

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

Overdracht
Vraagprijs€ 369.000 k.k.
BeschikbaarheidTe koop
Aangeboden sinds8 dagen
Bouw
Type 	Hoekwoning
Bouwjaar1941
Indeling
Oppervlakte69 m2
Inhoud294 m3
Aantal kamers4
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

const askChatGPT = async ({ prompt }) => {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion?.data?.choices?.[0]?.message.content;
    if (!text) return "";

    return text.trim().replace(/^(\n)+/g, "");
  } catch (error) {
    if (error?.response?.data?.error?.message) {
      console.error(
        error.message,
        prompt.length,
        error.response.data.error?.message
      );
    } else console.error(error);
    return "";
  }
};

const parseProperties = async (body) => {
  const content = body.replace(/\s(\s+)/gi, " ");
  const prompt = template.replace("{{content}}", content);
  const response = await askChatGPT({ prompt });
  if (!response) return null;

  try {
    const json = JSON.parse(response);
    if (json.servicecosts) json.servicecosts = Math.round(json.servicecosts);
    return json;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  parseProperties,
};