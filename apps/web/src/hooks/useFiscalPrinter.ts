import { useState } from 'react';
import type { SaleDocType } from '../db/schemas/sale.schema';

// Función para calcular el checksum LRC (XOR)
function calcularLRC(trama: string): number {
    let lrc = 0;
    for (let i = 0; i < trama.length; i++) {
        lrc ^= trama.charCodeAt(i);
    }
    return lrc;
}

// Función constructora de la ráfaga fiscal (Protocolo HKA)
function construirRafaga(comando: string, datos: string = ""): Uint8Array {
    const STX = String.fromCharCode(0x02);
    const ETX = String.fromCharCode(0x03);

    const contenido = comando + datos + ETX;
    const lrc = calcularLRC(contenido);
    
    const tramaFinalString = STX + contenido + String.fromCharCode(lrc);

    const buffer = new Uint8Array(tramaFinalString.length);
    for (let i = 0; i < tramaFinalString.length; i++) {
        buffer[i] = tramaFinalString.charCodeAt(i);
    }
    return buffer;
}

export const useFiscalPrinter = () => {
    const [port, setPort] = useState<any | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Conectar a puerto nuevo pidiendo permiso al usuario
    const connect = async () => {
        try {
            if (!('serial' in navigator)) {
                throw new Error("Web Serial API no está soportada en este navegador. Usa Google Chrome o Microsoft Edge en PC.");
            }
            const p = await (navigator as any).serial.requestPort();
            // Las impresoras The Factory HKA suelen usar 9600 por defecto
            await p.open({ baudRate: 9600 });
            setPort(p);
            return p;
        } catch (error) {
            console.error("Error conectando a impresora fiscal:", error);
            throw error;
        }
    };

    // Obtener un puerto ya autorizado previamente
    const getStoredPort = async () => {
        try {
            if (!('serial' in navigator)) return null;
            const ports = await (navigator as any).serial.getPorts();
            if (ports.length > 0) {
                return ports[0];
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    // Cerrar puerto activo
    const disconnect = async () => {
        if (port) {
            try {
                await port.close();
                setPort(null);
            } catch(e) {}
        }
    };

    // Imprimir venta (Facturar)
    const printFiscalSale = async (sale: SaleDocType, activePort?: any) => {
        let p = activePort || port;
        
        // Si no hay puerto activo, tratar de buscar uno autorizado
        if (!p) {
            p = await getStoredPort();
            if (!p) {
                throw new Error("No hay impresora fiscal conectada. Ve a Ajustes > Facturación para conectarla.");
            }
        }

        // Si el puerto está cerrado, intentar abrirlo
        if (!p.readable || !p.writable) {
            await p.open({ baudRate: 9600 });
        }

        setIsPrinting(true);
        try {
            const writer = p.writable.getWriter();

            const sendCommand = async (cmd: string, data: string = "") => {
                const buf = construirRafaga(cmd, data);
                await writer.write(buf);
                
                // NOTA: Para producción robusta, aquí se debería leer el flujo de entrada (reader) 
                // esperando un ACK (0x06) de la impresora antes de enviar el siguiente comando.
                // Como ejemplo inicial (sin ACK estricto), damos una demora generosa para que la impresora procese.
                await new Promise(r => setTimeout(r, 150));
            };

            // 1. Datos Cliente (i01 Nombre, i02 RIF)
            // Si el cliente está asociado, se podría buscar. Por defecto, genérico.
            await sendCommand("i01", "CLIENTE GENERICO");
            await sendCommand("i02", "V-000000000");

            // 2. Ítems de la Venta
            for (const item of sale.items) {
                // Tasa ' ' (Espacio) = Exento
                // Tasa '!' = General (16%)
                const tasa = sale.taxPercent > 0 ? "!" : " ";
                
                // Precio (10 digitos sin punto decimal: 8 enteros, 2 decimales)
                const precioVal = item.itemUnitPrice * (1 - (item.discountPercent / 100));
                const precioFmt = (precioVal * 100).toFixed(0).padStart(10, '0');
                
                // Cantidad (8 digitos sin punto: 5 enteros, 3 decimales)
                const cantFmt = (item.quantityPurchased * 1000).toFixed(0).padStart(8, '0');
                
                // Descripción (Max 40 chars)
                const desc = (item.description || "ARTICULO").substring(0, 40).padEnd(40, ' ');
                
                // Comando de impresión de ítem: ![Tasa][Precio][Cantidad][Descripcion]
                await sendCommand("!", `${tasa}${precioFmt}${cantFmt}${desc}`);
            }

            // 3. Subtotal
            await sendCommand("3");

            // 4. Pago y Cierre
            // Código 101: Efectivo
            // Código 109: Tarjeta (Punto/Pago Móvil)
            const esTarjeta = sale.paymentMethod === 'PUNTO' || sale.paymentMethod === 'PAGO_MOVIL';
            const codigoPago = esTarjeta ? "109" : "101";
            
            // Envía el comando de pago para saldar completo
            await sendCommand(codigoPago);

            writer.releaseLock();
            
            return true;
        } catch (err) {
            console.error("Fallo durante la impresión fiscal:", err);
            throw err;
        } finally {
            setIsPrinting(false);
        }
    };

    // Función de prueba básica
    const testPrinter = async (activePort?: any) => {
        let p = activePort || port;
        if (!p) throw new Error("No hay puerto conectado");
        if (!p.readable || !p.writable) await p.open({ baudRate: 9600 });
        
        try {
            const writer = p.writable.getWriter();
            writer.releaseLock();
            return true;
        } catch (e) {
            throw e;
        }
    };

    return { port, connect, disconnect, getStoredPort, printFiscalSale, testPrinter, isPrinting };
};
