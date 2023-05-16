const fetch = require("node-fetch");
const FormData = require("form-data");

const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = process.env;

async function sendTelegramAlert(text, images, options = {}) {
  if (!TELEGRAM_TOKEN)
    return console.log(`No TELEGRAM_TOKEN provided to send: ${text}`);

  const disable_notification = options.silent || false;

  images = images.filter((image) => image);

  const media = [];

  for (const [index, image] of images.entries()) {
    if (typeof image === "string" && image.match(/^https?:\/\//)) {
      media.push({
        type: "photo",
        caption: index === 0 ? text : undefined,
        media: {
          url: image,
        },
      });
    }
    if (image instanceof Buffer) {
      media.push({
        type: "photo",
        caption: index === 0 ? text : undefined,
        media: {
          value: image,
          options: {
            filename: `image-${index}.png`,
            contentType: "image/png",
          },
        },
      });
    }
  }

  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("disable_notification", `${disable_notification}`);
  form.append(
    "media",
    JSON.stringify(
      media.map((item) => ({
        type: item.type,
        caption: item.caption,
        parse_mode: "markdown",
        media: item.media?.options?.filename
          ? `attach://${item.media.options.filename}`
          : item.media.url,
      }))
    )
  );

  for (const item of media) {
    if (!item.media?.options?.filename) continue;
    form.append(
      item.media.options.filename,
      item.media.value,
      item.media.options
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMediaGroup`,
    {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    }
  );

  const json = await response.json();
  if (!json.ok) console.error("Telegram error:", json);
}

module.exports = {
  sendTelegramAlert,
};
