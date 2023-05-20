const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { getZipCode } = require("../lib/google");

module.exports = {
  note: "Makelaar gevonden 19 mei tijdens rondje lopen",
  targetUrl:
    "https://www.makelaarsland.nl/huis-kopen/?_q=Amsterdam&min=&max=900000&verkocht=ja&sort=datum",

  parseHTML: function ($) {
    const result = [];

    $("#propertySearchResults .m-search-result").each(function () {
      const url = $(this)
        .find('a[href^="https://www.makelaarsland.nl/huis-kopen/" i]')
        .attr("href");

      const image = $(this)
        .find("figure .m-search-result__image")
        .first()
        .attr("data-image-src");

      if (url) result.push({ url, image });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $("#houseDetailData").text(),
      $("#houseDetailSpecifications").text(),
      $("#houseDetailDescription").text(),
    ]
      .filter(Boolean)
      .join("\n");

    const properties = await parseProperties(content);
    const address = $(".m-house-detail-data__address").text().trim();
    if (address)
      properties.zipcode = await getZipCode(`${address}, The Netherlands`);
    return properties;
  },
};
