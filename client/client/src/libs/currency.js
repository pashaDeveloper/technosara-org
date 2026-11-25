// Catalog/API prices and Stripe order totals remain in USD.
export const TOMAN_PER_USD = 350;

export const toToman = (usd) => Math.round(Number(usd || 0) * TOMAN_PER_USD);
export const toUsd = (toman) => Number(toman || 0) / TOMAN_PER_USD;

const numberFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export const formatToman = (usd) => `${numberFormat.format(toToman(usd))} تومان`;
