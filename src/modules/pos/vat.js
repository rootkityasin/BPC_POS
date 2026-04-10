function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateVatInclusiveTotals(grossAmount, vatPercentage) {
  const gross = roundCurrency(grossAmount || 0);
  const percentage = Number(vatPercentage) || 0;

  if (percentage <= 0) {
    return {
      grossAmount: gross,
      subtotalAmount: gross,
      vatAmount: 0,
      totalAmount: gross,
      vatPercentage: percentage
    };
  }

  const subtotalAmount = roundCurrency(gross / (1 + (percentage / 100)));
  const vatAmount = roundCurrency(gross - subtotalAmount);

  return {
    grossAmount: gross,
    subtotalAmount,
    vatAmount,
    totalAmount: gross,
    vatPercentage: percentage
  };
}

export function calculateVatExclusiveUnitPrice(unitPrice, vatPercentage) {
  return calculateVatInclusiveTotals(unitPrice, vatPercentage).subtotalAmount;
}
