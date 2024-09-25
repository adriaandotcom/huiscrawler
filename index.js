const http = require("http");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { CookieJar } = require("tough-cookie");
const sqlite3 = require("sqlite3").verbose();
const { zipcodes } = require("./lib/constants");
const fs = require("fs");
const path = require("path");
const { sendTelegramAlert } = require("./lib/telegram");
const { getMapImage, getZipCode } = require("./lib/google");

const { Cluster } = require("puppeteer-cluster");
const vanillaPuppeteer = require("puppeteer");
const { addExtra } = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const { log } = require("./lib/helpers");

const cookieJar = new CookieJar();
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const database = path.join(dataDir, "properties.db");

const {
  FILTER_PLATFORM,
  PUPPETEER_EXECUTABLE_PATH,
  NODE_ENV,
  PORT = "3008",
} = process.env;

// Initialize database
const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(database, (error) => {
      if (error) reject(error);
    });

    // Create table
    db.run(
      `CREATE TABLE IF NOT EXISTS properties(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        platform TEXT,
        url TEXT UNIQUE,
        image TEXT,
        floor TEXT,
        street TEXT,
        zipcode TEXT,
        meters INTEGER,
        price INTEGER,
        garden TEXT,
        rooftarrace TEXT,
        year INTEGER,
        rooms INTEGER,
        servicecosts INTEGER,
        rating INTEGER,
        reason TEXT
      )`,
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );

    db.close();
  });
};

async function getRow(database, sql, params) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function fetchWithCookies(url, options) {
  if (!url) throw new Error("No url provided in fetchWithCookies");

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
    1: "🤬",
    2: "😡",
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

const getZipcodeRating = (zipcode) => {
  if (!zipcode) return false;

  const found = zipcodes.find((z) => z.code === parseInt(zipcode));

  if (!found) return false;
  return found.likebility;
};

async function processResult(db, result, config, fetchFunction) {
  // Insert results into database
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO properties
    (platform, created_at, url, image, floor, street, zipcode, meters, price, garden, rooftarrace, year, rooms, servicecosts, rating, reason)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (let property of result) {
    // Check if property.url is in database

    const row = await getRow(db, `SELECT * FROM properties WHERE url = ?`, [
      property.url,
    ]);

    if (row) continue;

    try {
      const enrichCallback =
        config.enrichCallback ||
        async function (result) {
          if (result.zipcode) return result;
          if (!result.street) return result;

          const address = `${result.street}, ${
            result.city || result._city
          }, Netherlands`;
          const zip = await getZipCode(address);
          if (zip) result.zipcode = zip;

          return result;
        };

      property = await enrichCallback(property, fetchFunction);
    } catch (error) {
      log(error);
    }

    // Check if the zipcode is in your list
    let zipRating = getZipcodeRating(property.zipcode);

    const useAi =
      typeof config.getAIProperties === "function" &&
      (!property.zipcode || zipRating || NODE_ENV === "development");

    let ai;

    try {
      ai = useAi ? await config.getAIProperties(fetchFunction, property) : null;
    } catch (error) {
      log(error);
    }

    const useFloor = property.floor || ai?.floor;
    const price = property.price || ai?.price;
    const size = property.meters || ai?.size;
    const sold = property.sold ?? ai?.sold ?? false;

    // Get apendix of property.street, like --3 should return 3, -H should return H, etc.
    const street = property.street || ai?.street;
    const appendix = street
      ?.match(/[0-9]+[- ]+([1-9]|a|b|h|hs|i+)$/i)?.[1]
      ?.toLowerCase();

    const floor =
      useFloor === "begane grond"
        ? 0
        : Number.isInteger(useFloor) && useFloor >= 0
        ? useFloor
        : /^[0-9]+$/.test(useFloor)
        ? parseInt(useFloor)
        : /^[0-9]+$/.test(appendix)
        ? parseInt(appendix)
        : appendix === "h" || appendix === "hs" || /hs$/i.test(street?.trim())
        ? 0
        : appendix === "a"
        ? 0
        : appendix === "b"
        ? 1
        : /^i+$/i.test(appendix)
        ? appendix.length
        : null;

    if (!property.zipcode && ai?.zipcode)
      zipRating = getZipcodeRating(ai.zipcode);

    let zipcode = property.zipcode || ai?.zipcode || null;
    //  When zipcode is 1234ab make it 1234 AB
    if (typeof zipcode === "string")
      zipcode = /([0-9]{4})([a-z]{2})/i.test(zipcode?.trim())
        ? /([0-9]{4})([a-z]{2})/i
            .exec(zipcode?.trim())
            .slice(1)
            .join(" ")
            .toUpperCase()
        : zipcode.toUpperCase().trim();

    const floorScore =
      floor === 0 && ai?.garden
        ? 10
        : ai?.rooftarrace
        ? 8
        : floor === 0 || ai?.garden
        ? 5
        : 2;

    const alert =
      !sold &&
      zipRating !== false &&
      size >= 49 &&
      price >= 300_000 &&
      price <= 650_000;

    console.log({ sold, alert, floorScore, zipRating, size, price });

    if (alert && typeof zipRating === "number") {
      const pricePerMeter =
        price && size ? `€${Math.round(price / size)}/m2` : null;

      const sizeScore = size >= 80 ? 10 : size >= 70 ? 8 : size >= 60 ? 5 : 0;

      const priceScore =
        price <= 400000 ? 10 : price <= 500000 ? 8 : price <= 600000 ? 4 : 0;

      const emojiScore = Math.round(
        (zipRating + floorScore * 3 + sizeScore + priceScore) / 6
      );

      const superalert = emojiScore >= 7 && zipRating >= 7 && sizeScore >= 8;

      const line = [
        emojiScore ? `${emoji(emojiScore)} ${emojiScore}/10` : null,
        `📍${zipRating}/10`,
        price ? `€${Math.round(price / 1000)}k` : "",
        size ? `${size}m2` : "",
        pricePerMeter,
        street,
        typeof floor === "number" ? `🛗 ${floor}` : null,
        ai?.rooms ? `🛏 ${ai.rooms}` : null,
        ai?.servicecosts ? `🧾 €${ai.servicecosts} p/m` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const lines = [
        superalert ? `🚨🚨🚨 Might be a good property!` : "",
        line,
        `[${property.url}](${property.url})`,
        ai?.reason ? `_${ai.reason}_` : null,
        config.note ? `🔍 ${config.note}` : null,
      ];

      // Get map image from Google
      const city = property._city || property.city || ai?.city || "Amsterdam";
      const address = `${street}, ${city}, The Netherlands`;
      const imageBuffer = street ? await getMapImage({ address }) : null;

      // Send alert to Telegram
      const disable_notification = zipRating <= 5;
      await sendTelegramAlert(
        lines.filter(Boolean).join("\n"),
        [property.image, imageBuffer],
        { disable_notification }
      );
    }

    stmt.run(
      config.platform,
      new Date().toISOString(),
      property.url,
      property.image,
      floor,
      street || null,
      zipcode,
      size || null,
      price || null,
      ai?.garden || null,
      ai?.rooftarrace || null,
      ai?.year || null,
      property.rooms || ai?.rooms || null,
      ai?.servicecosts || null,
      ai?.rating || null,
      ai?.reason || null,
      function (err) {
        if (err) return log(err.message);
      }
    );
  }

  stmt.finalize();
}

const createCluster = async () => {
  const puppeteer = addExtra(vanillaPuppeteer);
  puppeteer.use(Stealth());

  const cluster = await Cluster.launch({
    executablePath: PUPPETEER_EXECUTABLE_PATH,
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: 2, // Adjust the number of concurrent browsers as needed
    puppeteer,
    puppeteerOptions: {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--deterministic-fetch",
        "--disable-features=IsolateOrigins",
        "--disable-site-isolation-trials",
      ],
    },
  });

  return cluster;
};

async function main() {
  const cluster = await createCluster();

  await cluster.task(async ({ page, data = {} }) => {
    if (!data?.url || !/^https?:\/\//.test(data.url)) {
      throw new Error(`Invalid URL: ${data.url}`);
    }

    await page.goto(data.url, { waitUntil: "networkidle2", timeout: 15000 });
    return await page.content();
  });

  const db = new sqlite3.Database(database, (error) => {
    if (error) log(error);
  });

  // Get all config files
  const crawlerDir = path.join(__dirname, "crawlers");
  const files = fs.readdirSync(crawlerDir);
  const configFiles = files.filter((file) => file.endsWith(".js"));

  log(
    `Starting${FILTER_PLATFORM ? " 1 of" : ""} ${
      configFiles.length
    } crawlers...`
  );

  for (const configFile of configFiles) {
    const config = require(path.join(crawlerDir, configFile));
    config.platform = config.platform || configFile.replace(".js", "");

    // Skip other than FILTER_PLATFORM crawlers
    const skipOtherPlatforms =
      FILTER_PLATFORM && config.platform !== FILTER_PLATFORM;

    if (skipOtherPlatforms) continue;
    if (config.enabled === false && NODE_ENV === "production") continue;

    log(`Crawling ${config.platform}...`);

    if (!config.parseHTML && !config.parseJSON)
      throw new Error(
        `Config ${configFile} does not have a parseHTML or parseJSON function`
      );

    let result = [];

    if (config.puppeteer) {
      try {
        const html = await cluster.execute({ url: config.targetUrl });
        const $ = cheerio.load(html);
        result = config.parseHTML($);
      } catch (error) {
        console.error("Cluster failed to execute:", error);
      }
    } else {
      // Fetch initial page to get PHPSESSID cookie
      if (config.baseUrl) await fetchWithCookies(config.baseUrl);

      let options = {};

      if (config.postData) {
        const token = config.baseUrl
          ? cookieJar
              ?.getCookiesSync(config.baseUrl)
              ?.find((c) => c.key === "__RequestVerificationToken")?.value
          : null;

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
        log(error);
      }
    }

    // Insert into database
    await processResult(
      db,
      result,
      config,
      config.puppeteer
        ? (...props) => cluster.execute(...props)
        : fetchWithCookies
    );
  }

  db.close();
}

(async () => {
  // open the database
  await initDatabase();

  // run the main function
  main().catch(log);

  setInterval(() => {
    main().catch(log);
  }, 30 * 60 * 1000); // 30 minutes in milliseconds
})();

// Setup server returning the latest results in html
const server = http.createServer(async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });

  const url = new URL(req.url, `http://${req.headers.host}`);

  // If path is not / then return 404 with message
  if (url.pathname !== "/") {
    res.statusCode = 404;
    res.end("Bummer, not found.");
    return;
  }

  const db = new sqlite3.Database(database, (error) => {
    if (error) {
      log(error);
      res.end(error.message);
    }
  });

  const template = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const fields = [
    "id",
    "url",
    "image",
    "zipcode",
    "street",
    "price",
    "meters AS size",
  ];
  const query = `
    SELECT ${fields.join(", ")}
    FROM properties
    WHERE
      created_at IS NOT NULL
      AND zipcode IS NOT NULL
      AND created_at > strftime('%Y-%m-%dT%H:%M:%S', 'now', '-30 days')
    ORDER BY created_at DESC
    LIMIT 1000
  `;

  db.all(query, [], (error, properties) => {
    const data = {};
    if (error) {
      res.statusCode = 500;
      data.error = error.message;
      data.properties = [];
    } else {
      data.properties = properties;
    }
    res.end(template.replace("window.DATA", JSON.stringify(data)));

    db.close();
  });
});

if (PORT) {
  server.listen(PORT, () => {
    log(`Server running at http://localhost:${PORT}/`);
  });
} else {
  log("No port specified, skipping server");
}
