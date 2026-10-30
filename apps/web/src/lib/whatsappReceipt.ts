import { SaleDocType } from '../db/schemas/sale.schema';

const PAYMENT_LABELS: Record<string, string> = {
    DIVISA: 'Efectivo Divisa ($)',
    EFECTIVO_BS: 'Efectivo Bolívares (Bs.)',
    PAGO_MOVIL: 'Pago Móvil',
    PUNTO: 'Punto de Venta',
    FIADO: 'Crédito / Fiado',
    MIXTO: 'Pago Mixto',
};

/**
 * Normalizes a phone number for wa.me links.
 * Converts local Venezuelan numbers (e.g. 0412-1234567 or 4121234567) to 584121234567.
 */
export function normalizePhoneForWhatsApp(rawPhone: string): string {
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return '';

    // Local Venezuelan format starting with 04xx (11 digits) -> 584xx
    if (digits.length === 11 && digits.startsWith('04')) {
        return '58' + digits.slice(1);
    }

    // 10 digits starting with 412/414/424/416/426 -> 584xx
    if (digits.length === 10 && /^4(12|14|24|16|26)/.test(digits)) {
        return '58' + digits;
    }

    return digits;
}

/**
 * Builds a clean, WhatsApp-formatted receipt message for a completed sale.
 */
export function buildWhatsAppReceiptText(
    sale: SaleDocType,
    storeName: string,
    exchangeRate: number,
    customerName?: string
): string {
    const ticketId = sale.invoiceNumber ?? sale.id.slice(-8).toUpperCase();
    const dateStr = new Date(sale.saleTime).toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const lines: string[] = [
        `🧾 *RECIBO DE COMPRA — ${(storeName || 'MERX POS').toUpperCase()}*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📌 *Ticket:* #${ticketId}`,
        `📅 *Fecha:* ${dateStr}`,
    ];

    if (customerName) {
        lines.push(`👤 *Cliente:* ${customerName}`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`, `*DETALLE DE PRODUCTOS:*`);

    for (const item of sale.items) {
        const lineTotal = item.itemUnitPrice * item.quantityPurchased * (1 - (item.discountPercent || 0) / 100);
        const qtyStr = Number.isInteger(item.quantityPurchased)
            ? String(item.quantityPurchased)
            : item.quantityPurchased.toFixed(3).replace(/\.?0+$/, '');
        lines.push(`• ${qtyStr}x ${item.description || 'Producto'} — *$${lineTotal.toFixed(2)}*`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Subtotal: $${sale.subtotal.toFixed(2)}`);
    if (sale.taxAmount > 0) {
        lines.push(`IVA (${sale.taxPercent}%): $${sale.taxAmount.toFixed(2)}`);
    }
    lines.push(`💰 *TOTAL USD: $${sale.total.toFixed(2)}*`);
    lines.push(`🇻🇪 *TOTAL Bs.: Bs. ${(sale.total * exchangeRate).toFixed(2)}* _(Tasa: ${exchangeRate.toFixed(2)})_`);

    const methodLabel = PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod || 'Contado';
    lines.push(`💳 *Método:* ${methodLabel}`);

    if (sale.reference) {
        lines.push(`🔢 *Ref:* ${sale.reference}`);
    }

    if (sale.paymentMethod === 'FIADO' && sale.status !== 'PAGADO') {
        const paid = sale.paidAmount || 0;
        const pending = Math.max(0, sale.total - paid);
        lines.push(`📒 *Saldo Pendiente:* $${pending.toFixed(2)} (Bs. ${(pending * exchangeRate).toFixed(2)})`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✨ _¡Gracias por su compra!_`);

    return lines.join('\n');
}

/**
 * Opens WhatsApp Web / App with the formatted receipt.
 * Returns true if phone was valid and window opened, false otherwise.
 */
export function openWhatsAppReceipt(
    rawPhone: string,
    sale: SaleDocType,
    storeName: string,
    exchangeRate: number,
    customerName?: string
): boolean {
    const phone = normalizePhoneForWhatsApp(rawPhone);
    if (phone.length < 10) {
        return false;
    }
    const text = buildWhatsAppReceiptText(sale, storeName, exchangeRate, customerName);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
}
