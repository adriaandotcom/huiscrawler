const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl: "https://www.broersma.nl/app/uploads/cache/wonen_aanbod_nl.json",

  parseJSON: function (json) {
    const result = [];

    for (const property of json.objects) {
      const huur = JSON.stringify(property.filters).includes("huur");
      if (property.status !== "Beschikbaar" || huur) continue;

      const zipcode = /(\d{4})\s*([a-z]{2})/i.test(property?.zipcode.trim())
        ? property.zipcode
        : null;

      if (property.url)
        result.push({
          url: property.url,
          image: property.thumbnail_url,
          street: property.street + " " + property.housenumber,
          zipcode,
          meters: property?.oppervlakte,
          price: property.price,
        });
    }

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $(".offer-intro__top")?.text()?.trim(),
      $(".read-more--container")?.text()?.trim(),
    ];

    return parseProperties(content);
  },
};
