import { NextResponse } from "next/server";
import { generateMCQs } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { text, analysis, difficulty, examStyle, questionCount, adaptiveContext, avoidQuestionIds } = await req.json();
    if (!text || !analysis) {
      return NextResponse.json({ error: "Missing text or analysis" }, { status: 400 });
    }
    const rawMcqs = await generateMCQs(text, analysis, difficulty, examStyle, questionCount, adaptiveContext, avoidQuestionIds);
    
    // Add unique IDs to questions and options
    const mcqs = rawMcqs.map((q: any) => {
      const questionId = crypto.randomUUID();
      
      const shuffledRawOptions = [...q.options].sort(() => Math.random() - 0.5);
      const optionsWithIds = shuffledRawOptions.map((opt: any, idx: number) => ({
        ...opt,
        id: crypto.randomUUID(),
        label: String.fromCharCode(65 + idx)
      }));
      
      const correctOption = optionsWithIds.find((o: any) => o.isCorrect);

      return {
        ...q,
        id: questionId,
        options: optionsWithIds,
        correctOptionId: correctOption ? correctOption.id : null,
      };
    });

    return NextResponse.json({ mcqs });
  } catch (error) {
    console.error("API error generating MCQs:", error);
    return NextResponse.json({ error: "Failed to generate MCQs" }, { status: 500 });
  }
}
