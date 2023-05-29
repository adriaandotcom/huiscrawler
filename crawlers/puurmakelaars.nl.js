const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parsePrice, parseSize, parseRooms } = require("../lib/helpers");

module.exports = {
  note: "Via Funda makelaar",
  puppeteer: false,
  targetUrl:
    "https://www.puurmakelaars.nl/wp-admin/admin-ajax.php?action=add_get_ajax_search&keyword=0&ownership_type=1&paramtype=0&rel=0&use_map_latlng=0&map_lat_lng=((51.943658317625925%2C+4.451964742768215)%2C+(52.78555837723192%2C+5.25808656894009))&house_group=0&house_type=0&house_subtype=0&house_period=0&house_metrics=0&plot_metrics=0&house_bedrooms=0&house_situation=0&house_gardenposition=0&transaction_acceptance=0&garage=0&insulation=0&recently_sold=0&new=0&tags=0&price_low=0&price_high=0&returntype=data&sortby=DATE&visiting_days=0&condition=0&type=undefined&ptype=undefined&ids=0&pageOffset=",

  parseHTML: function ($) {
    const result = [];

    $(".pm-property").each(function () {
      const url = $(this).attr("data-href");
      const image = $(this).attr("data-media");

      const price = parsePrice($(this).attr("data-price"));
      const title = $(this).attr("data-title");

      const [street, city] = title?.split(",").map((s) => s.trim()) ?? [];

      const attributes = $(this).find("p.grid-column").text();

      const meters = parseSize(attributes.match(/(\d+)\s+m2/i)?.[1]);
      const rooms = parseRooms(attributes.match(/(\d+)\s+slaapkamers?/i)?.[1]);

      if (url)
        result.push({
          url,
          image,
          street,
          meters,
          rooms,
          price,
          city,
        });
    });

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    const page = await fetchWithCookies(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [$(".pm-property-alldetails").text(), $("#content").text()];

    return parseProperties(content);
  },
};
