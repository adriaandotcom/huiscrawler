const cheerio = require("cheerio");
const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  note: "Makelaar gevonden 23 mei 🚲",
  targetUrl: "https://brummermakelaars.nl/aanbod",

  parseHTML: function ($) {
    const result = [];

    const script = $(
      'script#__NEXT_DATA__[type="application/json"]'
    ).contents();

    const json = JSON.parse(script);

    const houses = json.props.pageProps.houses;

    // {
    //   id: '6171510',
    //   objectcode: 'BB11519',
    //   address: '1054 KX Amsterdam',
    //   city: 'AMSTERDAM',
    //   constructionYear: '1996',
    //   houseType: 'bovenwoning',
    //   image: 'https://images.realworks.nl/....jpg',
    //   livingArea: '127 m2 ',
    //   price: '€ 1.595.000 k.k.',
    //   publicatiedatum: '2022-04-28 06:00:00',
    //   rawLivingArea: 127,
    //   rawPrice: 1595000,
    //   rooms: 5,
    //   salesStatus: 'VERKOCHT',
    //   title: 'Vondelkerkstraat 33 '
    // }

    for (const house of houses) {
      const slug = house.title.replace(/\s+/g, "-").toLowerCase();
      const url = `https://brummermakelaars.nl/aanbod/${slug}/${house.objectcode}`;

      if (house.salesStatus !== "BESCHIKBAAR") continue;

      const floor = /beneden/i.test(house.houseType) ? 0 : 1;

      if (house.objectcode)
        result.push({
          url,
          floor,
          image: house.image,
          rooms: house.rooms,
          meters: house.rawLivingArea,
          price: house.rawPrice,
          street: house.title?.trim(),
          year: house.constructionYear,
          city: house.city?.trim(),
          zipcode: house.address?.trim().slice(0, 7),
        });
    }

    return result;
  },

  getAIProperties: async function (fetch, result) {
    const page = await fetch(result.url);
    const html = await page.text();
    const $ = cheerio.load(html);

    const content = [
      $("#tabs--1--panel--1").text(), // Kenmerken
      $("#tabs--1--panel--0").text(), // Omschrijving
    ];

    return parseProperties(content);
  },
};
