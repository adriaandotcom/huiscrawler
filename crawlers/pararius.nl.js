const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parseZipcodeCity, parseSize } = require("../lib/helpers");

module.exports = {
  enabled: false,
  puppeteer: true,
  targetUrl: "https://www.pararius.nl/koopwoningen/amsterdam",

  parseHTML: function ($) {
    const result = [];

    $(".search-list .listing-search-item").each(function () {
      const path = $(this)
        .find('a[href^="/huis-te-koop/amsterdam/"]')
        .first()
        .attr("href");

      const srcset = $(this)
        .find("wc-picture noscript source")
        .first()
        .attr("srcset");
      const image = srcset
        ? srcset.split(",")[0]?.trim().split(" ")[0]?.replace("&amp;", "&")
        : null;

      const price = parsePrice(
        $(this).find(".listing-search-item__price").first().text()
      );

      // get address.straat
      const street = $(this)
        .find(".listing-search-item__link--title")
        .first()
        .text()
        .trim();
      const zipcodeAndCity = $(this)
        .find(".listing-search-item__sub-title")
        .first()
        .text()
        .trim();

      const { zipcode, city } = parseZipcodeCity(zipcodeAndCity);

      const size = parseSize(
        $(this).find(".illustrated-features__item--surface-area").text().trim()
      );
      const year = parseYear(
        $(this)
          .find(".illustrated-features__item--construction-period")
          .text()
          .trim()
      );

      const rooms = parseRooms(
        $(this)
          .find(".illustrated-features__item--number-of-rooms")
          .text()
          .trim()
      );

      if (path)
        result.push({
          url: `https://www.pararius.nl${path}`,
          image,
          street,
          zipcode,
          meters: size,
          price,
          city,
          year,
          rooms,
        });
    });

    return result;
  },

  getAIProperties: async function (execute, result) {
    const html = await execute({ url: result.url });
    const $ = cheerio.load(html);

    const content = [
      $(".page__details--transfer").text(),
      $(".page__details--dimensions").text(),
      $(".page__details--construction").text(),
      $(".page__details--layout").text(),
      $(".page__details--outdoor").text(),
      $(".page__details--energy").text(),
      $(".page__details--storage").text(),
      $(".page__details--parking").text(),
      $(".page__details--garage").text(),
      $(".listing-detail-description__content").text(),
    ];

    return parseProperties(content);
  },
};
