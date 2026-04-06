import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    console.log("PROMPT RECEIVED:", prompt);
    console.log("KEY EXISTS:", !!process.env.GROQ_API_KEY);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Create a conversation card deck based on this topic: "${prompt}".

STRICT RULES:
- Return ONLY valid JSON
- Do NOT include explanations
- Do NOT include extra text
- Do NOT wrap in markdown backticks

FORMAT:
{
  "title": "Deck Title",
  "cards": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5"
  ]
}

Make it emotional, deep, and meaningful.`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    console.log("GROQ STATUS:", res.status);

    const data = await res.json();
    console.log("GROQ FULL RESPONSE:", JSON.stringify(data, null, 2));

    // ❌ Groq API error
    if (!res.ok) {
      return NextResponse.json({
        error: `Groq API error: ${res.status}`,
        details: data,
      });
    }

    // ❌ No choices returned
    if (!data?.choices?.length) {
      return NextResponse.json({
        error: "No response from Groq",
        details: data,
      });
    }

    // 🔥 Extract text
    let text = data?.choices?.[0]?.message?.content || "";

    // 🔥 Strip markdown backticks if model adds them
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 🔥 Extract JSON block
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return NextResponse.json({
        error: "No JSON found in AI response",
        raw: text,
      });
    }

    const cleaned = text.substring(start, end + 1);

    // 🔥 Validate JSON
    try {
      JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        error: "Invalid JSON from AI",
        raw: cleaned,
      });
    }

    return NextResponse.json({ result: cleaned });

  } catch (error) {
    console.error("ROUTE ERROR:", error);
    return NextResponse.json({
      error: "Something went wrong",
      details: String(error),
    });
  }
}