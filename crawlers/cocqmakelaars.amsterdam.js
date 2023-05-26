const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl: "https://www.cocqmakelaars.amsterdam/aanbod-huis-kopen/",

  parseHTML: function ($) {
    const result = [];

    $('article a[href^="https://www.cocqmakelaars.amsterdam/aanbod/"]').each(
      function () {
        const url = $(this).attr("href");

        // <div class="foto" style="background-image: url('https://images.realworks.nl/servlets/images/media.objectmedia/130635845.jpg?portalid=5312&check=api_sha256%3Acec4b2bad33e7a518bda136927bcc82129afbcc2ac953e7e92cb92f481f8771b&resize=4');">
        const image = $(this).find("img.attachment-portfolio")?.attr("src");

        if (url) result.push({ url, image });
      }
    );

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const column = $(".entry-content-wrapper .flex_column")
      .filter(function () {
        return $(this).text().includes("Postcode");
      })
      .text()
      .trim();

    return parseProperties(column);
  },
};
