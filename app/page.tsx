"use client";

import { useState } from "react";
import IngredientInput from "@/components/IngredientInput";
import MealSuggestion from "@/components/MealSuggestion";

const MAX_LENGTH = 500;
const ERROR_MESSAGE = "提案の取得に失敗しました。もう一度お試しください。";

export default function Home() {
  const [ingredients, setIngredients] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = ingredients.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) {
      setError(ERROR_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuggestion("");

    try {
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ingredients: trimmed })
      });

      const data = (await response.json()) as { suggestion?: string; error?: string };

      if (!response.ok || !data.suggestion) {
        setError(ERROR_MESSAGE);
        return;
      }

      setSuggestion(data.suggestion);
    } catch {
      setError(ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setSuggestion("");
    setError("");
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

      {suggestion ? (
        <MealSuggestion suggestion={suggestion} onRetry={handleRetry} />
      ) : (
        <IngredientInput
          ingredients={ingredients}
          isLoading={isLoading}
          onChange={setIngredients}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
