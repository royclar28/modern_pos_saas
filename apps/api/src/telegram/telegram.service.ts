import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Context } from 'telegraf';

@Injectable()
export class TelegramService {
  constructor(private prisma: PrismaService) {}

  async registerUser(ctx: Context, email: string) {
    const chatId = ctx.message?.chat.id.toString();
    if (!chatId) return ctx.reply('No se pudo obtener tu ID de chat. Intenta de nuevo.');

    // Buscar en la DB ignorando mayúsculas/minúsculas
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim() } }, 
    });

    if (!user) {
      return ctx.reply('❌ No se encontró un usuario con ese email en Merx POS. Verifica y vuelve a intentarlo usando: /email <tu_correo>');
    }

    // Actualizar el chatId en el perfil del usuario
    await this.prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: chatId },
    });

    return ctx.reply(`✅ ¡Registro exitoso! Hola ${user.firstName}, tu cuenta está vinculada a este bot.\n\nUsa /reportez para solicitar el reporte de cierre de caja (Z) del día de hoy.`);
  }

  async sendReporteZ(ctx: Context) {
    const chatId = ctx.message?.chat.id.toString();
    if (!chatId) return ctx.reply('No se pudo obtener tu ID de chat.');

    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId },
    });

    if (!user) {
      return ctx.reply('Tu cuenta no está vinculada. Usa /start para ver las instrucciones y proporciona tu email mediante: /email <tu_correo>');
    }

    try {
      // Fecha actual, desde las 00:00:00 hasta las 23:59:59
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sales = await this.prisma.sale.findMany({
        where: {
          storeId: user.storeId,
          saleTime: {
            gte: today, // Operaciones de hoy en adelante
          },
        },
      });

      let efectivo = 0;
      let transferenciasTarjetas = 0;
      let fiadosSum = 0;

      for (const sale of sales) {
        // En Prisma se asume que actualizamos los campos de pago o si no existen
        // se castearan según el decimal de BD
        const total = Number(sale.total) || 0;
        
        // Efectivo en divisas o bolívares (usando total en divisas base por convención)
        if (sale.paymentMethod === 'DIVISA' || sale.paymentMethod === 'EFECTIVO_BS') {
          efectivo += total;
        } 
        // Pagos digitales
        else if (sale.paymentMethod === 'PAGO_MOVIL' || sale.paymentMethod === 'PUNTO') {
          transferenciasTarjetas += total;
        }
        // Fiados que aún no se han pagado el día de hoy (o que se generaron hoy)
        else if (sale.status === 'PENDIENTE' || sale.paymentMethod === 'FIADO') {
          fiadosSum += total;
        }
      }
      
      const totalPagado = efectivo + transferenciasTarjetas;
      
      // Formatear el reporte Markdown
      const reporte = `
📊 *Reporte Z Diario - Merx POS* 📊
📅 *Fecha:* ${new Date().toLocaleDateString('es-VE')}
🏪 *Tienda ID:* ${user.storeId}
👤 *Usuario Responsable:* ${user.firstName} ${user.lastName}

💵 *Efectivo Consolidado (Base USD):* $${efectivo.toFixed(2)}
💳 *Transferencias / Punto de Venta:* $${transferenciasTarjetas.toFixed(2)}
----------------------------------
✅ *TOTAL VENTAS COBRADAS:* *$${totalPagado.toFixed(2)}*

📝 *Total Fiados / Créditos Otorgados Hoy:* $${fiadosSum.toFixed(2)}
`;

      // Enviar de vuelta a Telegram parseado con HTML/Markdown
      return ctx.replyWithMarkdown(reporte);

    } catch (error) {
       console.error('Error al generar Reporte Z:', error);
       return ctx.reply('⚠️ Ocurrió un error al calcular el monto del Reporte Z. Revisa los registros del servidor.');
    }
  }
}
