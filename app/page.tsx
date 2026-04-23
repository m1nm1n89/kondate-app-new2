"use client";

import { useEffect, useMemo, useState } from "react";
import IngredientInput from "@/components/IngredientInput";
import MealSuggestion from "@/components/MealSuggestion";

const MAX_LENGTH = 500;
const ERROR_MESSAGE = "提案の取得に失敗しました。もう一度お試しください。";
const HISTORY_STORAGE_KEY = "kondate_history_v1";
const MAX_HISTORY_ITEMS = 10;
const MOSHIMO_RAKUTEN_ID = process.env.NEXT_PUBLIC_MOSHIMO_RAKUTEN_ID;

type ShoppingItem = {
  name: string;
  amount: string;
};

type MealHistoryItem = {
  id: string;
  suggestion: string;
  shoppingList: ShoppingItem[];
  createdAt: string;
};

const createMealId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

      return {
        name,
        amount: amount || "適量"
      };
    })
    .filter((item): item is ShoppingItem => item !== null);
};

const extractShoppingListFromSuggestion = (text: string): ShoppingItem[] => {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*・\d.]+/, "").trim())
    .filter(Boolean);

  const unitPattern =
    /(g|kg|ml|L|cc|個|枚|本|袋|パック|缶|大さじ|小さじ|カップ|適量|少々|ひとつまみ|1\/2|1\/4)/i;

  const result: ShoppingItem[] = [];

  for (const line of lines) {
    if (!line.includes("：") && !line.includes(":")) {
      continue;
    }

    const [rawName, ...rest] = line.split(/[:：]/);
    const rawAmount = rest.join(" ").trim();
    const name = rawName.trim();
    if (!name || !rawAmount) {
      continue;
    }

    if (!unitPattern.test(rawAmount)) {
      continue;
    }

    result.push({ name, amount: rawAmount });
  }

  return result.slice(0, 20);
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const buildAmazonSearchUrl = (keyword: string) =>
  `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;

const buildRakutenSearchUrl = (keyword: string) => {
  const normalizedKeyword = keyword.trim();
  const normalRakutenUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(normalizedKeyword)}/`;
  const rawId = MOSHIMO_RAKUTEN_ID?.trim();
  const id = rawId?.replace(/^"+|"+$/g, "");
  const isValidId = Boolean(id && /^\d+$/.test(id));

  console.log("[Rakuten Affiliate] NEXT_PUBLIC_MOSHIMO_RAKUTEN_ID(raw):", rawId ?? "(undefined)");
  console.log("[Rakuten Affiliate] a_id(normalized):", id ?? "(undefined)", "valid:", isValidId);

  if (!isValidId) {
    console.log("[Rakuten Affiliate] a_id is missing/invalid. Fallback to normal Rakuten URL:", normalRakutenUrl);
    return normalRakutenUrl;
  }

  const rakutenSearchUrl = `https://search.rakuten.co.jp/search/mall/${normalizedKeyword}/`;
  const affiliateUrl = `https://af.moshimo.com/af/c/click?a_id=${id}&p_id=54&pc_id=54&pl_id=616&url=${encodeURIComponent(rakutenSearchUrl)}`;

  console.log("[Rakuten Affiliate] Built moshimo URL:", affiliateUrl);

  return affiliateUrl;
};

export default function Home() {
  const [ingredients, setIngredients] = useState("");
  const [currentMeal, setCurrentMeal] = useState<MealHistoryItem | null>(null);
  const [history, setHistory] = useState<MealHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!rawHistory) {
        return;
      }

      const parsed = JSON.parse(rawHistory) as unknown;
      if (!Array.isArray(parsed)) {
        return;
      }

      const safeHistory = parsed
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const id = typeof item.id === "string" ? item.id : createMealId();
          const suggestion = typeof item.suggestion === "string" ? item.suggestion.trim() : "";
          const createdAt =
            typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString();
          const shoppingList = normalizeShoppingList((item as { shoppingList?: unknown }).shoppingList);

          if (!suggestion) {
            return null;
          }

          return { id, suggestion, shoppingList, createdAt };
        })
        .filter((item): item is MealHistoryItem => item !== null)
        .slice(0, MAX_HISTORY_ITEMS);

      setHistory(safeHistory);
    } catch {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const shoppingList = useMemo(() => currentMeal?.shoppingList ?? [], [currentMeal]);

  const saveMealToHistory = (meal: MealHistoryItem) => {
    setHistory((prev) => [meal, ...prev.filter((item) => item.id !== meal.id)].slice(0, MAX_HISTORY_ITEMS));
  };

  const handleSubmit = async () => {
    const trimmed = ingredients.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) {
      setError(ERROR_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError("");
    setCurrentMeal(null);
    setCheckedItems({});

    try {
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ingredients: trimmed })
      });

      const data = (await response.json()) as {
        suggestion?: string;
        shoppingList?: ShoppingItem[];
        error?: string;
      };

      if (!response.ok || !data.suggestion) {
        setError(ERROR_MESSAGE);
        return;
      }

      const nextMeal: MealHistoryItem = {
        id: createMealId(),
        suggestion: data.suggestion,
        shoppingList:
          normalizeShoppingList(data.shoppingList).length > 0
            ? normalizeShoppingList(data.shoppingList)
            : extractShoppingListFromSuggestion(data.suggestion),
        createdAt: new Date().toISOString()
      };

      setCurrentMeal(nextMeal);
      saveMealToHistory(nextMeal);
    } catch {
      setError(ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setCurrentMeal(null);
    setError("");
    setCheckedItems({});
  };

  const handleToggleShoppingItem = (index: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSelectHistory = (item: MealHistoryItem) => {
    setCurrentMeal(item);
    setError("");
    setCheckedItems({});
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:py-12">
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-deepGreen sm:text-3xl">献立提案アプリ</h1>
        <p className="mt-2 text-sm text-deepGreen/80">
          冷蔵庫にある食材を入力すると、今日の献立を提案します。
        </p>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">
          {ERROR_MESSAGE}
        </div>
      ) : null}

      {currentMeal ? (
        <>
          <MealSuggestion suggestion={currentMeal.suggestion} onRetry={handleRetry} />
          <p className="mt-3 px-1 text-xs leading-relaxed text-gray-500">
            ※本献立はAIによって自動生成されています。食材のアレルギー、消費期限、調理時の安全については必ずご自身で確認の上、ご利用ください。本サイトの利用により生じた損害について、当サイトは一切の責任を負いません。
          </p>

          <section className="mt-4 w-full rounded-2xl border border-terracotta/30 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-bold text-deepGreen">お買い物リスト</h3>
            {shoppingList.length > 0 ? (
              <ul className="space-y-3">
                {shoppingList.map((item, index) => {
                  const checked = Boolean(checkedItems[index]);
                  return (
                    <li key={`${item.name}-${index}`}>
                      <div
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                          checked
                            ? "border-deepGreen/20 bg-deepGreen/5"
                            : "border-deepGreen/15 bg-white hover:bg-deepGreen/5"
                        }`}
                      >
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleShoppingItem(index)}
                            className="h-6 w-6 rounded border-deepGreen/40 text-terracotta"
                          />
                          <span className={checked ? "text-base text-deepGreen/60 line-through" : "text-base text-deepGreen"}>
                            {item.name}
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <span className={checked ? "text-sm text-deepGreen/50 line-through" : "text-sm text-deepGreen/80"}>
                            {item.amount}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={buildAmazonSearchUrl(item.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md border border-deepGreen/20 px-2 py-1 text-xs font-semibold text-deepGreen/80 transition hover:bg-deepGreen/10"
                            >
                              Amazon
                            </a>
                            <a
                              href={buildRakutenSearchUrl(item.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md border border-deepGreen/20 px-2 py-1 text-xs font-semibold text-deepGreen/80 transition hover:bg-deepGreen/10"
                            >
                              楽天
                            </a>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-deepGreen/30 px-4 py-3 text-sm text-deepGreen/70">
                買い足しが必要な材料はありません。
              </p>
            )}

            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-terracotta bg-terracotta/5 px-4 py-4 text-base font-semibold text-terracotta transition hover:bg-terracotta/10"
            >
              足りないものはネットでチェック
            </button>
          </section>
        </>
      ) : (
        <IngredientInput
          ingredients={ingredients}
          isLoading={isLoading}
          onChange={setIngredients}
          onSubmit={handleSubmit}
        />
      )}

      <section className="mt-8 w-full rounded-2xl border border-deepGreen/20 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-deepGreen">最近作った献立（履歴）</h2>
        {history.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {history.map((item, index) => {
              const historyNumber = history.length - index;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectHistory(item)}
                    className="w-full rounded-xl border border-deepGreen/15 px-4 py-4 text-left transition hover:bg-deepGreen/5"
                  >
                    <p className="text-base font-semibold text-deepGreen">{`献立案${historyNumber}`}</p>
                    <p className="mt-1 text-sm text-deepGreen/70">{formatDateTime(item.createdAt)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-deepGreen/70">まだ履歴はありません。献立を作成するとここに保存されます。</p>
        )}
      </section>
    </main>
  );
}
