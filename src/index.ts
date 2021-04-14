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
  TemplateImageColumn,
  ImageMessage,
} from "@line/bot-sdk";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cheerio from "cheerio";
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

// app.get("/", async (req, res) => {
//   const { data } = await axios.get("https://nhentai.net/g/113450/");
//   const $ = cheerio.load(data);
//   const h1 = $("h1[class = title]").text();
//   console.log(h1);
//   const result = $("body").find(
//     "#content > #thumbnail-container > .thumbs > .thumb-container"
//   );
//   let columns: any = [];
//   console.log(result.length);
//   if (result.length > 5) {
//     await Promise.all(
//       result.slice(0, 5).map((idx, el) => {
//         columns.push($(el).find(".gallerythumb > img").attr("data-src"));
//       })
//     );
//   }
//   console.log(columns);

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
  const result = $("body").find(
    "#content > #thumbnail-container > .thumbs > .thumb-container"
  );

  console.log(result.length);
  if (result.length > 5) {
    let messages: Message[] = [];
    messages.push({ type: "text", text: h1 });
    await Promise.all(
      result.slice(0, 5).map((idx, el) => {
        const image = $(el).find(".gallerythumb > img").attr("data-src");
        messages.push({
          type: "image",
          originalContentUrl: image || "",
          previewImageUrl: image || "",
        });
      })
    );
    // use reply API
    return client.replyMessage(event.replyToken, messages);
  }
}

// listen on port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
