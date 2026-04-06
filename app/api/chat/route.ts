import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Return ONLY JSON.

Create a conversation card deck about: "${prompt}"

{
  "title": "Deck Title",
  "cards": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5"
  ]
}`,
                },
              ],
            },
          ],

          // 🔥 THIS FIXES EMPTY RESPONSE
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await res.json();

    console.log("🔥 FULL RESPONSE:", JSON.stringify(data, null, 2));

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return NextResponse.json({
        error: "EMPTY AI RESPONSE",
        raw: data,
      });
    }

    // 🔥 Extract JSON
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    let clean = text;

    if (start !== -1 && end !== -1) {
      clean = text.substring(start, end + 1);
    }

    return NextResponse.json({ result: clean });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json({
      error: "Server crash",
    });
  }
}