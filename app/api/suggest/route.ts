import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_LENGTH = 500;
const ERROR_MESSAGE = "提案の取得に失敗しました。もう一度お試しください。";
const PROMPT_TEMPLATE = `あなたは家庭料理の専門家です。
以下の食材を使って、今日の献立を3つ提案してください。

食材：{ingredientsをここに入れる}

各献立について以下の形式で答えてください：
1. 料理名
2. 必要な追加食材（もしあれば）
3. 簡単な作り方（3ステップ以内）

家庭で作りやすく、バランスの良い食事を提案してください。`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
    }

    const body = (await request.json()) as { ingredients?: unknown };
    const ingredients = typeof body.ingredients === "string" ? body.ingredients.trim() : "";

    if (!ingredients || ingredients.length > MAX_LENGTH) {
      return NextResponse.json({ error: ERROR_MESSAGE }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = PROMPT_TEMPLATE.replace("{ingredientsをここに入れる}", ingredients);

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text().trim();

    if (!suggestion) {
      return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
  }
}
