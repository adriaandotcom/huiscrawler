const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 19 mei 🚶🏽‍♀️",
  targetUrl: "https://www.scholten.nl/woningaanbod/",

  parseHTML: function ($) {
    const result = [];

    $(".oxy-dynamic-list a.ct-link").each(function () {
      const url = $(this).attr("href");

      // <div id="div_block-352-321-1" class="ct-div-block" style="background-image:url(https://www.scholten.nl/wp-content/uploads/realworks/141021964-768x512.jpg);background-size: cover;" data-id="div_block-352-321">
      const image = $(this)
        .find('[style*="background-image"]')
        ?.attr("style")
        ?.match(/url\('?(.*?)\)'?/)?.[1];

      if (url) result.push({ url, image });
    });

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $('section[id="informatie"]')?.text()?.trim(),
      $('section[id="kenmerken"]')?.text()?.trim(),
    ];

    return parseProperties(content);
  },
};
