import { NextRequest, NextResponse } from "next/server";
import { readUploads, writeUploads } from "@/lib/tempStore";
import OpenAI from "openai";
import safePdfParse from "@/lib/safePdfParse";

const { OPENAI_API_KEY } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  const uploads = await readUploads();
  const file = uploads[id];

  if (!file || !file.buffer) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.parsedData) {
    console.log("✅ Returning cached parsed resume for ID:", id);
    return NextResponse.json(file.parsedData);
  }

  try {
    const rawText = await safePdfParse(Buffer.from(file.buffer, "base64"));

    const prompt = `
You're a resume parser. Based on the PDF text below, extract the resume info into a structured JSON format like:

{
  "name": "Full Name",
  "contact": { "email": "", "phone": "", "linkedin": "" },
  "skills": [],
  "summary": "...",
  "experience": [ ... ],
  "education": [ ... ],
  "projects": [ ... ]
}

Only return JSON.

---
${rawText}
---
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const rawContent = completion.choices[0].message?.content?.trim() || "{}";

    const cleaned = rawContent
      .replace(/^```(?:json)?/, "")
      .replace(/```$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (jsonErr) {
      console.error("❌ Failed to parse GPT response:", cleaned);
      return NextResponse.json(
        { error: "OpenAI returned invalid JSON" },
        { status: 500 }
      );
    }

    uploads[id].parsedData = parsed;
    await writeUploads(uploads);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("❌ Unexpected error in /api/parse-resume:", err);
    return NextResponse.json({ error: "Parsing failed" }, { status: 500 });
  }
}
