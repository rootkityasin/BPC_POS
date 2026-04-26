export function formatOrderId(value, digits = 5) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "";

  // Explicitly handle unplaced POS cart sessions
  if (normalizedValue.startsWith("ORD-") || normalizedValue.startsWith("DRAFT-")) {
    return "DRAFT";
  }

  const numericPart = normalizedValue.replace(/\D/g, "");
  if (!numericPart) return "";

  return numericPart.slice(-digits).padStart(digits, "0");
}
