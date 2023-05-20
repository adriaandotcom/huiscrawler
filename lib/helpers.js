module.exports.parseZipcodeCity = (string) => {
  if (typeof string !== "string") return { zipcode: null, city: null };

  const zipcode = /\s?(\d{4}\s?[a-z]{2})/i.exec(string)?.[0];
  const city = string?.replace(zipcode, "").trim();
  return { zipcode, city };
};

module.exports.parsePrice = (string) => {
  if (typeof string !== "string" || !/\d/.test(string)) return null;
  return parseInt(string.replace(/\D/g, ""));
};

module.exports.parseSize = (string) => {
  if (typeof string !== "string" || !/\d/.test(string)) return null;
  const withoutM2 = string.replace(/m2/, "");

  // Get first consecutive numbers, e.g. "123 m2 4" > "123"
  const firstNumber = withoutM2.match(/\d+/)?.[0];

  return parseInt(firstNumber);
};
