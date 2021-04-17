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
} from "@line/bot-sdk";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { getData } from "./function";
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
//   const { request, data } = await axios.get(`https://nhentai.net/random/`);
//   console.log(request.path);
//   return res.send(request.path);
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
async function handleEvent(event: WebhookEvent) {
  try {
    if (event.type !== "message" || event.message.type !== "text") {
      // ignore non-text-message event
      return Promise.resolve(null);
    }
    const text: string = event.message.text;

    switch (text) {
      case "/help":
        const message: TextMessage = {
          type: "text",
          text: `List of commands:
/help: Show all commands
g/xxxxxx: Show detail of doujin ex: g/347653
/random: Show random doujin
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
Page: ${page} pages
Tags: ${tags.toString()}
Link: https://nhentai.net/${text}/ `,
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
Page: ${page} pages
Tags: ${tags.toString()}
Link: https://nhentai.net/${id}/ `,
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
