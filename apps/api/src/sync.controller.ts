/**
 * SyncController — RxDB REST Replication Protocol
 *
 * Exposes two endpoints consumed by the RxDB replicateRxCollection plugin:
 *   GET  /api/sync/pull?updatedAt=<timestamp>  → Pull handler (delta sync)
 *   POST /api/sync/push                        → Push handler (upsert with LWW)
 *
 * Both endpoints are JWT-protected and tenant-scoped via req.user.storeId.
 */
import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Req,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from './prisma.service';

interface PushRow {
    newDocumentState: any;
    assumedMasterState?: any;
}

@UseGuards(AuthGuard('jwt'))
@Controller('sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * PULL — Delta sync.
     * Returns all items (including soft-deleted) where updatedAt > checkpoint.
     * RxDB needs the `_deleted` flag and a `checkpoint` object to know where to resume.
     */
    @Get('pull')
    async pull(@Req() req: any, @Query('updatedAt') updatedAtParam: string) {
        const storeId = req.user.storeId;
        const since = updatedAtParam ? new Date(Number(updatedAtParam)) : new Date(0);

        const items = await this.prisma.item.findMany({
            where: {
                storeId,
                updatedAt: { gt: since },
            },
            orderBy: { updatedAt: 'asc' },
        });

        const documents = items.map((item) => ({
            id: String(item.id),
            storeId: item.storeId,
            name: item.name,
            category: item.category,
            itemNumber: item.itemNumber ?? '',
            description: item.description ?? '',
            costPrice: Number(item.costPrice),
            unitPrice: Number(item.unitPrice),
            reorderLevel: Number(item.reorderLevel),
            receivingQuantity: item.receivingQuantity,
            allowAltDescription: item.allowAltDescription,
            isSerialized: item.isSerialized,
            updatedAt: item.updatedAt.getTime(),
            _deleted: !!item.deletedAt,
        }));

        const checkpoint =
            documents.length > 0
                ? { updatedAt: documents[documents.length - 1].updatedAt }
                : { updatedAt: since.getTime() };

        return { documents, checkpoint };
    }

    /**
     * PUSH — Upsert with Last-Write-Wins (LWW) conflict resolution.
     * Receives an array of RxDB change rows. Each row has:
     *   - newDocumentState: the document the client wants to write
     *   - assumedMasterState: what the client thinks the server has (optional)
     *
     * On conflict (server doc is newer), return the server doc so RxDB can handle it.
     */
    @Post('push')
    async push(@Req() req: any, @Body() body: { rows: PushRow[] }) {
        const storeId = req.user.storeId;
        const conflicts: any[] = [];

        for (const row of body.rows) {
            const doc = row.newDocumentState;
            const clientUpdatedAt = doc.updatedAt ? new Date(doc.updatedAt) : new Date();

            try {
                // Try to find existing item by the RxDB string id -> Prisma int id
                const prismaId = parseInt(doc.id, 10);
                const existing = isNaN(prismaId)
                    ? null
                    : await this.prisma.item.findFirst({
                          where: { id: prismaId, storeId },
                      });

                if (existing) {
                    // LWW: only update if client doc is newer or equal
                    if (clientUpdatedAt >= existing.updatedAt) {
                        await this.prisma.item.update({
                            where: { id: existing.id },
                            data: {
                                name: doc.name,
                                category: doc.category,
                                itemNumber: doc.itemNumber || null,
                                description: doc.description || null,
                                costPrice: doc.costPrice,
                                unitPrice: doc.unitPrice,
                                reorderLevel: doc.reorderLevel ?? 0,
                                receivingQuantity: doc.receivingQuantity ?? 1,
                                allowAltDescription: doc.allowAltDescription ?? false,
                                isSerialized: doc.isSerialized ?? false,
                                deletedAt: doc._deleted ? new Date() : null,
                                // updatedAt is auto-managed by Prisma @updatedAt
                            },
                        });
                    } else {
                        // Conflict: server is newer, tell RxDB
                        conflicts.push({
                            id: String(existing.id),
                            storeId: existing.storeId,
                            name: existing.name,
                            category: existing.category,
                            itemNumber: existing.itemNumber ?? '',
                            description: existing.description ?? '',
                            costPrice: Number(existing.costPrice),
                            unitPrice: Number(existing.unitPrice),
                            reorderLevel: Number(existing.reorderLevel),
                            receivingQuantity: existing.receivingQuantity,
                            allowAltDescription: existing.allowAltDescription,
                            isSerialized: existing.isSerialized,
                            updatedAt: existing.updatedAt.getTime(),
                            _deleted: !!existing.deletedAt,
                        });
                    }
                } else {
                    // New item — create it in PostgreSQL
                    if (!doc._deleted) {
                        const created = await this.prisma.item.create({
                            data: {
                                name: doc.name,
                                category: doc.category,
                                itemNumber: doc.itemNumber || null,
                                description: doc.description || null,
                                costPrice: doc.costPrice,
                                unitPrice: doc.unitPrice,
                                reorderLevel: doc.reorderLevel ?? 0,
                                receivingQuantity: doc.receivingQuantity ?? 1,
                                allowAltDescription: doc.allowAltDescription ?? false,
                                isSerialized: doc.isSerialized ?? false,
                                storeId,
                            },
                        });
                        this.logger.log(`Created item ${created.id} from sync push`);
                    }
                }
            } catch (error: any) {
                this.logger.error(`Push sync error for doc ${doc.id}: ${error.message}`);
            }
        }

        return conflicts;
    }
}
