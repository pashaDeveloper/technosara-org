// Translate display labels without changing values sent to the API.
const labels = {
  admin: "مدیر",
  buyer: "خریدار",
  seller: "فروشنده",
  active: "فعال",
  inactive: "غیرفعال",
  pending: "در انتظار ارسال",
  delivered: "تحویل‌شده",
};

export const persianLabel = (value) => labels[value] || value;
