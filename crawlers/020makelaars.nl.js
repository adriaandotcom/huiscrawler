const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parsePrice, parseSize } = require("../lib/helpers");

module.exports = {
  note: "Makelaar gevonden 20 mei 🚶🏽‍♀️",
  targetUrl: "https://www.020makelaars.nl/aanbod/woningaanbod/AMSTERDAM/koop/",

  parseHTML: function ($) {
    const result = [];

    $(".aanbodEntry").each(function () {
      const path = $(this)
        .find('a[href^="/aanbod/woningaanbod/amsterdam/koop/"]')
        .first()
        .attr("href");

      const image = $(this).find("img.foto_")?.attr("src");

      const price = parsePrice($(this).find(".koopprijs .kenmerkValue").text());
      const meters = parseSize(
        $(this).find(".woonoppervlakte .kenmerkValue").text()
      );

      const street = $(this).find(".street-address").text();
      const zipcode = $(this).find(".zipcity .postal-code").text();
      const city = $(this).find(".zipcity .locality").text();

      if (path)
        result.push({
          url: "https://www.020makelaars.nl" + path,
          image,
          price,
          meters,
          street,
          zipcode,
          city,
        });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      "Adres:",
      $(".addressInfo").text(),
      $("#Kenmerken").text(),
      $("#Omschrijving").text(),
    ];

    return parseProperties(content);
  },
};
