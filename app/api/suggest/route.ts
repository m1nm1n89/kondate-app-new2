import { NextResponse } from "next/server";

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

const DUMMY_SUGGESTIONS = [
  `【献立1】\n1. 料理名：鶏肉と玉ねぎの照り焼き丼 + ほうれん草のおひたし + 豆腐とわかめの味噌汁\n2. 必要な追加食材：みりん、砂糖、白ごま\n3. 簡単な作り方：\n- 鶏肉と玉ねぎを炒め、醤油・みりん・砂糖で照り焼き味にする\n- ほうれん草を茹でて醤油で和え、白ごまをふる\n- 豆腐とわかめで味噌汁を作る`,
  `【献立2】\n1. 料理名：鮭の塩焼き + だし巻き卵 + 具だくさん豚汁\n2. 必要な追加食材：だし汁、大根、にんじん、味噌\n3. 簡単な作り方：\n- 鮭に軽く塩をふってグリルで焼く\n- 卵にだし汁を混ぜてだし巻き卵を作る\n- 豚肉と野菜を煮て味噌を溶き、豚汁にする`,
  `【献立3】\n1. 料理名：豆腐ハンバーグ + きのこのバターソテー + キャベツと油揚げの味噌汁\n2. 必要な追加食材：パン粉、きのこ、バター、油揚げ\n3. 簡単な作り方：\n- 豆腐とひき肉、パン粉を混ぜて焼き、ハンバーグにする\n- きのこをバターで炒めて塩こしょうで味を整える\n- キャベツと油揚げで味噌汁を作る`
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ingredients?: unknown };
    const ingredients = typeof body.ingredients === "string" ? body.ingredients.trim() : "";

    if (!ingredients || ingredients.length > MAX_LENGTH) {
      return NextResponse.json({ error: ERROR_MESSAGE }, { status: 400 });
    }

    // TODO: APIキー設定後、以下のようにAnthropic API呼び出しへ置き換える
    // model: claude-sonnet-4-20250514, max_tokens: 1024
    // .env.local の ANTHROPIC_API_KEY をサーバー側のみで利用する
    // prompt: PROMPT_TEMPLATE の {ingredientsをここに入れる} を ingredients で置換して利用
    const randomIndex = Math.floor(Math.random() * DUMMY_SUGGESTIONS.length);
    const suggestion = DUMMY_SUGGESTIONS[randomIndex];

    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
  }
}
