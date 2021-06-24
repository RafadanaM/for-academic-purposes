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
import express, { Application, Request, Response } from "express";
import axios, { AxiosError, AxiosResponse } from "axios";
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

const app: Application = express();


app.get("/", async (_ : Request, res: Response): Promise<Response> => {
  try {
    await axios.get(`https://nhentai.net/`)
    console.log("connected to target website")
    return res.status(200).json({
      status: 'success',
      message: 'Connected successfully!',
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(500).json({
        status: `Axios Error`,
        message: `Can't connect to target wensite with code: ${error.response?.status}`,
      });
    } else {
      return res.status(500).json({
        status: `Error`,
        message: `Can't connect webhook`,
      });
    }
    
  }

});

app.post("/callback", middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).json("error").end();
    });
});

// event handler
// I need to refactor this shit
async function handleEvent(event: WebhookEvent) {

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
  
}

// listen on port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
