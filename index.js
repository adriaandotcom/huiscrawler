const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { CookieJar } = require("tough-cookie");
const sqlite3 = require("sqlite3").verbose();
const { zipcodes } = require("./constants");
const fs = require("fs");
const path = require("path");

const cookieJar = new CookieJar();
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// Initialize database
let db = new sqlite3.Database("./properties.db", (err) => {
  if (err) console.error(err.message);
});

// Create table
db.run(`CREATE TABLE IF NOT EXISTS properties(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT,
    url TEXT UNIQUE,
    image TEXT,
    floor TEXT,
    street TEXT,
    zipcode TEXT,
    meters INTEGER,
    price INTEGER
)`);

// get row async
async function getRow(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function fetchWithCookies(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  options.headers["User-Agent"] = userAgent;

  // Use `tough-cookie` to include cookies in request
  const cookies = await cookieJar.getCookieString(url);
  options.headers["Cookie"] = cookies;

  const response = await fetch(url, options);

  // Save cookies from response
  const setCookies = response.headers.raw()["set-cookie"];
  if (setCookies) {
    await Promise.all(
      setCookies.map((cookie) => cookieJar.setCookie(cookie, url))
    );
  }

  return response;
}

async function processResult(result, config) {
  // Insert results into database
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO properties(platform, url, image, floor, street, zipcode, meters, price) VALUES(?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (let property of result) {
    // Check if property.url is in database

    const row = await getRow(`SELECT * FROM properties WHERE url = ?`, [
      property.url,
    ]);

    if (row) continue;

    // Run enrichCallback if it exists
    if (config.enrichCallback) {
      try {
        property = await config.enrichCallback(property, fetchWithCookies);
      } catch (error) {
        console.error(error);
      }
    }

    // Check if the zipcode is in your list
    const zipcodeObj = zipcodes.find(
      (z) => z.code === parseInt(property.zipcode)
    );

    const alert =
      (!property.zipcode || zipcodeObj) &&
      (!property.meters || property.meters >= 59);

    if (alert) {
      const k = property.price ? `€${Math.round(property.price / 1000)}k` : "";
      const m = property.meters ? `${property.meters}m2` : "";
      const line = [
        `${zipcodeObj?.likebility}/10`,
        k,
        m,
        property.street,
        property.floor,
      ]
        .filter(Boolean)
        .join(" ");
      const lines = [line, property.url, property.image];
      console.log(lines.join("\n"));
    }

    stmt.run(
      config.platform,
      property.url,
      property.image,
      property.floor,
      property.street,
      property.zipcode,
      property.meters || null,
      property.price || null,
      function (err) {
        if (err) return console.log(err.message);
      }
    );
  }

  stmt.finalize();
}

async function main() {
  // Get all config files
  const crawlerDir = path.join(__dirname, "crawlers");
  const files = fs.readdirSync(crawlerDir);
  const configFiles = files.filter((file) => file.endsWith(".js"));

  for (const configFile of configFiles) {
    const config = require(path.join(crawlerDir, configFile));

    // Skip dekey crawler
    // if (config.platform !== "ymere") continue;

    if (!config.parseHTML && !config.parseJSON)
      throw new Error(
        `Config ${configFile} does not have a parseHTML or parseJSON function`
      );

    // Fetch initial page to get PHPSESSID cookie
    if (config.baseUrl) await fetchWithCookies(config.baseUrl);

    const options = config.postData
      ? {
          method: "POST",
          body: config.postData,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      : {};

    const response = await fetchWithCookies(config.targetUrl, options);

    let result = [];

    if (config.parseJSON) {
      const json = await response.json();
      result = config.parseJSON(json);
    } else {
      const body = await response.text();
      const $ = cheerio.load(body);
      result = config.parseHTML($);
    }

    // Insert into database
    await processResult(result, config);
  }

  db.close();
}

main().catch(console.error);
