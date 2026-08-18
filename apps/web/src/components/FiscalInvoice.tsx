import React from 'react';
import { SaleDocType } from '../db/schemas/sale.schema';
import { useSettingsContext } from '../contexts/SettingsProvider';

export const FiscalInvoice = ({ sale }: { sale: SaleDocType }) => {
    const { company, rif, logoUrl, exchangeRate } = useSettingsContext();
    
    const dateStr = new Date(sale.saleTime).toLocaleDateString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const timeStr = new Date(sale.saleTime).toLocaleTimeString('es-VE', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    const isFormal = Boolean(rif && rif.trim().length > 0);
    
    // Si la venta tiene invoiceNumber asigando por backend, usarlo. Si no, usar un fallback (útil para modo offline)
    const controlNum = sale.invoiceNumber || `00-${sale.id.slice(-8).toUpperCase()}`;
    const invoiceNum = sale.invoiceNumber || sale.id.slice(-8).toUpperCase();

    // Montos en Dólares ($)
    const subtotalUsd = sale.subtotal;
    const taxUsd = sale.taxAmount;
    const totalUsd = sale.total;
    // Asumiendo IGTF como un ejemplo (3% de los pagos en divisas si existiera), 
    // en Modern POS el IGTF no está explícitamente en el modelo base, lo dejaremos en 0 o calculado si se requiere.
    const igtfUsd = 0; 
    
    // Montos en Bolívares (Bs) - Se usa la tasa de la venta o la actual
    const rate = exchangeRate || 1;
    const subtotalBs = subtotalUsd * rate;
    const taxBs = taxUsd * rate;
    const totalBs = totalUsd * rate;
    const igtfBs = igtfUsd * rate;

    return (
        <div className="w-[210mm] min-h-[297mm] mx-auto bg-white text-black font-sans text-sm p-10 print:p-0 print:m-0 box-border">
            {/* ── Header ── */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col max-w-[50%]">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo Empresa" className="h-20 object-contain mb-2" />
                    ) : (
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800 mb-2">{company}</h1>
                    )}
                    <p className="text-xs text-slate-600 font-semibold">{company}</p>
                    {isFormal && <p className="text-xs text-slate-600 font-bold">R.I.F. {rif}</p>}
                </div>
                
                <div className="flex flex-col items-end text-right">
                    <h2 className="text-2xl font-black uppercase mb-2">
                        {isFormal ? 'FACTURA' : 'NOTA DE ENTREGA'}
                    </h2>
                    {isFormal && (
                        <p className="text-xs font-bold text-slate-700">Nº DE CONTROL: {controlNum}</p>
                    )}
                    <p className="text-xs font-bold text-slate-700">FECHA EMISIÓN: {dateStr}</p>
                    <p className="text-xs font-bold text-slate-700">HORA EMISIÓN: {timeStr}</p>
                    {isFormal && (
                        <p className="text-xs font-bold text-slate-700">Nº FACTURA: {invoiceNum}</p>
                    )}
                </div>
            </div>

            {/* ── Client Info ── */}
            <div className="border border-slate-300 rounded-lg p-4 mb-6 text-xs bg-slate-50">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="font-bold">Cliente: </span>
                        <span>{sale.customerName || 'Consumidor Final'}</span>
                    </div>
                    <div>
                        <span className="font-bold">C.I./R.I.F.: </span>
                        <span>{sale.customerDocument || 'V-00000000'}</span>
                    </div>
                    {sale.customerEmail && (
                        <div>
                            <span className="font-bold">Correo: </span>
                            <span>{sale.customerEmail}</span>
                        </div>
                    )}
                    {sale.customerPhone && (
                        <div>
                            <span className="font-bold">Teléfono: </span>
                            <span>{sale.customerPhone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Table ── */}
            <table className="w-full text-xs mb-6 border-collapse">
                <thead>
                    <tr className="bg-slate-800 text-white">
                        <th className="py-2 px-3 text-left w-12 rounded-tl-lg">#</th>
                        <th className="py-2 px-3 text-left">Producto</th>
                        <th className="py-2 px-3 text-center">Cantidad</th>
                        <th className="py-2 px-3 text-right">Precio Unitario</th>
                        <th className="py-2 px-3 text-center">Impuestos(%)</th>
                        <th className="py-2 px-3 text-right rounded-tr-lg">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, idx) => {
                        const lineTotal = item.itemUnitPrice * item.quantityPurchased * (1 - item.discountPercent / 100);
                        return (
                            <tr key={idx} className="border-b border-slate-200">
                                <td className="py-2 px-3 text-left">{idx + 1}</td>
                                <td className="py-2 px-3 text-left font-medium">{item.description}</td>
                                <td className="py-2 px-3 text-center">{item.quantityPurchased}</td>
                                <td className="py-2 px-3 text-right">${item.itemUnitPrice.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center">{sale.taxPercent}%</td>
                                <td className="py-2 px-3 text-right font-bold">${lineTotal.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ── Totals ── */}
            <div className="flex justify-end mb-10">
                <div className="w-1/2">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr>
                                <td className="py-1 px-3 text-right text-slate-500">Sub Total:</td>
                                <td className="py-1 px-3 text-right font-semibold">Bs {subtotalBs.toFixed(2)}</td>
                                <td className="py-1 px-3 text-right text-slate-500">Sub Total:</td>
                                <td className="py-1 px-3 text-right font-semibold">${subtotalUsd.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="py-1 px-3 text-right text-slate-500">Descuento:</td>
                                <td className="py-1 px-3 text-right font-semibold">Bs 0.00</td>
                                <td className="py-1 px-3 text-right text-slate-500">Descuento:</td>
                                <td className="py-1 px-3 text-right font-semibold">$0.00</td>
                            </tr>
                            <tr>
                                <td className="py-1 px-3 text-right text-slate-500">Impuestos ({sale.taxPercent}%):</td>
                                <td className="py-1 px-3 text-right font-semibold">Bs {taxBs.toFixed(2)}</td>
                                <td className="py-1 px-3 text-right text-slate-500">Impuestos:</td>
                                <td className="py-1 px-3 text-right font-semibold">${taxUsd.toFixed(2)}</td>
                            </tr>
                            <tr className="border-t border-slate-300">
                                <td className="py-2 px-3 text-right font-bold text-base">Total:</td>
                                <td className="py-2 px-3 text-right font-bold text-base">Bs {totalBs.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right font-bold text-base">Total:</td>
                                <td className="py-2 px-3 text-right font-bold text-base">${totalUsd.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="py-1 px-3 text-right text-slate-500">IGTF:</td>
                                <td className="py-1 px-3 text-right font-semibold">Bs {igtfBs.toFixed(2)}</td>
                                <td className="py-1 px-3 text-right text-slate-500">IGTF:</td>
                                <td className="py-1 px-3 text-right font-semibold">${igtfUsd.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Footer / Legal ── */}
            {isFormal && (
                <div className="text-[10px] text-justify text-slate-500 leading-relaxed border-t border-slate-300 pt-4">
                    <p className="mb-2">
                        <span className="font-bold text-slate-700">Articulo 25 Impuesto al Valor Agregado:</span> En los casos en que la base imponible de venta o prestación de servicio estuviera expresada en moneda extranjera, se establecerá la equivalencia en moneda nacional, al tipo de cambio corriente en el mercado el día en que ocurra el hecho imponible, salvo que este ocurra en un día no hábil para el sector financiero, en cuyo caso se aplicará el vigente en el dia hábil inmediatamente siguiente al de la operación.
                    </p>
                    <p className="mb-4">
                        <span className="font-bold text-slate-700">Impuesto a las Grandes Transacciones Financieras:</span> Este documento fiscal podrá estar sujeto al impuesto a las grandes transacciones financieras, según lo dispuesto en la providencia administrativa SNAT/2022/000013, del 03 de marzo del 2022, publicada en gaceta oficial N° 42.339, del 17 de marzo de 2022.
                    </p>
                    <p className="text-center font-bold text-slate-600 border-t border-slate-200 pt-2">
                        {company.toUpperCase()} - RIF: {rif} - PROVIDENCIA SENIAT/2024/0032
                    </p>
                </div>
            )}
        </div>
    );
};
