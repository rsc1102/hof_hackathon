import { NextRequest, NextResponse } from "next/server";
import { readUploads, writeUploads } from "@/lib/tempStore";
import OpenAI from "openai";

const { OPENAI_API_KEY } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing file ID." }, { status: 400 });
  }

  const uploads = await readUploads();
  const file = uploads[id];

  if (!file?.parsedData) {
    return NextResponse.json(
      { error: "No parsed resume found." },
      { status: 400 }
    );
  }

  const prompt = `
You are a resume mutation engine.

Given the following parsed resume JSON:
${JSON.stringify(file.parsedData, null, 2)}

**Task**: Generate **exactly 3 tailored versions** of this resume, each adapted for a different **technical job role** that best matches the candidate’s profile.

### Guidelines:

1. **Identify the 3 most suitable tech roles** based on the provided skills, experience, and projects.
2. For each version:
  - Reorder or emphasize skills, experience, and projects relevant to that role.
  - You may remove less relevant details (e.g., projects/skills not needed for that role).
  - **Do NOT add any fake content or hallucinate.**
  - **Only modify, re-emphasize, or rearrange** the content already present.
3. Keep the output format strictly in **JSON** — identical to the input structure.
4. Return a **JSON array of 3 objects**, one per version.
5. In each object, include a new field: \`"optimized_for"\` with the chosen job role (e.g., \`"Backend Engineer"\`).

### Output format (example schema):

[
  {
    "optimized_for": "Backend Engineer",
    "name": "...",
    "contact": {
      "email": "...",
      "phone": "...",
      "linkedin": "...",
      "github": "..."
    },
    "skills": ["..."],
    "experience": [...],
    "education": [...],
    "projects": [...]
  },
  {
    "optimized_for": "DevOps Engineer",
    ...
  },
  {
    "optimized_for": "Full Stack Developer",
    ...
  }
]

Return **only the JSON** — no extra commentary, notes, or markdown.
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message?.content?.trim() || "[]";
    console.log("🧠 GPT raw output:", raw);

    const cleaned = raw
      .replace(/^```(?:json)?/, "")
      .replace(/```$/, "")
      .trim();

    const parsedMutations = JSON.parse(cleaned);
    console.log("💾 Saving mutatedData:", parsedMutations);

    uploads[id].mutatedData = parsedMutations;
    await writeUploads(uploads);

    return NextResponse.json({
      success: true,
      versions: parsedMutations.length,
    });
  } catch (err) {
    console.error("❌ Error mutating resume:", err);
    return NextResponse.json({ error: "Mutation failed" }, { status: 500 });
  }
}
