// lib/inventory-validation.js
// ─── Shared validation rules — imported by both UI and API ────────────────────
// Having one source of truth means the API can never accept what the UI rejects
// and vice versa. If you change a limit here it updates everywhere.

export const ITEM_LIMITS = {
    name: { max: 200 },
    unit: { max: 50 },
    vendorName: { max: 200 },
    vendorContact: { max: 100 },
    location: { max: 200 },
    // Price sanity limits — prevents typos like 20550 instead of 205.50
    costPerUnit: { min: 0, max: 10_000_000 },   // ₹1 crore max cost
    sellingPrice: { min: 0, max: 10_000_000 },
    quantity: { min: 0, max: 1_000_000 },
    // If selling price is MORE than this multiple of cost, warn the user.
    // e.g. 50× means selling at 5000% markup — almost certainly a typo.
    maxMarkupMultiple: 50,
};

export const SALE_LIMITS = {
    maxQuantityPerLine: 10_000,
    // If the recorded unitPrice differs from the item's current sellingPrice
    // by more than this %, warn the operator before confirming.
    maxPriceDriftPercent: 20,
};

// ─── Item form validation ─────────────────────────────────────────────────────
// Returns { type: 'error'|'warning', field?: string, message: string } | null
// Errors BLOCK save. Warnings SHOW but allow save.
export function validateItemForm(form) {
    const name = form.name?.trim() ?? "";
    const unit = form.unit?.trim() ?? "";
    const cost = Number(form.costPerUnit) || 0;
    const sell = Number(form.sellingPrice) || 0;
    const qty = Number(form.quantity) || 0;

    // ── Required fields ───────────────────────────────────────────────────────
    if (!name)
        return { type: "error", field: "name", message: "Item name is required" };
    if (!unit)
        return { type: "error", field: "unit", message: "Unit is required" };
    if (form.costPerUnit === undefined || form.costPerUnit === "")
        return { type: "error", field: "costPerUnit", message: "Cost per unit is required" };

    // ── Length limits ─────────────────────────────────────────────────────────
    for (const [field, { max }] of Object.entries({
        name: ITEM_LIMITS.name,
        unit: ITEM_LIMITS.unit,
        vendorName: ITEM_LIMITS.vendorName,
        vendorContact: ITEM_LIMITS.vendorContact,
        location: ITEM_LIMITS.location,
    })) {
        if (form[field] && String(form[field]).length > max)
            return { type: "error", field, message: `${field} must be ${max} characters or fewer` };
    }

    // ── Numeric sanity ────────────────────────────────────────────────────────
    if (cost < 0)
        return { type: "error", field: "costPerUnit", message: "Cost per unit cannot be negative" };
    if (sell < 0)
        return { type: "error", field: "sellingPrice", message: "Selling price cannot be negative" };
    if (qty < 0)
        return { type: "error", field: "quantity", message: "Quantity cannot be negative" };

    if (cost > ITEM_LIMITS.costPerUnit.max)
        return { type: "error", field: "costPerUnit", message: `Cost per unit seems too high (max ₹${ITEM_LIMITS.costPerUnit.max.toLocaleString("en-IN")}) — check for extra zeros` };
    if (sell > ITEM_LIMITS.sellingPrice.max)
        return { type: "error", field: "sellingPrice", message: `Selling price seems too high (max ₹${ITEM_LIMITS.sellingPrice.max.toLocaleString("en-IN")}) — check for extra zeros` };

    // ── Markup sanity: selling price way higher than cost ─────────────────────
    // Catches the Casio case (cost=205, sell=30000) as a hard error before saving
    if (cost > 0 && sell > 0 && sell > cost * ITEM_LIMITS.maxMarkupMultiple)
        return {
            type: "error",
            field: "sellingPrice",
            message: `Selling price (₹${sell.toLocaleString("en-IN")}) is more than ${ITEM_LIMITS.maxMarkupMultiple}× the cost (₹${cost.toLocaleString("en-IN")}) — likely a typo`,
        };

    // ── Soft warnings — inform but don't block ────────────────────────────────
    if (sell > 0 && sell < cost)
        return {
            type: "warning",
            field: "sellingPrice",
            message: `Selling ₹${(cost - sell).toFixed(2)} below cost — every sale of this item will be at a loss`,
        };

    if (sell === 0 && form.isSellable)
        return {
            type: "warning",
            field: "sellingPrice",
            message: "No selling price set — cost price will be used at checkout",
        };

    return null;
}

// ─── Sale line item validation ─────────────────────────────────────────────────
// Called when a sale is being recorded, per line item.
// Returns error string or null.
export function validateSaleLine(item, currentSellingPrice, currentCostPrice) {
    const unitPrice = Number(item.unitPrice) || 0;
    const qty = Number(item.quantity) || 0;
    const sell = Number(currentSellingPrice) || 0;
    const cost = Number(currentCostPrice) || 0;

    if (qty <= 0)
        return `Quantity must be at least 1`;
    if (qty > SALE_LIMITS.maxQuantityPerLine)
        return `Quantity cannot exceed ${SALE_LIMITS.maxQuantityPerLine.toLocaleString("en-IN")}`;
    if (unitPrice <= 0)
        return `Unit price must be greater than 0`;

    // Drift check: warn if the price shown in the sale dialog drifts more than
    // 20% from the item's current selling price (catches stale price cache issues)
    if (sell > 0) {
        const drift = Math.abs(unitPrice - sell) / sell * 100;
        if (drift > SALE_LIMITS.maxPriceDriftPercent)
            return `Unit price ₹${unitPrice.toFixed(2)} differs significantly from current selling price ₹${sell.toFixed(2)} — please verify`;
    }

    return null;
}

// ─── API-side validation (same rules, no React) ───────────────────────────────
// Used in the route handlers to validate before touching the DB.
export function validateItemData(data) {
    const cost = parseFloat(data.costPerUnit) || 0;
    const sell = parseFloat(data.sellingPrice) || 0;
    const qty = parseInt(data.quantity) || 0;

    if (!data.name?.trim()) return { status: 400, error: "name is required" };
    if (!data.unit?.trim()) return { status: 400, error: "unit is required" };
    if (data.costPerUnit === undefined || data.costPerUnit === null)
        return { status: 400, error: "costPerUnit is required" };

    if (cost < 0) return { status: 400, error: "costPerUnit cannot be negative" };
    if (sell < 0) return { status: 400, error: "sellingPrice cannot be negative" };
    if (qty < 0) return { status: 400, error: "quantity cannot be negative" };

    if (cost > ITEM_LIMITS.costPerUnit.max)
        return { status: 400, error: `costPerUnit ${cost} exceeds maximum ₹${ITEM_LIMITS.costPerUnit.max} — check for extra zeros` };
    if (sell > ITEM_LIMITS.sellingPrice.max)
        return { status: 400, error: `sellingPrice ${sell} exceeds maximum ₹${ITEM_LIMITS.sellingPrice.max} — check for extra zeros` };

    // Hard block: selling price more than 50× cost is almost certainly a typo
    if (cost > 0 && sell > 0 && sell > cost * ITEM_LIMITS.maxMarkupMultiple)
        return {
            status: 400,
            error: `sellingPrice (${sell}) is more than ${ITEM_LIMITS.maxMarkupMultiple}× costPerUnit (${cost}) — this is likely a data entry error`,
        };

    // Length checks
    const lengths = {
        name: ITEM_LIMITS.name.max,
        unit: ITEM_LIMITS.unit.max,
        vendorName: ITEM_LIMITS.vendorName.max,
        vendorContact: ITEM_LIMITS.vendorContact.max,
        location: ITEM_LIMITS.location.max,
    };
    for (const [field, max] of Object.entries(lengths)) {
        if (data[field] && String(data[field]).length > max)
            return { status: 400, error: `${field} must be ${max} characters or fewer` };
    }

    return null; // all good
}