const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  platform: "funda",
  puppeteer: true,
  targetUrl:
    "https://www.funda.nl/zoeken/koop?selected_area=%5B%22amsterdam%22%5D&price=%22-700000%22&floor_area=%2267-%22&availability=%5B%22available%22%5D&exterior_space_type=%5B%22garden%22%5D&publication_date=%221%22",

  parseHTML: function ($) {
    const result = [];

    $('[componentid="search_result"] [data-test-id="search-result-item"]').each(
      function () {
        const url = $(this)
          .find('a[data-test-id="object-image-link"]')
          .attr("href");
        const street = $(this)
          .find('[data-test-id="street-name-house-number"]')
          .text()
          .trim();
        const zipcode = $(this)
          .find('[data-test-id="postal-code-city"]')
          .text()
          .trim()
          .split("\n")[0]
          ?.trim();
        const priceText = $(this).find('[data-test-id="price-sale"]').text();

        // get only numbers from price
        const price = priceText ? parseInt(priceText.replace(/\D/g, "")) : null;

        // first first li item with text that contains m²
        const metersText = $(this).find('li:contains("m²")').first().text();
        const meters = metersText
          ? parseInt(metersText.replace(/\D/g, ""))
          : null;

        const image = $(this)
          .find("img")
          .attr("srcset")
          .split(",")
          .pop()
          .split(" ")[0];

        result.push({
          url,
          image,
          street,
          zipcode,
          meters,
          price,
        });
      }
    );

    return result;
  },

  getAIProperties: async function (execute, result) {
    const html = await execute({ url: result.url });
    const $ = cheerio.load(html);

    $('[data-track-click="Mortgage Calculation Tool Clicked"]').remove();
    $(
      ".object-primary [data-vue-container]:contains('Voeg mijn huis toe')"
    ).remove();
    $("[app-waardecheck-entry-point]").remove();
    $(".mortgage-lead-cta").remove();
    $("[data-object-kenmerken-handle]").remove();
    $("[data-object-description-config]").remove();
    $("script[data-i18n]").remove();
    $('[data-optimizely-id="mortgage-notification"]').remove();
    $(".hidden").remove();
    $(".is-hidden").remove();
    $(".advertisement").remove();

    const content = $(".object-primary").text();
    return parseProperties(content);
  },
};
