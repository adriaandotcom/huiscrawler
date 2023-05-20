const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");
const { parseZipcodeCity, parsePrice } = require("../lib/helpers");

module.exports = {
  note: "Makelaar gevonden 20 mei tijdens rondje lopen",
  targetUrl: "https://benuwmakelaar.nl/wp-admin/admin-ajax.php",
  postData:
    "action=jet_smart_filters&provider=jet-engine%2Fdefault&query%5B_meta_query_koop-of-huur%5D=Koop&query%5B_tax_query_plaats%5D=23&query%5B_meta_query_woon-oppervlakte%7Ccompare-greater%5D=50&defaults%5Bpost_status%5D%5B%5D=publish&defaults%5Bpost_type%5D=huizen-aanbod&defaults%5Bposts_per_page%5D=9&defaults%5Bpaged%5D=1&defaults%5Bignore_sticky_posts%5D=1&defaults%5Bmeta_query%5D%5B0%5D%5Bkey%5D=status&defaults%5Bmeta_query%5D%5B0%5D%5Bvalue%5D=verkocht&defaults%5Bmeta_query%5D%5B0%5D%5Bcompare%5D=!%3D&defaults%5Bmeta_query%5D%5B0%5D%5Btype%5D=CHAR&defaults%5Bmeta_query%5D%5B1%5D%5Bkey%5D=status&defaults%5Bmeta_query%5D%5B1%5D%5Bvalue%5D=prospect&defaults%5Bmeta_query%5D%5B1%5D%5Bcompare%5D=!%3D&defaults%5Bmeta_query%5D%5B1%5D%5Btype%5D=CHAR&defaults%5Bmeta_query%5D%5B2%5D%5Bkey%5D=status&defaults%5Bmeta_query%5D%5B2%5D%5Bvalue%5D=verhuurd&defaults%5Bmeta_query%5D%5B2%5D%5Bcompare%5D=!%3D&defaults%5Bmeta_query%5D%5B2%5D%5Btype%5D=CHAR&defaults%5Bmeta_query%5D%5B3%5D%5Bkey%5D=status&defaults%5Bmeta_query%5D%5B3%5D%5Bvalue%5D=Ingetrokken&defaults%5Bmeta_query%5D%5B3%5D%5Bcompare%5D=!%3D&defaults%5Bmeta_query%5D%5B3%5D%5Btype%5D=CHAR&defaults%5Bmeta_query%5D%5Brelation%5D=AND&settings%5Blisitng_id%5D=105&settings%5Bcolumns%5D=3&settings%5Bcolumns_tablet%5D=2&settings%5Bcolumns_mobile%5D=1&settings%5Bpost_status%5D%5B%5D=publish&settings%5Buse_random_posts_num%5D=&settings%5Bposts_num%5D=9&settings%5Bmax_posts_num%5D=9&settings%5Bnot_found_message%5D=No+data+was+found&settings%5Bis_masonry%5D=&settings%5Bequal_columns_height%5D=&settings%5Buse_load_more%5D=&settings%5Bload_more_id%5D=&settings%5Bload_more_type%5D=click&settings%5Bload_more_offset%5D%5Bunit%5D=px&settings%5Bload_more_offset%5D%5Bsize%5D=0&settings%5Bloader_text%5D=&settings%5Bloader_spinner%5D=&settings%5Buse_custom_post_types%5D=&settings%5Bcustom_post_types%5D=&settings%5Bhide_widget_if%5D=&settings%5Bcarousel_enabled%5D=&settings%5Bslides_to_scroll%5D=1&settings%5Barrows%5D=true&settings%5Barrow_icon%5D=fa+fa-angle-left&settings%5Bdots%5D=&settings%5Bautoplay%5D=true&settings%5Bautoplay_speed%5D=5000&settings%5Binfinite%5D=true&settings%5Bcenter_mode%5D=&settings%5Beffect%5D=slide&settings%5Bspeed%5D=500&settings%5Binject_alternative_items%5D=&settings%5Bscroll_slider_enabled%5D=&settings%5Bscroll_slider_on%5D%5B%5D=desktop&settings%5Bscroll_slider_on%5D%5B%5D=tablet&settings%5Bscroll_slider_on%5D%5B%5D=mobile&settings%5Bcustom_query%5D=&settings%5Bcustom_query_id%5D=&settings%5B_element_id%5D=&props%5Bfound_posts%5D=17&props%5Bmax_num_pages%5D=2&props%5Bpage%5D=1",

  parseJSON: function (json) {
    const $ = cheerio.load(json.content);

    const result = [];

    $(".jet-listing-grid__item").each(function () {
      const url = $(this)
        .find('a[href^="https://benuwmakelaar.nl/huizen-aanbod/"]')
        .first()
        .attr("href");

      const style = $(this).find("style").first().html();

      // parse URL from "background-image: url("https://benuwmakelaar.nl/wp-content/uploads/2023/04/140566204.jpg");"
      const image = style?.match(/url\((.*?)\)/)?.[1]?.replace(/['"]+/g, "");

      const titles = $(this)
        .find(".elementor-heading-title")
        .map(function () {
          return $(this).text().trim();
        });

      const street = titles[1];
      const zipcodeAndCity = titles[2];
      const priceText = titles[3];

      const { zipcode, city } = parseZipcodeCity(zipcodeAndCity);
      const price = parsePrice(priceText);

      if (url) result.push({ url, image, street, zipcode, city, price });
    });

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    const page = await fetchWithCookies(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const contents = [
      $("section#kenmerken")?.text()?.trim(),
      $("section#omschrijving")?.text()?.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    return parseProperties(contents);
  },
};
