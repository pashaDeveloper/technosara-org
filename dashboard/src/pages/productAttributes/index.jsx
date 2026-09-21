import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ControlPanel from "../ControlPanel";
import AddButton from "@/components/shared/button/AddButton";
import DeleteModal from "@/components/shared/DeleteModal";
import Pagination, { usePaginationState } from "@/components/shared/Pagination";
import SearchBox, { useDebouncedValue } from "@/components/shared/SearchBox";
import SkeletonItem from "@/components/shared/skeleton/SkeletonItem";
import Button from "@/components/shared/button/Button";
import Modal from "@/components/shared/modal/Modal";
import Pencil from "@/components/icons/Pencil";
import { TRANSLATION_LANGUAGES } from "@/components/shared/translation/TranslationTabs";
import {
  filterTypes,
  getTypeLabel,
  optionTypes,
} from "../categoryFilters/filterOptions";
import {
  useCreateProductAttributeMutation,
  useDeleteProductAttributeMutation,
  useGetProductAttributesQuery,
  useReorderProductAttributesMutation,
  useUpdateProductAttributeMutation,
} from "@/services/productAttribute/productAttributeApi";
import { useTranslateTextMutation } from "@/services/translation/translationApi";

const initialForm = {
  key: "",
  label: "",
  emoji: "",
  valueType: "text",
  options: [],
  translations: {},
};

const targetLanguages = TRANSLATION_LANGUAGES.filter((language) => language.code !== "fa");

function getLanguageConfig(code) {
  return TRANSLATION_LANGUAGES.find((language) => language.code === code) || TRANSLATION_LANGUAGES[0];
}

function getTranslationFields(item) {
  const translation = item?.translation || {};
  return translation.fields || translation;
}

function toTranslationFormValues(translations = []) {
  return translations.reduce((values, item) => {
    if (!item?.language || item.language === "fa") return values;
    const fields = getTranslationFields(item);
    values[item.language] = { label: fields?.label || "" };
    return values;
  }, {});
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const valueTypeOptions = filterTypes;

function normalizeOptionValue(value, fallback = "", valueType = "") {
  const rawValue = String(value || "").trim();
  if (valueType === "color" && /^#[0-9a-f]{6}$/i.test(rawValue)) {
    return rawValue.toLowerCase();
  }

  return normalizeKey(rawValue || fallback);
}

function AttributeForm({
  activeLanguage,
  form,
  manualFields,
  onChange,
  onLanguageChange,
  onOptionChange,
  onOptionRemove,
  onOptionAdd,
  onRetryTranslate,
  onTranslationChange,
}) {
  const activeConfig = getLanguageConfig(activeLanguage);
  const labelValue =
    activeLanguage === "fa"
      ? form.label
      : form.translations?.[activeLanguage]?.label || "";

  return (
    <div className="w-full flex flex-col gap-y-4 p-4 border rounded">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          
        </div>
        
      </div>

      <label className="flex flex-col gap-y-1">
        <span className="text-sm">
          عنوان ویژگی {activeLanguage === "fa" ? "*" : ""}
        </span>
        <input
          dir={activeConfig.dir}
          name="label"
          onChange={(event) => {
            if (activeLanguage === "fa") {
              onChange(event);
              return;
            }
            manualFields.current[activeLanguage] = event.target.value.trim().length > 0;
            onTranslationChange(activeLanguage, event.target.value);
          }}
          placeholder={activeLanguage === "fa" ? "مثلا ماندگاری" : "Title"}
          required={activeLanguage === "fa"}
          value={labelValue}
          className={activeConfig.dir === "ltr" ? "text-left" : ""}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-y-1">
          <span className="text-sm">ایموجی</span>
          <input
            name="emoji"
            onChange={onChange}
            placeholder="✨"
            value={form.emoji}
            maxLength={16}
          />
        </label>

        <label className="flex flex-col gap-y-1">
          <span className="text-sm">کلید فنی*</span>
          <input
            dir="ltr"
            name="key"
            onChange={onChange}
            placeholder="shelf_life"
            readOnly
            value={form.key}
            className="bg-gray-50 text-left dark:bg-slate-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-y-1">
        <span className="text-sm">نوع مقدار</span>
        <select name="valueType" onChange={onChange} value={form.valueType}>
          {valueTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {optionTypes.includes(form.valueType) ? (
        <div className="flex flex-col gap-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">گزینه‌ها</span>
            <button
              type="button"
              onClick={onOptionAdd}
              className="rounded border px-3 py-1 text-xs"
            >
              افزودن
            </button>
          </div>
          {(form.options || []).map((option, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-12">
              <input
                className="md:col-span-5"
                onChange={(event) => onOptionChange(index, "label", event.target.value)}
                placeholder="Label"
                value={option.label || ""}
              />
              <input
                className="text-left md:col-span-5"
                dir="ltr"
                onChange={(event) => onOptionChange(index, "value", event.target.value)}
                placeholder="value"
                value={option.value || ""}
              />
              <button
                type="button"
                onClick={() => onOptionRemove(index)}
                className="rounded border px-3 py-1 text-xs md:col-span-2"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      ) : null}

    </div>
  );
}

function ProductAttributes() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [orderedAttributes, setOrderedAttributes] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [activeLanguage, setActiveLanguage] = useState("fa");
  const [retryToken, setRetryToken] = useState(0);
  const manualFields = useRef({});
  const lastAutoValues = useRef({});
  const debouncedSearch = useDebouncedValue(search);
  const pagination = usePaginationState(5, debouncedSearch);

  const { data, isLoading } = useGetProductAttributesQuery({
    page: pagination.currentPage,
    limit: pagination.pageSize,
    search: debouncedSearch,
  });
  const [createAttribute, createState] = useCreateProductAttributeMutation();
  const [updateAttribute, updateState] = useUpdateProductAttributeMutation();
  const [deleteAttribute, deleteState] = useDeleteProductAttributeMutation();
  const [reorderAttributes, reorderState] = useReorderProductAttributesMutation();
  const [translateText] = useTranslateTextMutation();

  const attributes = data?.data || [];
  const meta = data?.pagination;
  const isSaving = createState.isLoading || updateState.isLoading;

  useEffect(() => {
    setOrderedAttributes(attributes);
  }, [attributes]);

  useEffect(() => {
    if (modalMode === "create") {
      setForm(initialForm);
      setSelectedAttribute(null);
      setActiveLanguage("fa");
      manualFields.current = {};
      lastAutoValues.current = {};
    }
  }, [modalMode]);

  

  const closeModal = () => {
    setModalMode(null);
    setSelectedAttribute(null);
    setForm(initialForm);
    setActiveLanguage("fa");
    manualFields.current = {};
    lastAutoValues.current = {};
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: name === "key" ? normalizeKey(value) : value };
      if (name === "valueType" && !optionTypes.includes(value)) {
        next.options = [];
      }
      return next;
    });
  };

  const handleOptionAdd = () => {
    setForm((prev) => ({
      ...prev,
      options: [...(prev.options || []), { label: "", value: "" }],
    }));
  };

  const handleOptionRemove = (index) => {
    setForm((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleOptionChange = (index, field, value) => {
    setForm((prev) => {
      const options = [...(prev.options || [])];
      const nextOption = {
        ...(options[index] || {}),
        [field]: field === "value" ? normalizeOptionValue(value, "", prev.valueType) : value,
      };
      if (field === "label" && !options[index]?.value) {
        nextOption.value = normalizeOptionValue(value, "", prev.valueType);
      }
      options[index] = nextOption;
      return { ...prev, options };
    });
  };

  const handleTranslationChange = (language, value) => {
    setForm((prev) => ({
      ...prev,
      key: language === "en" ? normalizeKey(value) : prev.key,
      translations: {
        ...prev.translations,
        [language]: {
          ...(prev.translations?.[language] || {}),
          label: value,
        },
      },
    }));
  };

  const openEdit = (attribute) => {
    setSelectedAttribute(attribute);
    setForm({
      key: attribute.key || "",
      label: attribute.label || "",
      emoji: attribute.emoji || "",
      valueType: attribute.valueType || "text",
      options: attribute.options || [],
      translations: toTranslationFormValues(attribute.translations || []),
    });
    setActiveLanguage("fa");
    manualFields.current = {};
    lastAutoValues.current = {};
    setModalMode("edit");
  };

  const buildBody = () => ({
    key: form.key,
    label: form.label,
    emoji: form.emoji,
    valueType: form.valueType,
    options: form.options,
    translations: form.translations,
  });

  const persistOrder = async (items) => {
    try {
      await reorderAttributes({
        orderedIds: items.map((item) => item._id),
        startSortOrder: (pagination.currentPage - 1) * pagination.pageSize,
      }).unwrap();
      toast.success("ترتیب ویژگی‌ها ذخیره شد");
    } catch (error) {
      toast.error(error?.data?.description || "ذخیره ترتیب انجام نشد");
      setOrderedAttributes(attributes);
    }
  };

  const handleDrop = (targetId) => {
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = orderedAttributes.findIndex((item) => item._id === draggedId);
    const toIndex = orderedAttributes.findIndex((item) => item._id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextItems = [...orderedAttributes];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);

    setOrderedAttributes(nextItems);
    setDraggedId(null);
    persistOrder(nextItems);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response =
        modalMode === "edit"
          ? await updateAttribute({ id: selectedAttribute._id, body: buildBody() }).unwrap()
          : await createAttribute(buildBody()).unwrap();

      toast.success(response.description || "ویژگی ذخیره شد");
      closeModal();
    } catch (error) {
      toast.error(error?.data?.description || "ذخیره ویژگی انجام نشد");
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await deleteAttribute(id).unwrap();
      toast.success(response.description || "ویژگی حذف شد");
    } catch (error) {
      toast.error(error?.data?.description || "حذف ویژگی انجام نشد");
    }
  };

  return (
    <ControlPanel>
      <SearchBox onChange={setSearch} placeholder="جستجوی عنوان یا کلید ویژگی..." value={search} />
      <div className="mt-4">
        <AddButton onClick={() => setModalMode("create")} />
      </div>

      <div className="mt-8 grid w-full grid-cols-12 px-4 text-slate-400">
        <div className="col-span-8 text-sm lg:col-span-5">عنوان</div>
        <div className="hidden text-sm lg:col-span-3 lg:flex">کلید</div>
        <div className="hidden text-sm lg:col-span-2 lg:flex">نوع</div>
        <div className="col-span-4 text-center text-sm lg:col-span-2">عملیات</div>
      </div>

      {isLoading || !orderedAttributes.length ? (
        <SkeletonItem repeat={5} />
      ) : (
        orderedAttributes.map((item) => (
          <div
            draggable={!reorderState.isLoading}
            key={item._id}
            className={`mt-4 grid grid-cols-12 gap-2 rounded-xl border border-gray-200 bg-white px-2 p-1 text-slate-700 transition-all hover:border-slate-100 hover:bg-green-50/50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-gray-900 ${
              draggedId === item._id ? "opacity-60 ring-2 ring-green-400 dark:ring-blue-400" : ""
            }`}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedId(item._id)}
            onDrop={() => handleDrop(item._id)}
          >
            <div className="col-span-8 flex items-center gap-3 lg:col-span-5">
              <button
                aria-label="تغییر ترتیب"
                className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-green-400 hover:text-green-600 active:cursor-grabbing dark:border-white/10 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                type="button"
              >
                ⋮⋮
              </button>
              {item.emoji ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg dark:bg-slate-700">
                  {item.emoji}
                </span>
              ) : null}
              <article className="flex min-w-0 flex-col gap-y-2 py-2 text-right">
                <span className="line-clamp-1 text-base">{item.label}</span>
                <span className="line-clamp-1 text-xs text-slate-500 dark:text-slate-300 lg:hidden" dir="ltr">
                  {item.key}
                </span>
              </article>
            </div>

            <div className="hidden items-center text-right lg:col-span-3 lg:flex">
              <span className="line-clamp-1 font-mono text-sm" dir="ltr">{item.key}</span>
            </div>

            <div className="hidden items-center text-right lg:col-span-2 lg:flex">
              <span className="text-sm text-slate-500 dark:text-slate-300">
                {getTypeLabel(item.valueType)}
              </span>
            </div>

            <div className="col-span-4 flex items-center justify-center gap-2 lg:col-span-2">
              <button
                aria-label="ویرایش ویژگی"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-green-400 hover:text-green-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                onClick={() => openEdit(item)}
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <DeleteModal
                ariaLabel="حذف ویژگی"
                isLoading={deleteState.isLoading}
                itemTitle={item.label}
                message="این ویژگی حذف شود؟"
                onDelete={() => handleDelete(item._id)}
              />
            </div>
          </div>
        ))
      )}

      <Pagination
        currentPage={pagination.currentPage}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={pagination.setPageSize}
        pageSize={pagination.pageSize}
        totalItems={meta?.totalItems || orderedAttributes.length}
        totalPages={meta?.totalPages}
      />

      <Modal
        isOpen={modalMode === "create" || modalMode === "edit"}
        onClose={closeModal}
        className="lg:w-1/3 md:w-1/2 w-full z-50 p-4 rounded-md overflow-y-hidden"
      >
        <form className="text-sm w-full h-full flex flex-col gap-y-4 mb-3 p-4 overflow-y-auto" onSubmit={handleSubmit}>
          <h2 className="text-base font-bold">
            {modalMode === "edit" ? "ویرایش ویژگی" : "افزودن ویژگی"}
          </h2>
          <AttributeForm
            activeLanguage={activeLanguage}
            form={form}
            manualFields={manualFields}
            onChange={handleChange}
            onLanguageChange={setActiveLanguage}
            onOptionAdd={handleOptionAdd}
            onOptionChange={handleOptionChange}
            onOptionRemove={handleOptionRemove}
            onRetryTranslate={() => {
              manualFields.current = {};
              setRetryToken((value) => value + 1);
            }}
            onTranslationChange={handleTranslationChange}
          />
          <Button type="submit" className="py-2 mt-4 mb-4 bg-black" isLoading={isSaving}>
            ذخیره
          </Button>
        </form>
      </Modal>
    </ControlPanel>
  );
}

export default ProductAttributes;
