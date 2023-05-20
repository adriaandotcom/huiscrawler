const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { getZipCode } = require("../lib/google");

module.exports = {
  note: "Makelaar gevonden 19 mei tijdens rondje lopen",
  targetUrl: "https://yourhome.nl/aanbod/koopwoningen",

  parseHTML: function ($) {
    const result = [];

    $("#entity-results .house").each(function () {
      const url = $(this)
        .find('a[href^="https://yourhome.nl/aanbod/koopwoningen/"]')
        .first()
        .attr("href");

      const image = $(this).find(".photos__image").first().attr("src");
      const street = $(this).find(".house__address").text();
      const status = $(this).find(".house__status").text();

      if (status !== "Beschikbaar") return;

      result.push({ url, image, street });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [$(".detail").text(), $(".characteristics").text()]
      .filter(Boolean)
      .join("\n");

    const street = result.street || $(".detail__title").text();
    const city = $(".detail__place").text().split("|")[0];

    const properties = await parseProperties(content);

    properties.zipcode = await getZipCode(
      `${street}, ${city}, The Netherlands`
    );

    return properties;
  },
};
