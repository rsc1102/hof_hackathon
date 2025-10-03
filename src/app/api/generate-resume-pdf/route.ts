export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { readUploads } from "@/lib/tempStore";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const versionIndex = Number(searchParams.get("version") || 0);

  const uploads = await readUploads();
  const file = uploads[id || ""];

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const version = file.mutatedData?.[versionIndex];
  if (!version) {
    return NextResponse.json(
      { error: "Mutated version not found" },
      { status: 404 }
    );
  }

  const chunks: Buffer[] = [];

  // @ts-expect-error: disable default font to avoid Helvetica.afm crash
  const doc = new PDFDocument({ font: null });

  const fontPath = path.resolve(
    process.cwd(),
    "public/fonts/OpenSans-Regular.ttf"
  );
  doc.registerFont("OpenSans", fontPath);
  doc.font("OpenSans");

  return new Promise<NextResponse>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${version.name
              .replace(/\s+/g, "_")
              .toLowerCase()}_resume.pdf"`,
          },
        })
      );
    });

    doc.on("error", (err) => {
      console.error("❌ PDF generation error:", err);
      reject(
        NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
      );
    });

    // ====== Write resume content ======
    doc.fontSize(20).text(version.name, { underline: true });
    doc.moveDown();

    const contact = version.contact || {};
    doc.fontSize(12).text(`Email: ${contact.email || "N/A"}`);
    if (contact.phone) doc.text(`Phone: ${contact.phone}`);
    if (contact.linkedin) doc.text(`LinkedIn: ${contact.linkedin}`);
    if (contact.github) doc.text(`GitHub: ${contact.github}`);
    if (contact.portfolio) doc.text(`Portfolio: ${contact.portfolio}`);
    doc.moveDown();

    if (version.summary) {
      doc.fontSize(14).text("Summary", { underline: true });
      doc.fontSize(12).text(version.summary);
      doc.moveDown();
    }

    if (version.skills?.length) {
      doc.fontSize(14).text("Skills", { underline: true });
      doc.fontSize(12).text(version.skills.join(", "));
      doc.moveDown();
    }

    if (version.experience?.length) {
      doc.fontSize(14).text("Experience", { underline: true });
      version.experience.forEach((exp: any) => {
        const role = exp.title || exp.role || "Untitled Role";
        const company = exp.company || "Unknown Company";
        const duration = exp.duration || exp.dates || "Dates not specified";

        doc.fontSize(12).text(`${role} @ ${company}`);
        doc.text(duration);

        if (Array.isArray(exp.description)) {
          exp.description.forEach((line: string) => doc.text(`- ${line}`));
        } else if (typeof exp.description === "string") {
          doc.text(`- ${exp.description}`);
        }

        doc.moveDown();
      });
    }

    if (version.projects?.length) {
      doc.fontSize(14).text("Projects", { underline: true });
      version.projects.forEach((proj: string) => {
        doc.fontSize(12).text(`- ${proj}`);
      });
      doc.moveDown();
    }

    if (version.education?.length) {
      doc.fontSize(14).text("Education", { underline: true });
      version.education.forEach((edu: any) => {
        const school = edu.school || edu.institution || "Unknown Institution";
        const degree = edu.degree || "Degree not specified";
        const duration = edu.duration || edu.dates || "Dates not specified";

        doc.fontSize(12).text(`${degree} - ${school}`);
        doc.text(duration);
        doc.moveDown();
      });
    }

    doc.end();
  });
}
