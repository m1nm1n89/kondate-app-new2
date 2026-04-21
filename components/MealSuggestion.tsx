"use client";

type MealSuggestionProps = {
  suggestion: string;
  onRetry: () => void;
};

export default function MealSuggestion({ suggestion, onRetry }: MealSuggestionProps) {
  return (
    <div className="w-full rounded-2xl border border-deepGreen/20 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-deepGreen">今日のおすすめ献立</h2>
      <p className="whitespace-pre-wrap leading-relaxed text-deepGreen/90">{suggestion}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 w-full rounded-xl bg-deepGreen px-4 py-3 text-sm font-semibold text-white transition hover:bg-deepGreen/90"
      >
        もう一度提案する
      </button>
    </div>
  );
}
