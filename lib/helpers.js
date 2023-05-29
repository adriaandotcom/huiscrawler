module.exports.parseZipcodeCity = (string) => {
  if (typeof string !== "string") return { zipcode: null, city: null };

  const zipcode = /\s?(\d{4}\s?[a-z]{2})/i.exec(string)?.[0];
  const city = string?.replace(zipcode, "").trim();

  if (/^amsterdam\s(.*)\((.*)\)/i.test(city))
    return { zipcode, city: "Amsterdam" };

  return { zipcode, city };
};

module.exports.parsePrice = (string) => {
  if (typeof string !== "string" || !/\d/.test(string)) return null;
  return parseInt(string.replace(/\D/g, ""));
};

module.exports.parseRooms = (string) => {
  if (typeof string !== "string" || !/\d/.test(string)) return null;
  const replaced = string.replace(/(rooms|kamers)/i, "")?.trim();

  // Get first consecutive numbers, e.g. "123 rooms" > "123"
  const firstNumber = replaced.match(/\d+/)?.[0];

  return parseInt(firstNumber);
};

module.exports.parseSize = (string) => {
  if (typeof string !== "string" || !/\d/.test(string)) return null;
  const withoutM2 = string.replace(/m2/, "");

  // Get first consecutive numbers, e.g. "123 m2 4" > "123"
  const firstNumber = withoutM2.match(/\d+/)?.[0];

  return parseInt(firstNumber);
};

module.exports.parseYear = (string) => {
  if (typeof string !== "string" || !/\d{4}/.test(string)) return null;

  // Get first 4 consecutive numbers that start with 19 of 20, e.g. "1900" or "2010"
  const year = string.match(
    /(?:[^0-9]|^)((?:16|17|18|19|20)\d{2})(?:[^0-9]|$)/
  )?.[1];

  return year ? parseInt(year) : null;
};

module.exports.log = (...props) => {
  const date = new Date().toISOString().slice(0, 16);
  const prefix = `=> ${date}`;
  console.log(prefix, ...props);
};
