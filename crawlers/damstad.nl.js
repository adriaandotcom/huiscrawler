const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl:
    "https://www.damstad.nl/nl/realtime-listings/consumer?pageKey=aanbod-koop",

  parseJSON: function (json) {
    const result = [];

    for (const property of json) {
      if (
        property.statusOrig !== "available" &&
        typeof property?.salesPrice !== "number"
      )
        continue;

      const zipcode = /(\d{4})\s*([a-z]{2})/i.test(property?.zipcode.trim())
        ? property.zipcode.trim()
        : null;

      result.push({
        url: "https://www.damstad.nl" + property.url,
        image: property.photo,
        street: property.address,
        zipcode,
        meters: property?.livingSurface,
        price: property.salesPrice,
      });
    }

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $(".expand-content-content")?.text()?.trim(),
      $("#kenmerken")?.text()?.trim(),
    ];

    return parseProperties(content);
  },
};
