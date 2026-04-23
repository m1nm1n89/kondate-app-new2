import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_LENGTH = 500;
const ERROR_MESSAGE = "提案の取得に失敗しました。もう一度お試しください。";
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const PROMPT_TEMPLATE = `あなたは家庭料理の専門家です。
以下の食材を使って、家庭で作りやすい献立を提案してください。

食材：{ingredientsをここに入れる}

必ず JSON のみを返してください（Markdownや説明文は禁止）。
形式は以下を厳守してください:
{
  "suggestion": "表示用テキスト（献立3案。各案に料理名、必要な追加食材、作り方3ステップ以内を含める）",
  "shoppingList": [
    { "name": "材料名", "amount": "分量" }
  ]
}

shoppingList には、買い足しが必要な材料を重複なく列挙してください。
分量が不明な場合は "適量" を使ってください。`;

type ShoppingItem = {
  name: string;
  amount: string;
};

const parseJsonText = (rawText: string) => {
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleaned) as { suggestion?: unknown; shoppingList?: unknown };
};

const normalizeShoppingList = (items: unknown): ShoppingItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const name = typeof item.name === "string" ? item.name.trim() : "";
      const amount = typeof item.amount === "string" ? item.amount.trim() : "";
      if (!name) {
        return null;
      }

      return { name, amount: amount || "適量" };
    })
    .filter((item): item is ShoppingItem => item !== null);
};

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
    const prompt = PROMPT_TEMPLATE.replace("{ingredientsをここに入れる}", ingredients);
    let suggestion = "";
    let shoppingList: ShoppingItem[] = [];

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (!text) {
          continue;
        }

        try {
          const parsed = parseJsonText(text);
          const parsedSuggestion =
            typeof parsed.suggestion === "string" ? parsed.suggestion.trim() : "";
          const parsedShoppingList = normalizeShoppingList(parsed.shoppingList);

          if (parsedSuggestion) {
            suggestion = parsedSuggestion;
            shoppingList = parsedShoppingList;
            break;
          }
        } catch {
          suggestion = text;
        }

        if (suggestion) {
          break;
        }
      } catch (modelError) {
        console.error(`Gemini model failed: ${modelName}`, modelError);
      }
    }

    if (!suggestion) {
      return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ suggestion, shoppingList });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
  }
}
