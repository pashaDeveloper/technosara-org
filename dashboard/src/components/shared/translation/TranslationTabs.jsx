import React from "react";
export const TRANSLATION_LANGUAGES = [{ code: "fa", label: "فارسی", dir: "rtl" }];
export default function TranslationTabs({errors = {}, fields, includeSource = true, register}) {
 if (!includeSource) return null;
 return <div className="flex flex-col gap-4">{fields.map(field => {
 const props = { id: field.name, dir: "rtl", className: "rounded border p-2", maxLength: field.maxLength, placeholder: field.placeholder || field.label, ...register(field.name, {
 required: field.required ? field.label + " الزامی است" : false,
 minLength: field.minLength ? {value: field.minLength, message: field.label + " کوتاه است"} : undefined,
 maxLength: field.maxLength ? {value: field.maxLength, message: field.label + " بیش از حد مجاز است"} : undefined,
 }) };
 return <label key={field.name} htmlFor={field.name} className="flex flex-col gap-y-1"><span>{field.label}{field.required ? "*" : ""}</span>
 {field.type === "textarea" ? <textarea {...props} rows={field.rows || 4} /> : <input {...props} type={field.type || "text"} />}
 {errors[field.name] && <span className="text-red-500">{errors[field.name].message}</span>}</label>;
 })}</div>;
}