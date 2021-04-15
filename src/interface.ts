import { TemplateImageColumn } from "@line/bot-sdk";

export interface DataObject {
  title: string;
  tags: string[];
  page: number;
  images: TemplateImageColumn[];
}
