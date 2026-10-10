import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel(modelName) {
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: "Hola, dime si funcionas en 2 palabras.",
    });
    console.log(`✅ ${modelName} SUCCESS:`, res.text.trim());
  } catch (err) {
    console.log(`❌ ${modelName} ERROR:`, err.message || err);
  }
}

async function main() {
  await testModel('gemini-3.7-flash');
  await testModel('gemini-3.6-flash');
  await testModel('gemini-3.5-flash');
  await testModel('gemini-3.8-flash-lite-tts');
}
main();
