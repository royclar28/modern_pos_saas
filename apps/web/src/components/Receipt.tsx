import React from 'react';
import { SaleDocType } from '../db/schemas/sale.schema';

export const Receipt = ({ sale }: { sale: SaleDocType }) => {
    const dateStr = new Date(sale.saleTime).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="w-[80mm] mx-auto bg-white text-black font-mono text-sm leading-tight p-4 print:p-0 print:m-0">

            {/* ── Header ── */}
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold uppercase mb-1">Boutique Femenina</h2>
                <p className="text-xs">Av. Principal 123, Ciudad</p>
                <p className="text-xs">Tel: 555-1234</p>
            </div>

            {/* ── Meta ── */}
            <div className="border-b border-black border-dashed pb-2 mb-2 text-xs">
                <div className="flex justify-between">
                    <span>Ticket:</span>
                    <span className="font-bold">{sale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{dateStr}</span>
                </div>
                <div className="flex justify-between">
                    <span>Cajero:</span>
                    <span>{sale.employeeId}</span>
                </div>
            </div>

            {/* ── Line Items ── */}
            <table className="w-full text-xs text-left mb-2">
                <thead>
                    <tr className="border-b border-black">
                        <th className="py-1 w-8">Cant</th>
                        <th className="py-1">Desc</th>
                        <th className="py-1 text-right w-16">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, idx) => {
                        const lineTotal = item.itemUnitPrice * item.quantityPurchased * (1 - item.discountPercent / 100);
                        return (
                            <tr key={idx}>
                                <td className="py-1 align-top">{item.quantityPurchased}</td>
                                <td className="py-1 align-top pr-1">{item.description}</td>
                                <td className="py-1 align-top text-right">${lineTotal.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ── Totals ── */}
            <div className="border-t border-black border-dashed pt-2 mb-4 text-xs">
                <div className="flex justify-between mb-1">
                    <span>Subtotal:</span>
                    <span>${sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                    <span>IVA ({sale.taxPercent}%):</span>
                    <span>${sale.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base mt-2 border-t border-black pt-2">
                    <span>TOTAL:</span>
                    <span>${sale.total.toFixed(2)}</span>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="text-center text-xs space-y-1">
                <p>¡Gracias por su compra!</p>
                <p>Vuelva pronto</p>
                <p className="text-[10px] mt-2 text-gray-500">Documento no fiscal</p>
            </div>

        </div>
    );
};
