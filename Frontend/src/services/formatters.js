const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const formatCurrency = (value) => currencyFormatter.format(value);

export const titleCase = (value) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
