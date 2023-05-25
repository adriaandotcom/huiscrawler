const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parseSize } = require("../lib/helpers");

module.exports = {
  note: "Makelaar gevonden 22 mei 🚶🏽‍♀️",
  puppeteer: true,
  targetUrl: "https://www.reilinghmakelaardij.nl/aanbod",

  parseHTML: function ($) {
    const result = [];

    $("#objects .object").each(function () {
      const url = $(this).find("a.adreslink").first().attr("href");

      const image = $(this)
        .find(".object-picture img.img-responsive")
        .first()
        .attr("src");

      const sizeText = $(this)
        .find(".object-feature .Woonoppervlakte .features-info")
        .text()
        .trim();
      const meters = parseSize(sizeText);

      const type = $(this)
        .find(
          ".object-feature .Soort_woning .features-info,.object-feature .Type_woning .features-info"
        )
        .first()
        .text()
        .trim();

      const floor = /beneden/i.test(type) ? 0 : null;

      const street = $(this).find(".object-adres .adres").first().text().trim();
      const city = $(this)
        .find(".object-adres .plaatsnaam")
        .first()
        .text()
        .trim();

      result.push({
        url,
        floor,
        image,
        street,
        meters,
        city,
      });
    });

    return result;
  },

  getAIProperties: async function (execute, result) {
    const html = await execute({ url: result.url });
    const $ = cheerio.load(html);

    const content = [
      $(".object-detail-features").text(),
      $(".object-detail-description").text(),
    ];

    return parseProperties(content);
  },
};
