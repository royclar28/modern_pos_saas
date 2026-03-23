import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) {}

    async payDebt(storeId: string, customerId: number, amount: number) {
        if (!amount || amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        // We use an interactive transaction to prevent race conditions
        return await this.prisma.$transaction(async (tx) => {
            // Find all pending sales for this customer
            const pendingSales = await tx.sale.findMany({
                where: {
                    storeId,
                    customerId,
                    paymentMethod: 'FIADO',
                    status: 'PENDIENTE'
                },
                orderBy: { saleTime: 'asc' } // oldest first
            });

            let remainingPayment = amount;
            const updatedSales = [];

            for (const sale of pendingSales) {
                if (remainingPayment <= 0) break;

                const saleTotal = Number(sale.total);
                const currentPaid = Number(sale.paidAmount || 0);
                const debtOnThisSale = saleTotal - currentPaid;

                if (debtOnThisSale <= 0) {
                    // Safety check, should not happen if status was PENDIENTE but just in case
                    await tx.sale.update({
                        where: { id: sale.id },
                        data: { status: 'PAGADO' }
                    });
                    continue;
                }

                if (remainingPayment >= debtOnThisSale) {
                    // Pay this sale completely and move to next
                    const updated = await tx.sale.update({
                        where: { id: sale.id },
                        data: { paidAmount: saleTotal, status: 'PAGADO' }
                    });
                    updatedSales.push(updated);
                    remainingPayment -= debtOnThisSale;
                } else {
                    // Partial payment of this sale
                    const newPaid = currentPaid + remainingPayment;
                    const updated = await tx.sale.update({
                        where: { id: sale.id },
                        data: { paidAmount: newPaid }
                    });
                    updatedSales.push(updated);
                    remainingPayment = 0;
                }
            }

            return {
                success: true,
                paidAmountUsed: amount - remainingPayment,
                leftoverUnused: remainingPayment,
                updatedSalesCount: updatedSales.length
            };
        });
    }
}
