module.exports = {
  platform: "rochdale",
  baseUrl: null,
  targetUrl:
    "https://search.hexia.io/api/v2/facets/bu-kcp-ksp-rochdale-web/1-public/unit/nl/unit?key=buy&is_advertised=1&unit_type=1&selling_price_min=200000&selling_price_max=800000&from=0&sort[direction]=asc&sort[field]=fields.street&size=12&bypass=house_type,energy_label&results=1",
  parseJSON: function (json) {
    const result = [];

    for (const property of json.hits.hits) {
      const { fields } = property._source;

      if (fields.status !== "Beschikbaar") continue;

      result.push({
        url: `https://www.rochdale.nl/kopen#/${fields.unit_path_segment}`,
        image: fields.list_image,
        street: fields.name,
        zipcode: null,
        meters: fields.total_area,
        price: fields.selling_price,
        _raw: property._source.fields,
      });
    }

    return result;
  },

  // Run this when raw is not found in database
  enrichCallback: async function (result, fetchWithCookies) {
    const url = `https://www.rochdale.nl/unitdetails?path-segment=${result._raw.unit_path_segment}`;
    const response = await fetchWithCookies(url);
    const json = await response.json();
    result.zipcode = json.postalCode;
    return result;
  },
};
