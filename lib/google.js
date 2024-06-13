const fetch = require("node-fetch");
const { log } = require("./helpers");

const { GOOGLE_MAPS_API_KEY } = process.env;

async function getZipCode(address) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.results[0]) {
      const components = data.results[0].address_components;
      const postalCodeComponent = components.find((component) =>
        component.types.includes("postal_code")
      );

      if (postalCodeComponent) {
        return postalCodeComponent.long_name;
      } else {
        throw new Error(
          "No postal code found for the given address: " + address
        );
      }
    } else {
      throw new Error("No results found for the given address: " + address);
    }
  } catch (error) {
    log(error);
    return null;
  }
}

// get map image from address
async function getMapImage({
  address,
  zoom = 14,
  markerColor = "red",
  markerLabel = "",
  width = 640,
  height = 640,
  scale = 2,
  icon = "https://adriaan.b-cdn.net/images/misc/pin-1x.png",
}) {
  if (!address) return null;

  const mapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  mapUrl.searchParams.set("center", address);
  mapUrl.searchParams.set("zoom", zoom);
  mapUrl.searchParams.set("size", `${width}x${height}`);
  mapUrl.searchParams.set("scale", scale);
  mapUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  mapUrl.searchParams.set(
    "markers",
    icon
      ? `icon:${icon}|${address}`
      : `color:${markerColor}|label:${markerLabel}|${address}`
  );

  log(
    `Requesting Google Maps image: ${mapUrl
      .toString()
      .replace(GOOGLE_MAPS_API_KEY, "***")} for address: ${address}`
  );

  try {
    const mapResponse = await fetch(mapUrl);
    if (mapResponse.status !== 200) return null;
    return mapResponse.buffer();
  } catch (error) {
    log(error);
    return null;
  }
}

module.exports = { getZipCode, getMapImage };
