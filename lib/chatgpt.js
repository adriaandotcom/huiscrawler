const { jsonrepair } = require("jsonrepair");
const OpenAI = require("openai");
const { log } = require("./helpers");

const { OPENAI_API_KEY, PROMPT } = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
  "zipcode": "1234 AB",
  "street": "Bestevaerstraat 125 H",
  "reason": "Spacious garden (perfect for parties) with storage room. An attic which can be used as a 4th bedroom or guests sleeping over. Can't rent it out for 2 years. No erfpacht."
}

Now do the same for this page, return only json:

\`\`\`
{{content}}
\`\`\`

`;

const askChatGPT = async ({ prompt, retries = 0 }) => {
  try {
    const completion = await openai.chat.completions.create({
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
    });

    const jsonText = completion?.choices?.[0]?.message?.content;

    if (!jsonText)
      throw new Error(
        "No text returned from completion: " + JSON.stringify(completion)
      );

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      const clean = jsonText
        ?.replace(/\n/g, " ")
        .replace(/\s(\s+)/gi, " ")
        .trim();

      log("Repairing JSON:", clean);

      try {
        return jsonrepair(clean);
      } catch (error) {
        log("Failed to repair JSON:", clean);
        return "";
      }
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status) {
        log("Too many requests to OpenAI API, retrying in 5 seconds");
        if (retries < 3) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return askChatGPT({ prompt, retries: retries + 1 });
        } else {
          log("Too many retries to OpenAI API, aborting");
        }
      }
      console.error(error.status); // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code); // e.g. 'invalid_api_key'
      console.error(error.type); // e.g. 'invalid_request_error'
    } else {
      // Non-API error
      console.log(error);
    }
    return "";
  }
};

const parseProperties = async (body) => {
  if (Array.isArray(body)) body = body.filter(Boolean).join("\n");

  if (!body || body.trim() === "") return null;

  let content = body.replace(/\s(\s+)/gi, " ").trim();

  const maxLength = 4097 * 4 - 4000;
  const contentLength = content.length;
  const templateLength = template.length;

  const maxContentLength = maxLength - templateLength;

  if (contentLength > maxContentLength) {
    log(`Truncating prompt from ${contentLength} to ${maxContentLength}`);
    content = content.slice(0, maxContentLength) + "...";
  }

  const prompt = template.replace("{{content}}", content);
  const json = await askChatGPT({ prompt });
  if (!json) return null;
  if (json.servicecosts) json.servicecosts = Math.round(json.servicecosts);
  return json;
};

module.exports = {
  parseProperties,
};
