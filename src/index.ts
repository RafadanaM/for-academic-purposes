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
  TextMessage,
  WebhookEvent,
  TemplateImageColumn,
  ImageMessage,
} from "@line/bot-sdk";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { getData, getPopularData, getLatestData } from "./function";
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
//   const { data } = await axios.get(`https://nhentai.net/`);
//   const $ = cheerio.load(data);
//   const popular = $("div[id=content]")
//     .find(`div[class="container index-container"] > div.gallery`)
//     .slice(0, 5);

//   console.log(popular.length);
//   const titles: string[] = [];
//   const images: TemplateImageColumn[] = [];
//   await Promise.all(
//     popular.map((idx, el) => {
//       const title = $(el).find("div.caption").text();
//       const image = $(el).find("a > img.lazyload").attr("data-src") || "";
//       const id = $(el).find("a").attr("href");
//       titles.push(`• ${title}\n`);
//       images.push({
//         imageUrl: image,
//         action: {
//           type: "uri",
//           label: `${idx + 1}`,
//           uri: `https://nhentai.net${id}`,
//         },
//       });
//     })
//   );
//   console.log(titles);
//   console.log(images);

//   const message: Message[] = [
//     {
//       type: "text",
//       text: `Popular Now:
// ${titles.toString()} `,
//     },
//     {
//       type: "template",
//       altText: "image carousel",
//       template: {
//         type: "image_carousel",
//         columns: images,
//       },
//     },
//   ];

//   return res.send("completed");
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
// I need to refactor this shit
async function handleEvent(event: WebhookEvent) {
  try {
    switch (event.type) {
      case "join": {
        const message: TextMessage = {
          type: "text",
          text: `Why did you add me you degenerate:
• Type /help to list all commands
`,
        };

        return client.replyMessage(event.replyToken, message);
      }

      case "message":
        const message = event.message;
        if (message.type !== "text") {
          return Promise.resolve(null);
        }
        const text: string = message.text;
        switch (text) {
          case "/mantap":
            const yafimsg: ImageMessage = {
              type: "image",
              originalContentUrl: "https://i.ibb.co/jw4PW2n/aibs-210524.jpg",
              previewImageUrl: "https://i.ibb.co/jw4PW2n/aibs-210524.jpg"

            }
            return client.replyMessage(event.replyToken, yafimsg)
          case "/help":
            const message: TextMessage = {
              type: "text",
              text: `List of commands:
• /help: Show all commands
• g/xxxxxx: Show detail of doujin ex: g/347653
• /popular: Show current popular doujins
• /latest: Show 5 latest doujins
• /random: Show random doujin
• /quit: remove bot from group/mpc
• /github: github repo

More to cum!!`,
            };

            return client.replyMessage(event.replyToken, message);

          case "/quit":
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
          case (text.match(textRegex) || {}).input: {
            //need to check if 404
            const { data } = await axios.get(`https://nhentai.net/${text}/`);
            const { title, tags, page, images } = await getData(data, text);

            // create a echoing text message
            const message: Message[] = [
              {
                type: "text",
                text: `Title: ${title}
• Page: ${page} pages
• Tags: ${tags.toString()}
• Link: https://nhentai.net/${text}/ `,
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

          case "/random": {
            const { request, data } = await axios.get(
              `https://nhentai.net/random/`
            );
            const id = request.path.substring(1);
            const { title, tags, page, images } = await getData(data, id);

            const message: Message[] = [
              {
                type: "text",
                text: `Title: ${title}
• Page: ${page} pages
• Tags: ${tags.toString()}
• Link: https://nhentai.net/${id}/ `,
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

          case "/popular": {
            const { data } = await axios.get(`https://nhentai.net/`);
            const { titles, images } = await getPopularData(data);
            const message: Message[] = [
              {
                type: "text",
                text: `Popular Now:
${titles.join("\n \n")} `,
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

            return client.replyMessage(event.replyToken, message);
          }

          case "/latest": {
            const { data } = await axios.get(`https://nhentai.net/`);
            const { titles, images } = await getLatestData(data);
            const message: Message[] = [
              {
                type: "text",
                text: `Latest Doujins:
${titles.join("\n \n")} `,
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

            return client.replyMessage(event.replyToken, message);
          }
          case "/github": {
            const message: TextMessage[] = [
              {
                type: "text",
                text: `Github:
https://github.com/RafadanaM/for-academic-purposes `,
              },
            ];
            return client.replyMessage(event.replyToken, message);
          }

          default:
            return Promise.resolve(null);
        }

      default:
        return Promise.resolve(null);
    }
  } catch (error) {
    console.log(error);
  }
}

// listen on port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
