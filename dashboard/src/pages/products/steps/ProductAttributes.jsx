import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Minus from "@/components/icons/Minus";
import Plus from "@/components/icons/Plus";
import NavigationButton from "@/components/shared/button/NavigationButton";
import {
  TRANSLATION_LANGUAGES,
} from "@/components/shared/translation/TranslationTabs";
import { useTranslateTextMutation } from "@/services/translation/translationApi";
import { useGetProductAttributesQuery } from "@/services/productAttribute/productAttributeApi";

const emptyAttribute = () => ({
  attribute: "",
  value: "",
  valueType: "text",
  isComparable: true,
});

const ProductAttributes = ({
  attributes,
  setAttributes,
  translations,
  setTranslations,
  nextStep,
  prevStep,
}) => {
  const [activeLanguage, setActiveLanguage] = useState("fa");
  const [retryToken, setRetryToken] = useState(0);
  const [translateText] = useTranslateTextMutation();
  const { data: attributeDefinitionsData, isLoading: isLoadingDefinitions } =
    useGetProductAttributesQuery({ page: 1, limit: 100 });
  const manualFields = useRef({});
  const attributeDefinitions = attributeDefinitionsData?.data || [];

  

  const activeConfig =
    TRANSLATION_LANGUAGES.find((language) => language.code === activeLanguage) ||
    TRANSLATION_LANGUAGES[0];

  const updateAttribute = (index, field, value) => {
    if (activeLanguage !== "fa" && field === "value") {
      manualFields.current[`${activeLanguage}.${index}.value`] = true;
      setTranslations((prev) => {
        const nextLanguage = [...(prev[activeLanguage] || [])];
        nextLanguage[index] = {
          ...(nextLanguage[index] || {}),
          value,
        };
        return { ...prev, [activeLanguage]: nextLanguage };
      });
      return;
    }

    setAttributes((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      if (field === "attribute") {
        const definition = attributeDefinitions.find((item) => item._id === value);
        updated.valueType = definition?.valueType || "text";
        updated.value = definition?.valueType === "boolean" ? false : definition?.valueType === "multi_select" ? [] : "";
      }
      next[index] = updated;
      return next;
    });
  };

  const addAttribute = () => {
    setAttributes((prev) => [...prev, emptyAttribute()]);
    setTranslations((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([language, values]) => [
          language,
          [...values, {}],
        ])
      )
    );
  };

  const removeAttribute = (index) => {
    setAttributes((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setTranslations((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([language, values]) => [
          language,
          values.filter((_, itemIndex) => itemIndex !== index),
        ])
      )
    );
  };

  const getTranslatedValue = (index) => {
    if (activeLanguage === "fa") return attributes[index]?.value || "";
    return translations[activeLanguage]?.[index]?.value || "";
  };

  const getAttributeKey = (id) =>
    attributeDefinitions.find((definition) => definition._id === id)?.key || "";

  const getAttributeDefinition = (id) =>
    attributeDefinitions.find((definition) => definition._id === id);

  const toggleMultiValue = (index, optionValue) => {
    const currentValues = Array.isArray(attributes[index]?.value) ? attributes[index].value : [];
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter((item) => item !== optionValue)
      : [...currentValues, optionValue];
    updateAttribute(index, "value", nextValues);
  };

  const renderValueInput = (attribute, index) => {
    const definition = getAttributeDefinition(attribute.attribute);
    const valueType = definition?.valueType || attribute.valueType || "text";
    const options = definition?.options || [];

    if (valueType === "number" || valueType === "range") {
      return (
        <input
          type="number"
          dir="ltr"
          value={attribute.value || ""}
          onChange={(event) => updateAttribute(index, "value", event.target.value)}
          className="rounded border p-2 text-left md:col-span-4"
          placeholder="0"
        />
      );
    }

    if (valueType === "boolean") {
      return (
        <label className="flex h-10 items-center gap-2 rounded border p-2 md:col-span-4">
          <input
            type="checkbox"
            checked={Boolean(attribute.value)}
            onChange={(event) => updateAttribute(index, "value", event.target.checked)}
          />
          <span className="text-sm">فعال</span>
        </label>
      );
    }

    if (valueType === "select" || valueType === "color") {
      return (
        <select
          value={attribute.value || ""}
          onChange={(event) => updateAttribute(index, "value", event.target.value)}
          className="rounded border p-2 md:col-span-4"
        >
          <option value="">انتخاب مقدار</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (valueType === "multi_select") {
      const selectedValues = Array.isArray(attribute.value) ? attribute.value : [];
      return (
        <div className="flex min-h-10 flex-wrap gap-2 rounded border p-2 md:col-span-4">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleMultiValue(index, option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }

    return (
      <input
        type="text"
        dir={activeConfig.dir}
        value={getTranslatedValue(index)}
        onChange={(event) => updateAttribute(index, "value", event.target.value)}
        className={`rounded border p-2 md:col-span-4 ${
          activeConfig.dir === "ltr" ? "text-left" : ""
        }`}
        placeholder="مقدار"
        maxLength={120}
      />
    );
  };

  return (
    <>
      <div className="flex max-h-96 w-full flex-col gap-y-4 overflow-y-auto rounded border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">ویژگی‌های قابل مقایسه</span>
          <button
            type="button"
            onClick={addAttribute}
            className="flex h-7 w-7 items-center justify-center rounded border bg-green-500 text-white"
          >
            <Plus />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            
          </div>
          
        </div>

        {attributes.map((attribute, index) => (
          <div key={`${activeLanguage}-${index}`} className="rounded border p-3">
            <div className="grid gap-2 md:grid-cols-12">
              <select
                value={attribute.attribute || ""}
                disabled={activeLanguage !== "fa" || isLoadingDefinitions}
                onChange={(event) =>
                  updateAttribute(index, "attribute", event.target.value)
                }
                className="rounded border p-2 disabled:bg-gray-100 md:col-span-5"
              >
                <option value="">
                  {isLoadingDefinitions ? "در حال دریافت ویژگی‌ها..." : "انتخاب ویژگی"}
                </option>
                {attributeDefinitions.map((definition) => (
                  <option key={definition._id} value={definition._id}>
                    {definition.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                dir="ltr"
                value={getAttributeKey(attribute.attribute)}
                disabled
                className="rounded border p-2 text-left disabled:bg-gray-100 md:col-span-2"
                placeholder="shelf_life"
                maxLength={60}
              />
              {renderValueInput(attribute, index)}
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="flex h-10 items-center justify-center rounded border bg-red-500 text-white md:col-span-1"
              >
                <Minus />
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={attribute.isComparable}
                disabled={activeLanguage !== "fa"}
                onChange={(event) =>
                  updateAttribute(index, "isComparable", event.target.checked)
                }
              />
              قابل مقایسه با محصولات دیگر
            </label>
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

export default ProductAttributes;
