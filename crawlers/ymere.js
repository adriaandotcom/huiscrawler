const { parseProperties } = require("../lib/chatgpt");

module.exports = {
  platform: "ymere",
  note: "Via Dennis van de Hypotheker",
  baseUrl: "https://aanbod.ymere.nl/aanbod/koopwoningen/",
  targetUrl:
    "https://aanbod.ymere.nl/portal/publication/frontend/getallobjects/format/json",
  postData: "dwellingTypeCategory=woning",
  parseJSON: function (json) {
    const result = [];

    for (const property of json.result) {
      const dwelling = property.dwellings?.[0];

      if (
        dwelling?.rentBuy !== "Koop" ||
        dwelling?.toewijzingStatus.inCode !== "Gepubliceerd"
      )
        continue;

      const image = property.pictures[0]?.uri
        ? "https://aanbod.ymere.nl" + property.pictures[0]?.uri
        : null;

      result.push({
        url: `https://aanbod.ymere.nl/aanbod/koopwoningen/details/?publicationID=${property.id}`,
        image,
        street: property.title,
        zipcode: dwelling?.postalcode,
        meters: dwelling?.areaDwelling,
        price: property.sellingPrice[0] || dwelling?.sellingPrice,
        floor: property.floor[0]?.name,
        _id: property.id,
      });
    }

    return result;
  },

  getAIProperties: async function (fetchWithCookies, result) {
    if (!result._id) return null;

    const options = {
      method: "POST",
      body: `id=${result._id}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
    };
    const response = await fetchWithCookies(
      "https://aanbod.ymere.nl/portal/publication/frontend/getobject/format/json",
      options
    );
    const json = await response.json();
    const description = json.result?.description;
    return parseProperties(description);
  },
};
