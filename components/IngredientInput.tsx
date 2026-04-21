"use client";

type IngredientInputProps = {
  ingredients: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const MAX_LENGTH = 500;

export default function IngredientInput({
  ingredients,
  isLoading,
  onChange,
  onSubmit
}: IngredientInputProps) {
  const trimmed = ingredients.trim();
  const isDisabled = isLoading || trimmed.length === 0 || ingredients.length > MAX_LENGTH;

  return (
    <div className="w-full rounded-2xl border border-terracotta/30 bg-white p-5 shadow-sm">
      <label htmlFor="ingredients" className="mb-2 block text-sm font-medium text-deepGreen">
        食材を入力してください（例：卵、玉ねぎ、鶏肉、醤油）
      </label>
      <textarea
        id="ingredients"
        value={ingredients}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_LENGTH}
        rows={5}
        className="w-full resize-none rounded-xl border border-deepGreen/30 p-3 text-sm outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        placeholder="卵、豆腐、長ねぎ、味噌"
      />
      <div className="mt-2 text-right text-xs text-deepGreen/70">{ingredients.length} / 500</div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        className="mt-4 w-full rounded-xl bg-terracotta px-4 py-3 text-sm font-semibold text-white transition hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:bg-terracotta/50"
      >
        {isLoading ? "提案中..." : "献立を提案する"}
      </button>
    </div>
  );
}
