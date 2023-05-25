const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl: "https://snijmakelaardij.nl/aanbod/koop/amsterdam/beschikbaar/",

  parseHTML: function ($) {
    const result = [];

    $(
      '#aanbod .item.beschikbaar .thumb a[href^="/object/koop/appartement/amsterdam/"]'
    ).each(function () {
      const url = "https://snijmakelaardij.nl" + $(this).attr("href");

      const image =
        "https://snijmakelaardij.nl" + $(this).find("img.img")?.attr("src");

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

    $(".sidebar .top .shortcuts").remove();

    const content = [
      $(".sidebar .top")?.text()?.trim(),
      $(".description")?.text()?.trim(),
      $(".specs")?.text()?.trim(),
    ];

    return parseProperties(content);
  },
};
