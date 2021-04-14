import {
  // main APIs
  Client,
  middleware,

  // exceptions
  JSONParseError,
  SignatureValidationFailed,

  // types
  ClientConfig,
  MiddlewareConfig,
  Message,
  WebhookEvent,
} from "@line/bot-sdk";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cheerio from "cheerio";
import { type } from "node:os";
dotenv.config();

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
};
const middlewareConfig: MiddlewareConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new Client(clientConfig);

const textRegex = /^g\/[0-9]{6}$/m;

const app = express();
// app.use(express.json());

// app.get("/", async (req, res) => {
//   const { data } = await axios.get("https://nhentai.net/g/113450/");
//   const $ = cheerio.load(data);
//   const h1 = $("h1[class = title]").text();
//   console.log(h1);

//   // fs.writeFileSync("kek2.html", data);
//   return res.send("complete");
// });

app.post("/callback", middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event: any) {
  console.log(event);
  if (event.type !== "message" || event.message.type !== "text") {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  const text: string = event.message.text;

  //ignore if does not match regex
  if (!textRegex.test(text)) {
    return Promise.resolve(null);
  }
  //get data
  console.log("fetch");

  const { data } = await axios.get(`https://nhentai.net/${text}/`);
  console.log("load");
  const $ = cheerio.load(data);
  const h1 = $("h1[class = title]").text();

  // create a echoing text message
  const message: Message[] = [
    { type: "text", text: h1 },
    {
      type: "image",
      originalContentUrl: "https://t.nhentai.net/galleries/725434/cover.png",
      previewImageUrl: "https://t.nhentai.net/galleries/725434/cover.png",
    },
    {
      type: "image",
      originalContentUrl: "https://t.nhentai.net/galleries/725434/cover.png",
      previewImageUrl: "https://t.nhentai.net/galleries/725434/cover.png",
    },
  ];

  // use reply API
  return client.replyMessage(event.replyToken, message);
}

// listen on port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
