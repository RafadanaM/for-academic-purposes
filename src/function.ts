import { TemplateImageColumn } from "@line/bot-sdk/";
import { DataObject } from "./interface";
import cheerio from "cheerio";
export async function getData(data: any, id: string): Promise<DataObject> {
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
    tagResult.map((idx, el) => {
      tags.push(` ${$(el).text()}`);
    })
  );
  if (tagsLength > 5) {
    tags.push(` ...`);
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
      const image = $(el).find(".gallerythumb > img").attr("data-src") || "";
      images.push({
        imageUrl: image,
        action: {
          type: "uri",
          label: `Page ${idx + 1}`,
          uri: `https://nhentai.net/${id}/${idx + 1}`,
        },
      });
    })
  );
  const result: DataObject = {
    title: title,
    tags: tags,
    page: pageLength,
    images: images,
  };
  return result;
}
