import { NextResponse } from "next/server";
import OpenAI from "openai";

const ai = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1"
});

export async function POST(req: Request) {
  try {
    const { incorrectAttempts, conceptArray } = await req.json();

    const prompt = `You are an expert medical tutor. The student has requested an overall analysis of their performance across multiple medical case studies.

Here are the concepts they were tested on, sorted by how often they were tested:
${JSON.stringify(conceptArray, null, 2)}

Here are the specific questions they got wrong, what they chose, and what the correct answer was:
${JSON.stringify(incorrectAttempts, null, 2)}

Please provide a highly detailed, comprehensive markdown report (~1000-1500 words) that:
1. Synthesizes their overall weaknesses based on the concepts they struggled with.
2. Explains *why* they might be making these specific mistakes (look for patterns in the incorrect attempts).
3. Suggests what they should focus on next.
4. Provides extremely clear, easy-to-understand study material for these weak concepts. Break down the medical concepts into intuitive, fundamental principles.

Use markdown formatting including H1-H3 headings, bullet points, and tables where appropriate to make the report easy to read.
Do not use placeholders, and do not reference the JSON data format directly in your response. Speak directly to the student.`;

    const response = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const report = response.choices[0].message.content;
    if (!report) {
      throw new Error("No report generated from AI.");
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("API error generating overall analysis:", error);
    return NextResponse.json(
      { error: "Failed to generate overall analysis.", details: error.message },
      { status: 500 }
    );
  }
}
