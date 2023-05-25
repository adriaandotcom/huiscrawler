const cheerio = require("cheerio");
const { getZipCode } = require("../lib/google");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  platform: "dealliantie",
  note: "Via Dennis van de Hypotheker",
  baseUrl: "https://ik-zoek.de-alliantie.nl/kopen/",
  targetUrl: "https://ik-zoek.de-alliantie.nl/getproperties",
  postData:
    "__RequestVerificationToken={{__RequestVerificationToken}}&type=kopen&city=&maxprice=0&minrooms=0&street=&minsurface=0&maxsurface=0&page=1&sorting=date&order=desc",
  parseJSON: function (json) {
    const result = [];

    for (const property of json.data) {
      const isNew = property?.status?.find((s) => s.type === "new");

      if (!isNew) continue;

      const image = property?.images.find((i) => i.url)?.url?.split("?")[0];
      const url = `https://ik-zoek.de-alliantie.nl/${property.url}`;

      const city = property.url.split("/")[1];

      result.push({
        url,
        image: image ? `https://ik-zoek.de-alliantie.nl${image}` : null,
        street: property.address,
        zipcode: null,
        meters: property?.size,
        price: property.price?.replace(/\D/g, ""),
        floor: null,
        _city: city || "Amsterdam",
      });
    }

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    const page = await fetchWithCookies(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $(".property-summary")?.text()?.trim(),
      $(".property-tabs__body")?.text()?.trim(),
    ];

    $(".table.table--features")?.each((i, el) => {
      content.push($(el)?.text()?.trim());
    });

    return parseProperties(content);
  },
};
