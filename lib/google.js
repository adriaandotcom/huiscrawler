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
  const encodedAddress = encodeURIComponent(address);
  const mapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  mapUrl.searchParams.append("center", encodedAddress);
  mapUrl.searchParams.append("zoom", zoom);
  mapUrl.searchParams.append("size", `${width}x${height}`);
  mapUrl.searchParams.append("scale", scale);
  mapUrl.searchParams.append("key", GOOGLE_MAPS_API_KEY);
  mapUrl.searchParams.append(
    "markers",
    icon
      ? `icon:${icon}|${encodedAddress}`
      : `color:${markerColor}|label:${markerLabel}|${encodedAddress}`
  );

  try {
    const mapResponse = await fetch(mapUrl);
    if (mapResponse.status !== 200) return null;
    const mapBuffer = await mapResponse.buffer();
    return mapBuffer;
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

module.exports = { getZipCode, getMapImage };