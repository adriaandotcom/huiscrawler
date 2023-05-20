const cheerio = require("cheerio");
const { getZipCode } = require("../lib/google");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  platform: "marinavanschaik",
  targetUrl: "https://www.marinavanschaik.nl/",

  parseHTML: function ($) {
    const result = [];

    $("#properties .prop").each(function () {
      const street = $(this).find("h3.street_value")?.text()?.trim();
      const city = $(this).find("h4")?.text()?.trim();
      const status = $(this).find(".status")?.text()?.trim();
      const url = $(this).find("a").attr("href");
      const image = $(this).find(".thumb a img").attr("src");
      const price = $(this).find("table.meta .price_value")?.text()?.trim();
      const rooms = $(this).find("table.meta .num_rooms")?.text()?.trim();
      const meters = $(this)
        .find("table.meta .surface_area_value")
        ?.text()
        ?.trim();

      if (/verkocht/i.test(status)) return;

      const base = "https://www.marinavanschaik.nl";

      result.push({
        url: url ? `${base}${url}` : null,
        image: image ? `${base}${image}` : null,
        street,
        zipcode: null,
        meters,
        price,
        rooms,
        _city: city || "Amsterdam",
      });
    });

    return result;
  },

  enrichCallback: async function (result) {
    if (result.zipcode) return result;

    const address = `${result.street}, ${result._city}, Netherlands`;
    const zip = await getZipCode(address);
    result.zipcode = zip;

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    const url = result.url.replace(/\/$/, "") + /omschrijving/;

    const page = await fetchWithCookies(url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const contents = [
      $("#meta .data")?.text()?.trim(),
      $(".view_content")?.text()?.trim(),
    ].filter((c) => c);

    if (contents.length === 0) return null;

    const properties = await parseProperties(contents.join(" \n "));

    return properties;
  },
};
