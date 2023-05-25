const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parsePrice } = require("../lib/helpers");

module.exports = {
  note: "Makelaar gevonden 23 mei 🚲",
  targetUrl: "https://jamakelaardij.nl/woningen/",

  parseHTML: function ($) {
    const result = [];

    $("#entity-items .property__item").each(function () {
      const url = $(this)
        .find('.property__item a[href^="https://jamakelaardij.nl/woning/"]')
        .first()
        .attr("href");

      const image = $(this)
        .find("img.attachment-content_lg")
        ?.first()
        ?.attr("src");

      const metaText = $(this).find(".overview-meta").first().text();
      const floor = /(benedenwoning|benedenhuis)/i.test(metaText) ? 0 : 1;

      const city = metaText.split("|")?.[1]?.trim();

      const price = parsePrice($(this).find(".price").first().text());
      const street = $(this).find("h5").first().text();

      if (url)
        result.push({
          url,
          floor,
          image,
          price,
          street,
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
      $(".bannerBox .content").text(),
      $(".kenmerken").text(),
      $(".omschrijving").text(),
    ];

    return parseProperties(content);
  },
};
