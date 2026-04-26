export function formatOrderId(value, digits = 4) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "";

  const numericPart = normalizedValue.replace(/\D/g, "");
  if (!numericPart) return "";

  return numericPart.slice(-digits).padStart(digits, "0");
}
