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

app.post("/callback", middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event: WebhookEvent) {
  try {
    if (event.type !== "message" || event.message.type !== "text") {
      // ignore non-text-message event
      return Promise.resolve(null);
    }
    const text: string = event.message.text;
    /* Quit */
    if (text === "/quit") {
      switch (event.source.type) {
        case "room":
          const roomId: string = event.source.roomId;
          return client.leaveRoom(roomId);
        case "group":
          const groupId: string = event.source.groupId;
          return client.leaveGroup(groupId);

        default:
          return Promise.resolve(null);
      }

      /* If message is g/xxxxxx */
    } else if (textRegex.test(text)) {
      const { data } = await axios.get(`https://nhentai.net/${text}/`);
      const $ = cheerio.load(data);
      /* GETTING TITLE */
      const title: string = $("h1[class = title]").text();

      /* GETTING TAGS*/
      let tagResult = $('section[id="tags"]').find(
        `div:contains("Tags") > span[class=tags] > a > span[class=name]`
      );
      const tagsLength: number = tagResult.length;
      let tags: string[] = [];
      if (tagsLength > 5) {
        tagResult = tagResult.slice(0, 5);
      }
      await Promise.all(
        tagResult.map((el) => {
          tags.push(` ${$(el).text()}`);
        })
      );
      if (tagsLength > 5) {
        tags.push(" ...");
      }

      /* GETTING IMAGES*/
      let imageResult = $("body").find(
        "#content > #thumbnail-container > .thumbs > .thumb-container"
      );
      const pageLength: number = imageResult.length;
      let images: TemplateImageColumn[] = [];
      if (imageResult.length > 5) {
        imageResult = imageResult.slice(0, 5);
      }
      await Promise.all(
        imageResult.map((idx, el) => {
          const image =
            $(el).find(".gallerythumb > img").attr("data-src") || "";
          images.push({
            imageUrl: image,
            action: {
              type: "uri",
              label: `Page ${idx + 1}`,
              uri: image,
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
    return Promise.resolve(null);
  } catch (error) {
    console.log(error);
  }
}

// listen on port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

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
