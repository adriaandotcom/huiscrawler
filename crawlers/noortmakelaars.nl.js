const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parsePrice, parseSize } = require("../lib/helpers");
const { getZipCode } = require("../lib/google");

module.exports = {
  note: "Makelaar gevonden 20 mei 🚶🏽‍♀️",
  targetUrl: "https://noortmakelaars.nl/aanbod-Amsterdam/",

  parseHTML: function ($) {
    const result = [];

    $(".post-content .fusion-column-wrapper").each(function () {
      const url = $(this)
        .find('a[href^="https://noortmakelaars.nl/" i]')
        .first()
        .attr("href");

      const srcset = $(this).find("img[srcset]").first().attr("srcset");
      const src = $(this).find("img[src]").first().attr("src");

      const image = srcset
        ? srcset?.split(",").pop().trim().split(" ")[0] || src
        : src;

      const street = $(this).find("h2").text();

      // Find p with text "prijs" in it
      const p = $(this)
        .find("p")
        .filter(function () {
          return /prijs/i.test($(this).text());
        })
        .html();

      const price = parsePrice(p?.split("<br>").find((s) => /prijs/i.test(s)));
      const meters = parseSize(
        p?.split("<br>").find((s) => /woonoppervlakte/i.test(s))
      );

      if (url)
        result.push({
          url,
          image,
          price,
          meters,
          street,
          city: "Amsterdam",
        });
    });

    return result;
  },

  enrichCallback: async function (result) {
    if (result.zipcode) return result;

    const address = `${result.street}, ${
      result.city || "Amsterdam"
    }, Netherlands`;

    result.zipcode = await getZipCode(address);

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    return parseProperties($(".post-content").text());
  },
};
