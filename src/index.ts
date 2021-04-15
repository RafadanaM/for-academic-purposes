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
// app.use(express.json());

// app.get("/", async (req, res) => {
//   const { data } = await axios.get("https://nhentai.net/g/113450/");
//   const $ = cheerio.load(data);
//   const h1 = $("h1[class = title]").text();
//   console.log(h1);
//   // const result = $("body").find(
//   //   "#content > #thumbnail-container > .thumbs > .thumb-container"
//   // );
//   const result = $("div[id=thumbnail-container]").find(
//     ".thumbs > .thumb-container"
//   );
//   let tags = $('section[id="tags"]').find(
//     `div:contains("Tags") > span[class=tags] > a > span[class=name]`
//   );
//   let totalTag: any[] = [];
//   await Promise.all(
//     tags.map((idx, el) => {
//       totalTag.push($(el).text());
//     })
//   );
//   console.log(totalTag);
//   console.log(tags.length);
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
  if (text === "/quit") {
    if (event.source.type === "room") {
      const roomId = event.source.roomId;
      return client.leaveRoom(roomId);
    }
    return Promise.resolve(null);
  }
  //ignore if does not match regex
  if (!textRegex.test(text)) {
    return Promise.resolve(null);
  }
  //get data
  console.log("fetch");

  const { data } = await axios.get(`https://nhentai.net/${text}/`);
  console.log("load");
  const $ = cheerio.load(data);
  const title = $("h1[class = title]").text();
  let imageResult = $("body").find(
    "#content > #thumbnail-container > .thumbs > .thumb-container"
  );
  const pageLength = imageResult.length;

  /* GETTING TAGS*/
  let tagResult = $('section[id="tags"]').find(
    `div:contains("Tags") > span[class=tags] > a > span[class=name]`
  );
  let tags: any[] = [];
  if (tagResult.length > 5) {
    tagResult = tagResult.slice(0, 5);
  }
  await Promise.all(
    tagResult.map((idx, el) => {
      tags.push(` ${$(el).text()}`);
    })
  );
  if (tagResult.length > 5) {
    tags.push("...");
  }

  /* GETTING IMAGES*/
  let images: TemplateImageColumn[] = [];
  if (imageResult.length > 5) {
    imageResult = imageResult.slice(0, 5);
  }
  await Promise.all(
    imageResult.map((idx, el) => {
      const image = $(el).find(".gallerythumb > img").attr("data-src");
      images.push({
        imageUrl: image || "",
        action: {
          type: "uri",
          label: `Page ${idx + 1}`,
          uri: image || "",
        },
      });
    })
  );

  // create a echoing text message
  const message: Message[] = [
    {
      type: "text",
      text: `Title: ${title}
    Page: ${pageLength} pages
    Tags: ${tags.toString()}`,
    },
    // { type: "text", text: `` },
    // { type: "text", text: `` },
    {
      type: "template",
      altText: "image carousel",
      template: {
        type: "image_carousel",
        columns: images,
      },
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
