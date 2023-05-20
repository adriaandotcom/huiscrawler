const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Via Dennis van de Hypotheker",
  puppeteer: true,
  targetUrl:
    "https://www.jaap.nl/koophuizen/noord-holland/groot-amsterdam/filter",

  parseHTML: function ($) {
    const result = [];

    $(".listings_grid app-listing-item").each(function () {
      const path = $(this).find('a[href^="/te-koop/"]').first().attr("href");

      const image = $(this).find("img.photo").first().attr("src");

      const priceText = $(this).find(".price").first().text();
      const price = priceText ? parseInt(priceText.replace(/\D/g, "")) : null;

      // get address.straat
      const street = $(this).find(".straat").first().text().trim();
      const zipcodeAndCity = $(this).find(".gemeente").first().text().trim();

      // Get zipcode and city from "1059 SR Amsterdam" > "1059 SR" and "Amsterdam"
      const zipcode = /(\d{4}\s?[a-z]{2})/i.exec(zipcodeAndCity)?.[0];
      const city = zipcodeAndCity.replace(zipcode, "").trim();

      const sizeText = $(this)
        .find(".item-icon")
        .filter(function () {
          return /m²/i.test($(this).text());
        })
        .find("div")
        .text()
        .trim();

      const meters = sizeText ? parseInt(sizeText.replace(/\D/g, "")) : null;

      if (path)
        result.push({
          url: `https://www.jaap.nl${path}`,
          image,
          street,
          zipcode,
          meters,
          price,
          city,
        });
    });

    return result;
  },

  getAIProperties: async function (execute, result) {
    const html = await execute({ url: result.url });
    const $ = cheerio.load(html);

    const content = [
      $(".listing-detail-header").text(),
      $(".price").text(),
      $(".details").text(),
      $(".main-features").text(),
      $(".description").text(),
    ].join("\n");

    return parseProperties(content);
  },
};
