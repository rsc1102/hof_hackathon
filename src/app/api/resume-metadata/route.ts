import { NextRequest, NextResponse } from "next/server";
import { readUploads } from "@/lib/tempStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  const uploads = await readUploads();
  const file = uploads[id];

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({
    id,
    name: file.name,
    parsedData: file.parsedData || null,
    mutatedData: file.mutatedData || null,
  });
}
