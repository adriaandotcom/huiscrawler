const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parsePrice, parseSize, parseRooms } = require("../lib/helpers");

module.exports = {
  note: "Makelaar gevonden 22 mei 🚲",
  targetUrl: "https://www.vastburg.nl/wonen/",

  parseHTML: function ($) {
    const result = [];

    $(".properties div.object").each(function () {
      const url = $(this)
        .find('a[href^="https://www.vastburg.nl/woningen/" i]')
        .first()
        .attr("href");

      const image = $(this).find("img[data-src]").first().attr("data-src");

      const street = $(this).find(".object-street").text();
      const housenumber = $(this).find(".object-housenumber").text();
      const addition = $(this).find(".object-housenumber-addition").text();
      const city = $(this).find(".object-place").text();

      const price = parsePrice($(this).find(".object-price-value").text());
      const meters = parseSize(
        $(this)
          .find(".object-feature-woonoppervlakte .object-feature-info")
          .text()
      );
      const rooms = parseRooms(
        $(this).find(".object-feature-aantalkamers .object-feature-info").text()
      );

      if (url)
        result.push({
          url,
          image,
          price,
          meters,
          rooms,
          street: `${street} ${housenumber} ${addition}`.trim(),
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
      $(".object-detail-header").text(),
      $(".object-detail-features-list").text(),
      $(".object-detail-description").text(),
    ];

    return parseProperties(content);
  },
};
