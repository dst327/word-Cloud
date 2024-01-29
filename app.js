const express = require("express");
const request = require("request");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const stopwords = require("stopword");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

// NYTIMES all top news
function nyt_top_news_us(api_key, callback) {
  const url = "https://api.nytimes.com/svc/topstories/v2/us.json";

  const params = {
    "api-key": api_key,
  };

  request.get({ url, qs: params, json: true }, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      callback(body);
    } else {
      console.error(
        `Error: ${response ? response.statusCode : "Unknown"}, ${error || body}`
      );
      callback([]);
    }
  });
}

app.get("/", async (req, res) => {
  const api_key = "PTptKAkW811u4DGCY9hS2gip2WgEFLsG";
  const result = await new Promise((resolve) => {
    nyt_top_news_us(api_key, resolve);
  });

  const url_filter = [];
  const content = [];

  // Fetch all urls
  for (let parseURL = 0; parseURL < result.num_results; parseURL++) {
    const articleUrl = result.results[parseURL].url;
    url_filter.push(articleUrl);
  }

  // Get Valid Data
  for (let data = 0; data < result.num_results; data++) {
    for (
      let description = 0;
      description < result.results[data].des_facet.length;
      description++
    ) {
      content.push(result.results[data].des_facet[description]);
    }
  }

  // Making a word cloud
  const all_text = content.join(" ");

  // Tokenize the text into words using split
  const words = all_text.split(/\s+/);

  // Count the occurrences of each word
  const word_count = {};
  for (const word of words) {
    const cleanedWord = word.trim(".,!?");
    const lowercaseWord = cleanedWord.toLowerCase();
    word_count[lowercaseWord] = (word_count[lowercaseWord] || 0) + 1;
  }

  // Custom stopwords for news articles
  const custom_stopwords = new Set([
    "said",
    "according",
    "reported",
    "news",
    "article",
    "time",
  ]);
  const stop_words = new Set(
    stopwords.removeStopwords(words).concat(Array.from(custom_stopwords))
  );

  const filtered_words = words.filter(
    (word) => !stop_words.has(word.toLowerCase())
  );
  const filtered_text = filtered_words.join(" ");

  // Generate the word cloud using Puppeteer
  const wordcloudImage = await generateWordCloud(filtered_text);

  res.render("index", { wordcloudImage });
});

async function generateWordCloud(text) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Apply styling to make words colorful
  const colorfulText = text
    .split(/\s+/)
    .map(
      (word) =>
        `<span style="color: ${getRandomColor()}; font-size: 20px">${word}</span>`
    )
    .join(" ");

  await page.setContent(
    `<html><head><style>body { margin: 0; background-color: black; }</style></head><body style="color: white">${colorfulText}</body></html>`
  );

  const screenshot = await page.screenshot({ encoding: "base64" });
  await browser.close();

  return `data:image/png;base64,${screenshot}`;
}

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
