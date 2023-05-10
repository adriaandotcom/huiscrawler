const { getZipCode } = require("../tools");

module.exports = {
  platform: "de-alliantie",
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

  enrichCallback: async function (result) {
    if (result.zipcode) return result;

    const address = `${result.street}, ${result._city}, Netherlands`;
    const zip = await getZipCode(address);
    result.zipcode = zip;

    return result;
  },
};
