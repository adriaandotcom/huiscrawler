const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  platform: "stadgenoot",
  note: "Via Dennis van de Hypotheker",
  baseUrl: "https://aanbod.stadgenoot.nl/woningen/koopaanbod/",
  targetUrl:
    "https://aanbod.stadgenoot.nl/umbraco/api/Aanbod/GetAanbod?1716309499=&init=true&rentOrSale=Koop&type=woning&page=1&orderType=date&order=desc&filters=rentOrSale;Koop",
  parseJSON: function (json) {
    const result = [];

    const base = "https://aanbod.stadgenoot.nl";

    for (const property of json.items) {
      if (
        property.status !== "Te koop" &&
        property.status !== "Binnenkort in de verkoop"
      )
        continue;

      if (property.url)
        result.push({
          url: property.url,
          image:
            base + property.imageUrl.replace(/\?height=190/, "?height=600"),
          street: property.title,
          zipcode: property.zipCode,
          meters: property.area,
          price: property.price,
        });
    }

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    const page = await fetchWithCookies(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $(".eenheid")?.text()?.trim(),
      $("#kenmerken")?.text()?.trim(),
      $("#omschrijving")?.text()?.trim(),
    ];

    return parseProperties(content);
  },
};
