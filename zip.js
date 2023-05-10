const fetch = require("node-fetch");

const { GOOGLE_MAPS_API_KEY } = process.env;

async function getZipCode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.results[0]) {
      const components = data.results[0].address_components;
      const postalCodeComponent = components.find((component) =>
        component.types.includes("postal_code")
      );

      if (postalCodeComponent) {
        return postalCodeComponent.long_name;
      } else {
        throw new Error("No postal code found for the given address");
      }
    } else {
      throw new Error("No results found for the given address");
    }
  } catch (error) {
    console.error(error.message);
  }
}

// Usage
getZipCode("Prinsengracht 263, Amsterdam")
  .then((zipCode) => console.log(zipCode))
  .catch((error) => console.error(error));
