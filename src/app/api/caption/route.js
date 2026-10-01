import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

export async function POST(req) {
  try {
    const { imageUrl, fileName } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No imageUrl provided" }, { status: 400 });
    }

    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      return NextResponse.json({ error: "Could not fetch image" }, { status: 400 });
    }
    const contentType = imageResp.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imageResp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: contentType, data: base64 } },
            {
              text: `Generate a short, creative, and descriptive caption (1-2 sentences) for this image. File name hint: "${fileName}". Return only the caption text, nothing else.`,
            },
          ],
        },
      ],
    });

    const caption =
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      "No caption generated.";

    return NextResponse.json({ caption });
  } catch (err) {
    console.error("Caption route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
