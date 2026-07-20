import 'dotenv/config';
import { generateMCQs } from './lib/ai.js';

async function run() {
  try {
    const text = "A 45-year-old male presents with severe chest pain radiating to his left arm. ECG shows ST elevation in leads II, III, and aVF. Troponin levels are significantly elevated.";
    const analysis = "This is a classic presentation of an acute inferior ST-segment elevation myocardial infarction (STEMI).";
    
    console.log("Generating MCQs...");
    const mcqs = await generateMCQs(text, analysis, "Basic", "General", 2);
    console.log("MCQs generated successfully!");
    console.log(typeof mcqs);
    console.log(Array.isArray(mcqs));
    console.log(JSON.stringify(mcqs, null, 2).substring(0, 500));
  } catch (err: any) {
    console.error("Error generating MCQs:", err);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

run();
