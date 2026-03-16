import { Update, Ctx, Start, Command, Help, InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { TelegramService } from './telegram.service';

@Update()
export class TelegramUpdate {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly telegramService: TelegramService
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply(
      '¡Bienvenido al Bot Oficial de Merx POS! 🤖\n\n' +
      'Para recibir los Reportes Z, primero necesito enlazar este chat con tu usuario de tienda en nuestro sistema.\n\n' +
      'Por favor, envíame tu correo electrónico usando el comando de esta manera:\n' +
      '`/email admin@merx.com`\n\n' +
      '(Reemplaza admin@merx.com por tu correo registrado)', 
      { parse_mode: 'Markdown' }
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply('Comandos de Merx POS:\n\n/start - Iniciar Bot\n/email <tu_correo> - Registrarse\n/reportez - Solicitar Cierre de Caja');
  }

  @Command('email')
  async onEmailCommand(@Ctx() ctx: Context) {
    // Si el mensaje tiene texto plano
    const message = ctx.message;
    if (!message || !('text' in message)) {
       return ctx.reply('Formato incorrecto.');
    }

    const commandParts = message.text.split(' ');
    const email = commandParts[1];

    if (!email) {
      return ctx.reply('Por favor, ingresa tu correo electrónico tras el comando. \n\nEjemplo:\n/email juan@mi-tienda.com');
    }

    await this.telegramService.registerUser(ctx, email);
  }

  @Command('reportez')
  async onReporteZCommand(@Ctx() ctx: Context) {
    await ctx.reply('Calculando el Reporte Z de hoy... ⏳');
    await this.telegramService.sendReporteZ(ctx);
  }
}
