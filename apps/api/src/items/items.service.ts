import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ItemsService {
    constructor(private prisma: PrismaService) { }

    async findAll(storeId: string) {
        return this.prisma.item.findMany({
            where: { storeId, deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }

    async create(storeId: string, data: Prisma.ItemUncheckedCreateInput) {
        return this.prisma.item.create({
            data: { ...data, storeId }
        });
    }

    async update(storeId: string, id: number, data: Prisma.ItemUpdateInput) {
        return this.prisma.item.update({
            where: { id, storeId },
            data,
        });
    }

    async remove(storeId: string, id: number) {
        // Soft delete
        return this.prisma.item.update({
            where: { id, storeId },
            data: { deletedAt: new Date() },
        });
    }

    /**
     * Delta Sync: Returns only items updated after `since` timestamp.
     * This is the key for efficient RxDB replication — never download everything.
     */
    async getDeltaSince(storeId: string, since: number) {
        const sinceDate = since ? new Date(since) : new Date(0);

        const items = await this.prisma.item.findMany({
            where: {
                storeId,
                updatedAt: { gt: sinceDate },
            },
            orderBy: { updatedAt: 'asc' },
        });

        return {
            lastPulledAt: Date.now(),
            documents: items.map((item) => ({
                id: String(item.id),
                name: item.name,
                category: item.category,
                itemNumber: item.itemNumber ?? undefined,
                description: item.description ?? undefined,
                costPrice: Number(item.costPrice),
                unitPrice: Number(item.unitPrice),
                reorderLevel: Number(item.reorderLevel),
                receivingQuantity: item.receivingQuantity,
                allowAltDescription: item.allowAltDescription,
                isSerialized: item.isSerialized,
                updatedAt: item.updatedAt.getTime(),
                deleted: !!item.deletedAt,
            })),
        };
    }
}
