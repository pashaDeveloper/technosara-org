import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Minus from "@/components/icons/Minus";
import Plus from "@/components/icons/Plus";
import NavigationButton from "@/components/shared/button/NavigationButton";
import {
  TRANSLATION_LANGUAGES,
} from "@/components/shared/translation/TranslationTabs";
import { useTranslateTextMutation } from "@/services/translation/translationApi";

const Ingredients = ({
  ingredients,
  setIngredients,
  translations,
  setTranslations,
  nextStep,
  prevStep,
}) => {
  const [activeLanguage, setActiveLanguage] = useState("fa");
  const [retryToken, setRetryToken] = useState(0);
  const [translateText] = useTranslateTextMutation();
  const manualFields = useRef({});

  

  const activeConfig =
    TRANSLATION_LANGUAGES.find((language) => language.code === activeLanguage) ||
    TRANSLATION_LANGUAGES[0];

  const values =
    activeLanguage === "fa"
      ? ingredients
      : translations[activeLanguage] || ingredients.map(() => "");

  const updateIngredient = (index, value) => {
    if (activeLanguage === "fa") {
      setIngredients((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
      return;
    }

    manualFields.current[`${activeLanguage}.${index}`] = true;
    setTranslations((prev) => {
      const nextLanguage = [...(prev[activeLanguage] || [])];
      nextLanguage[index] = value;
      return { ...prev, [activeLanguage]: nextLanguage };
    });
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, ""]);
    setTranslations((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([language, values]) => [language, [...values, ""]])
      )
    );
  };

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setTranslations((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([language, values]) => [
          language,
          values.filter((_, itemIndex) => itemIndex !== index),
        ])
      )
    );
  };

  return (
    <>
      <div className="flex max-h-96 w-full flex-col gap-y-3 overflow-y-auto rounded border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">مواد سازنده</span>
          <button
            type="button"
            onClick={addIngredient}
            className="flex h-7 w-7 items-center justify-center rounded border bg-green-500 text-white"
          >
            <Plus />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            
          </div>
          
        </div>

        {ingredients.map((_, index) => (
          <div key={`${activeLanguage}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              dir={activeConfig.dir}
              value={values[index] || ""}
              onChange={(event) => updateIngredient(index, event.target.value)}
              className={`flex-1 rounded border p-2 ${
                activeConfig.dir === "ltr" ? "text-left" : ""
              }`}
              placeholder="مثلا شکر، مغز بادام، عرق بیدمشک"
              maxLength={100}
            />
            {ingredients.length > 1 ? (
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="flex h-8 w-8 items-center justify-center rounded border bg-red-500 text-white"
              >
                <Minus />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-between">
        <NavigationButton direction="next" onClick={nextStep} />
        <NavigationButton direction="prev" onClick={prevStep} />
      </div>
    </>
  );
};

export default Ingredients;
