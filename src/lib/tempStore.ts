import { promises as fs } from "fs";
import path from "path";

const TEMP_FILE = path.resolve(process.cwd(), "tmp", "uploads.json");

export type FileData = {
  buffer: string; // base64
  name: string;
  mime: string;
  parsedData?: any;
  mutatedData?: any[];
  templates?: {
    versionIndex: number;
    html: string;
    createdAt: string;
  }[];
};

type UploadMap = Record<string, FileData>;

export async function readUploads(): Promise<UploadMap> {
  try {
    const data = await fs.readFile(TEMP_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function writeUploads(data: UploadMap) {
  const json = JSON.stringify(data, null, 2);
  await fs.mkdir(path.dirname(TEMP_FILE), { recursive: true });
  await fs.writeFile(TEMP_FILE, json, "utf-8");
}
