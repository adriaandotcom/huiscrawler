const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden op 19 mei tijdens rondje lopen",
  targetUrl: "https://jlgrealestate.com/woningen/koop/",

  parseHTML: function ($) {
    const result = [];

    $("#entity-items article").each(function () {
      const url = $(this)
        .find('a[href^="https://jlgrealestate.com/woningen/koop/amsterdam/"]')
        .attr("href");

      const image = $(this)
        .find("figure img.card__image")
        .first()
        .attr("data-flickity-lazyload");

      result.push({ url, image });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $(".woning__header").text(),
      $("section#characteristics").text(),
      $("section#description").text(),
    ]
      .filter(Boolean)
      .join("\n");

    return parseProperties(content);
  },
};
