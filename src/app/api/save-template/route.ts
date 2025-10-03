import { NextRequest, NextResponse } from "next/server";
import { readUploads, writeUploads } from "@/lib/tempStore";

export async function POST(req: NextRequest) {
  try {
    const { id, versionIndex, html } = await req.json();

    if (!id || typeof versionIndex !== "number" || !html) {
      return NextResponse.json(
        { error: "Missing or invalid fields." },
        { status: 400 }
      );
    }

    const uploads = await readUploads();
    const file = uploads[id];
    if (!file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    // Initialize if not present
    if (!file.templates) {
      file.templates = [];
    }

    const newEntry = {
      versionIndex,
      html,
      createdAt: new Date().toISOString(),
    };

    file.templates.push(newEntry);

    console.log(
      `💾 Saved template for file=${id}, version=${versionIndex}, totalTemplates=${file.templates.length}`
    );

    return NextResponse.json({
      success: true,
      templateCount: file.templates.length,
    });
  } catch (err) {
    console.error("❌ Failed to save template:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
