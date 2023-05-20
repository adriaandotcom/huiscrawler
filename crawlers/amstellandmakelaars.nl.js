const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden op 19 mei tijdens rondje lopen",
  targetUrl:
    "https://www.amstellandmakelaars.nl/woningaanbod/koop?availability=1&orderby=8",
  postData: "forsaleorrent=FOR_SALE&orderby=8&take=12&availability=Available",

  parseHTML: function ($) {
    const result = [];

    $(".object_list article").each(function () {
      const path = $(this)
        .find('a[href^="/woningaanbod/koop/amsterdam/"]')
        .first()
        .attr("href");
      const url = "https://www.amstellandmakelaars.nl" + path;

      const srcset = $(this).find("img[srcset]").first().attr("srcset");
      const image = srcset?.split(",")[0].split(" ")[0];
      const street = $(this).find(".street").first().text().trim();
      const zipcode = $(this).find(".zipcode").first().text().trim();

      if (path) result.push({ url, image, street, zipcode });
    });

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    const page = await fetchWithCookies(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const contents = [
      $(".obj_address")?.text()?.trim(),
      $(".object_price")?.text()?.trim(),
      $("#nav-features")?.text()?.trim(),
      $(".description")?.text()?.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    return parseProperties(contents);
  },
};
