const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { getZipCode } = require("../lib/google");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl:
    "https://www.denederlanden.eu/wonen/zoeken/heel-nederland/amsterdam/",

  parseHTML: function ($) {
    const result = [];

    $(".houses__listing .card-property").each(function () {
      const status = $(this).find(".card-property__text").text().trim();

      const url = $(this).attr("href");

      const srcset = $(this)
        .find("figure picture source")
        .first()
        .attr("data-srcset");

      const image =
        "https://www.denederlanden.eu" + srcset.split(",")[0].split(" ")[0];

      const street = $(this).find(".card-property__address").text().trim();

      result.push({ url, image, street });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $(".house-info").text(),
      $(".house-overview__description").text(),
      $(".house-overview__features").text(),
    ];

    const properties = await parseProperties(content);

    // Add zipcode
    const street = $(".house-info__title").text().trim();
    const city = $(".house-info__city").text().trim();

    if (street && city)
      properties.zipcode = await getZipCode(
        `${street}, ${city}, The Netherlands`
      );

    return properties;
  },
};
