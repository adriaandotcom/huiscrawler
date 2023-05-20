const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 20 mei tijdens rondje lopen",
  targetUrl:
    "https://www.raadsheerbaart.nl/aanbod/woningaanbod/AMSTERDAM/koop/",

  parseHTML: function ($) {
    const result = [];

    $("li.aanbodEntry").each(function () {
      const url =
        "https://www.raadsheerbaart.nl" +
        $(this)
          .find('a[href^="/aanbod/woningaanbod/amsterdam/koop/" i]')
          .first()
          .attr("href");

      const image = $(this).find("img.foto_")?.attr("src");

      result.push({
        url,
        image,
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
    ]
      .filter(Boolean)
      .join("\n");

    if (!content) return null;

    const properties = await parseProperties(content);

    return properties;
  },
};
