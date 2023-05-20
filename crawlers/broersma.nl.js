const cheerio = require("cheerio");
const { getZipCode } = require("../lib/google");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  targetUrl: "https://www.broersma.nl/app/uploads/cache/wonen_aanbod_nl.json",

  parseJSON: function (json) {
    const result = [];

    for (const property of json.objects) {
      if (property.status !== "Beschikbaar") continue;

      const zipcode = /(\d{4})\s*([a-z]{2})/i.test(property?.zipcode.trim())
        ? property.zipcode
        : null;

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

    let contents = [
      $(".offer-intro__top")?.text()?.trim(),
      $(".read-more--container")?.text()?.trim(),
    ];

    contents = contents.filter((c) => c);

    if (contents.length === 0) return null;

    const properties = await parseProperties(contents.join(" \n "));

    return properties;
  },
};
