const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei tijdens rondje lopen",
  targetUrl: "https://makelaarbert.nu/aanbod/",

  parseHTML: function ($) {
    const result = [];

    $("#entity-results article").each(function () {
      const url = $(this).find('[itemprop="url"]').attr("content");

      const zipcode = $(this).find(".property-address").text().split(",")[0];

      const image = $(this).find(".property-box-image img")?.attr("src");

      result.push({
        url,
        image,
        zipcode,
      });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $("article header").text(),
      $(".summary").text(),
      $(".property-information").text(),
    ]
      .filter(Boolean)
      .join("\n");

    if (!content) return null;

    const properties = await parseProperties(content);

    return properties;
  },
};
