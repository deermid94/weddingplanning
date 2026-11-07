import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const maxDuration = 30;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "PDF too large (max 4 MB)" }, { status: 413 });
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text, totalPages } = await extractText(pdf, { mergePages: false });
    const joined = (text as string[]).join("\n\n").trim();
    if (!joined) return NextResponse.json({ error: "No text found — the PDF may be a scanned image." }, { status: 422 });
    return NextResponse.json({ text: joined, pages: totalPages });
  } catch (e) {
    return NextResponse.json({ error: `Could not read PDF: ${e instanceof Error ? e.message : e}` }, { status: 422 });
  }
}
