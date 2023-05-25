const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  platform: "stadgenoot",
  note: "Via Dennis van de Hypotheker",
  baseUrl: "https://aanbod.stadgenoot.nl/woningen/koopaanbod/",
  targetUrl:
    "https://aanbod.stadgenoot.nl/umbraco/WebCit/AanbodApi/GetAanbod?1683663471&init=false&type=wonen&page=1&orderType=date&order=desc&filters=rentOrSale;Koop$price;0,700000$area;60,97",
  parseJSON: function (json) {
    const result = [];

    const base = "https://aanbod.stadgenoot.nl";

    for (const property of json.Items) {
      if (
        property.Status !== "Te koop" &&
        property.Status !== "Binnenkort in de verkoop"
      )
        continue;

      result.push({
        url: base + property.Url,
        image: base + property.ImageUrl.replace(/\?height=190/, "?height=600"),
        street: property.Title,
        zipcode: property.ZipCode,
        meters: property.Area,
        price: property.Price,
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
