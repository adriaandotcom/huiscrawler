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

const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const database = path.join(dataDir, "properties.db");

const { FILTER_PLATFORM, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = process.env;

// Initialize database
let db = new sqlite3.Database(database, (err) => {
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

async function sendTelegramAlert(text, image) {
  const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

  // If the image URL is accessible via a public URL, you can send it with sendPhoto method
  if (image?.startsWith("http://") || image?.startsWith("https://")) {
    await fetch(`${telegramApiUrl}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: image,
        caption: text,
        parse_mode: "Markdown",
      }),
    });
  } else {
    // If no image or image not accessible via a public URL, send a text message
    await fetch(`${telegramApiUrl}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown",
      }),
    });
  }
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

function emoji(likebility) {
  if (!likebility) return "";

  const emojis = {
    1: "😡",
    2: "🤬",
    3: "😠",
    4: "😞",
    5: "😐",
    6: "🙂",
    7: "😊",
    8: "😃",
    9: "😍",
    10: "🥰",
  };

  return emojis[likebility];
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

    const alert = zipcodeObj && (!property.meters || property.meters >= 59);

    if (alert) {
      const k = property.price ? `€${Math.round(property.price / 1000)}k` : "";
      const m = property.meters ? `${property.meters}m2` : "";
      const line = [
        emoji(zipcodeObj?.likebility),
        `${zipcodeObj?.likebility}/10`,
        k,
        m,
        property.street,
        property.floor,
      ]
        .filter(Boolean)
        .join(" ");
      const lines = [line, `[${property.url}](${property.url})]`];

      // Send alert to Telegram
      await sendTelegramAlert(lines.join("\n"), property.image);
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
  console.log(`${new Date().toISOString().slice(0, 16)} Starting crawler...`);

  // Get all config files
  const crawlerDir = path.join(__dirname, "crawlers");
  const files = fs.readdirSync(crawlerDir);
  const configFiles = files.filter((file) => file.endsWith(".js"));

  for (const configFile of configFiles) {
    const config = require(path.join(crawlerDir, configFile));

    // Skip other than FILTER_PLATFORM crawlers
    if (FILTER_PLATFORM && config.platform !== FILTER_PLATFORM) continue;

    if (!config.parseHTML && !config.parseJSON)
      throw new Error(
        `Config ${configFile} does not have a parseHTML or parseJSON function`
      );

    // Fetch initial page to get PHPSESSID cookie
    if (config.baseUrl) await fetchWithCookies(config.baseUrl);

    let options = {};

    if (config.postData) {
      const token = cookieJar
        ?.getCookiesSync(config.baseUrl)
        ?.find((c) => c.key === "__RequestVerificationToken")?.value;

      options = {
        method: "POST",
        body: config.postData.replace(
          /\{\{__RequestVerificationToken\}\}/,
          token || ""
        ),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
        },
      };
    }

    const response = await fetchWithCookies(config.targetUrl, options);

    let result = [];

    try {
      if (config.parseJSON) {
        const json = await response.json();
        result = config.parseJSON(json);
      } else {
        const body = await response.text();
        const $ = cheerio.load(body);
        result = config.parseHTML($);
      }
    } catch (error) {
      console.error(error);
    }

    // Insert into database
    await processResult(result, config);
  }

  db.close();
}

main().catch(console.error);

setInterval(() => {
  main().catch(console.error);
}, 30 * 60 * 1000); // 30 minutes in milliseconds
