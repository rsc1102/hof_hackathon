import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readUploads, writeUploads, FileData } from "@/lib/tempStore";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const id = randomUUID();

    const data = await readUploads();
    data[id] = {
      buffer: base64,
      name: file.name,
      mime: file.type || "application/pdf",
    };
    await writeUploads(data);

    return NextResponse.json({ success: true, id, fileName: file.name });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const list = searchParams.get("list");

  const data = await readUploads();

  if (list === "true") {
    const list = Object.entries(data).map(([id, file]) => ({
      id,
      name: file.name,
      parsed: !!file.parsedData,
      mutated: !!file.mutatedData?.length,
    }));
    return NextResponse.json(list);
  }

  if (!id || !data[id]) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const file = data[id];
  return new NextResponse(Buffer.from(file.buffer, "base64"), {
    status: 200,
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${file.name}"`,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const data = await readUploads();

  if (!id || !data[id]) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  delete data[id];
  await writeUploads(data);

  return NextResponse.json({ success: true });
}
