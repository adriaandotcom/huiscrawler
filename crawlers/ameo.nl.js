const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl: "https://ameo.nl/ons-aanbod/",

  parseHTML: function ($) {
    const result = [];

    $(
      '.avia_codeblock .woningitem[data-status="beschikbaar" i][data-adres_plaats="amsterdam" i]'
    ).each(function () {
      const url = $(this).attr("data-woningurl");

      // <div class="foto" style="background-image: url('https://images.realworks.nl/servlets/images/media.objectmedia/130635845.jpg?portalid=5312&check=api_sha256%3Acec4b2bad33e7a518bda136927bcc82129afbcc2ac953e7e92cb92f481f8771b&resize=4');">
      const image = $(this)
        .find('[style*="background-image"]')
        ?.attr("style")
        ?.match(/url\('?(.*?)\)'?/)?.[1];

      const priceText = $(this).find('[title="prijs"]').text().trim();
      // get only numbers from text
      const price = priceText?.includes("-")
        ? priceText.split("-")[1].match(/\d+/g).map(Number).join("")
        : null;

      result.push({
        url,
        image,
        price,
      });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const contents = [
      $("#adres")?.text()?.trim(),
      $(".specific")?.text()?.trim(),
      $("#container_readmorefulltext")?.text()?.trim(),
    ].filter((c) => c);

    if (contents.length === 0) return null;

    const properties = await parseProperties(contents.join(" \n "));

    return properties;
  },
};
