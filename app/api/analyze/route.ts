import { NextResponse } from "next/server";
import { analyzeCaseStudy, generateProgressiveCase } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { text, caseFormat } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    
    // Operation 1: Generate analysis
    const result: any = await analyzeCaseStudy(text);
    
    // Operation 2: Generate progressive stages if requested and valid
    if (caseFormat === "progressive" && result.isValid) {
      try {
        const progressiveCase = await generateProgressiveCase(text);
        result.progressiveCase = progressiveCase;
        result.progressiveGenerationStatus = "ready";
      } catch (err) {
        console.error("Progressive stage generation failed, falling back:", err);
        result.progressiveGenerationStatus = "failed";
      }
    } else if (caseFormat === "progressive") {
      // Requested but case wasn't valid enough
      result.progressiveGenerationStatus = "failed";
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error analyzing case:", error);
    return NextResponse.json({ error: "Failed to analyze case" }, { status: 500 });
  }
}
