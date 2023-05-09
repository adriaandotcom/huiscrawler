module.exports = {
  platform: "ymere",
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
      });
    }

    return result;
  },
};
