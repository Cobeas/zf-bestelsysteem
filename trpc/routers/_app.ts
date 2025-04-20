import { baseProcedure, createTRPCContext, createTRPCRouter } from "../init";
import db from "@/lib/db";
import { setSystemSettingsSchema } from "../schemas/system-schemas";
import { hash } from "argon2";
import { z } from "zod";
import { nanoid } from "nanoid";
import { product_type, bar_type } from "@prisma/client"
import { createCallerFactory } from "@trpc/server/unstable-core-do-not-import";
import { realTimeRouter } from "./messages";

type CachedProduct = {
    product_id: string;
    product_name: string;
    product_price: number;
    product_type: product_type;
};

const productsCache = new Map<string, CachedProduct[]>();

export const appRouter = createTRPCRouter({
    getSystemSettings: baseProcedure
        .query(async () => {
            const settings = await db.system_settings.findMany({
                select: {
                    id: true,
                    name: true,
                    live: true,
                    user_password: true,
                }
            });

            return settings;
        }),
    setSystemSettings: baseProcedure
        .input(setSystemSettingsSchema)
        .mutation(async ({ input }) => {

            const transaction = await db.$transaction(async (db) => {
                const updatedSettings = await db.system_settings.upsert({
                    where: {
                        id: parseInt(input.id ?? "1"),
                    },
                    update: {
                        user_password: input.user_password ? await hash(input.user_password) : undefined,
                        admin_password: input.admin_password ? await hash(input.admin_password) : undefined,
                        name: input.system_name,
                        live: input.live,
                    },
                    create: {
                        id: parseInt(input.id ?? "1"),
                        user_password: await hash(input.user_password || "Bier!"),
                        admin_password: await hash("admin"),
                        live: input.live,
                        name: input.system_name,
                    },
                })

                if (input.live) {
                    await db.system_settings.updateMany({
                        where: {
                            id: {
                                not: updatedSettings.id,
                            },
                        },
                        data: {
                            live: false,
                        },
                    })
                }

                return updatedSettings;
            });

            return transaction;
        }),
    deleteSystemSettings: baseProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await db.system_settings.deleteMany({
                where: {
                    id: input.id,
                }
            });
        }),
    getTableSettings: baseProcedure
        .input(z.object({
            id: z.number().optional(),
        }))
        .query(async ({ input }) => {
            const { id } = input;

            if (!id) return [];

            const transaction = await db.$transaction(async (db) => {
                const settings = await db.bar_table_relation.findMany({
                    where: {
                        system_id: id,
                    },
                    select: {
                        bar: { select: { bar_number: true, id: true } },
                        table: { select: { table_number: true, id: true } },
                    }
                });

                const bars = await db.bar.findMany({
                    where: {
                        system_id: id,
                    },
                    select: {
                        id: true,
                        bar_number: true,
                        bar_name: true,
                        bar_type: true,
                    }
                });

                const totalTables = await db.table.count({
                    where: {
                        system_id: id,
                    },
                });

                return { settings, bars, totalTables };
            });

            return transaction;
        }),
    setTableSettings: baseProcedure
        .input(z.object({
            id: z.number(),
            totalTables: z.number(),
            bars: z.array(z.object({
                number: z.number(),
                name: z.string(),
                type: z.nativeEnum(bar_type),
                id: z.number().nullable(),
            })),
            kitchens: z.array(z.object({
                number: z.number(),
                name: z.string(),
                type: z.nativeEnum(bar_type),
                id: z.number().nullable(),
            })),
            settings: z.array(z.object({
                table_id: z.number().nullable(),
                bar_id: z.number().nullable(),
            })),
        }))
        .mutation(async ({ input }) => {
            const { id: systemId, totalTables, bars, kitchens, settings } = input;
            console.log(JSON.stringify(input, null, 2));
            await db.$transaction(async (db) => {
                // Combine bars and kitchens into one array
                const allBars = [...bars, ...kitchens];

                // Extract incoming bar identities
                const incomingBarIds = allBars
                    .map(b => b.id)
                    .filter((id): id is number => id !== null);

                // Get current bars from the database
                const currentBars = await db.bar.findMany({
                    where: { system_id: systemId },
                    select: { id: true },
                });

                // Delete bars that are not in the new list
                const existingBarIds = currentBars.map(b => b.id);
                const barsToDelete = existingBarIds.filter(id => !incomingBarIds.includes(id));

                if (barsToDelete.length > 0) {
                    await db.bar.deleteMany({
                        where: {
                            id: { in: barsToDelete },
                        }
                    });
                }

                // Upsert bars
                for (const bar of allBars) {
                    if (bar.id === null) {
                        // Create new bar
                        await db.bar.create({
                            data: {
                                system_id: systemId,
                                bar_number: bar.number,
                                bar_name: bar.name,
                                bar_type: bar.type,
                            }
                        });
                    } else {
                        // Update existing bar
                        await db.bar.update({
                            where: { id: bar.id },
                            data: {
                                bar_number: bar.number,
                                bar_name: bar.name,
                                bar_type: bar.type,
                            }
                        });
                    }
                }

                // Get existing tables and relations
                const existingTables = await db.table.findMany({
                    where: { system_id: systemId },
                    select: { id: true, table_number: true },
                });

                const existingRelations = await db.bar_table_relation.findMany({
                    where: { system_id: systemId },
                    select: { id: true, table_id: true, bar_id: true },
                });

                // Map incoming table numbers to existing table IDs
                const tableMap = new Map<number, number>();
                for (let i = 0; i < totalTables; i++) {
                    const tableNumber = i + 1;
                    const existing = existingTables.find(t => t.table_number === tableNumber);

                    if (existing) {
                        tableMap.set(tableNumber, existing.id!);
                    } else {
                        const newTable = await db.table.create({
                            data: {
                                system_id: systemId,
                                table_number: tableNumber,
                            }
                        });
                        tableMap.set(tableNumber, newTable.id);
                    }
                }

                // Sync bar_table_relation
                const newRelationKey = (tableId: number, barId: number) => `${tableId}-${barId}`;
                const incomingRelationKeys = new Set<string>();

                for (const setting of settings) {
                    if (!setting.bar_id) continue;

                    const tableId = setting.table_id ?? tableMap.get(settings.indexOf(setting) + 1);
                    if (!tableId) continue;

                    incomingRelationKeys.add(newRelationKey(tableId, setting.bar_id));

                    const exists = existingRelations.find(r => r.table_id === tableId && r.bar_id === setting.bar_id);

                    if (!exists) {
                        await db.bar_table_relation.create({
                            data: {
                                system_id: systemId,
                                table_id: tableId,
                                bar_id: setting.bar_id,
                            }
                        });
                    }
                }

                // Delete old relations that are not in the new list
                const toDelete = existingRelations.filter((r) => {
                    return !incomingRelationKeys.has(newRelationKey(r.table_id, r.bar_id));
                });

                if (toDelete.length > 0) {
                    await db.bar_table_relation.deleteMany({
                        where: {
                            id: { in: toDelete.map(r => r.id) },
                        }
                    });
                }
            });

            return true;
        }),
    getProductSettings: baseProcedure
        .input(z.object({
            id: z.number().optional(),
        }))
        .query(async ({ input }) => {
            const { id } = input;

            if (!id) return [];

            const products = await db.product.findMany({
                where: {
                    system_id: id,
                },
                select: {
                    product_id: true,
                    product_name: true,
                    product_price: true,
                    product_type: true,
                    position: true,
                }
            });

            const drinks = products.filter((product) => product.product_type === product_type.DRINK);
            const foods = products.filter((product) => product.product_type === product_type.FOOD);

            return { drinks, foods };
        }),
    saveProductSettings: baseProcedure
        .input(z.object({
            id: z.number(),
            foods: z.array(z.object({
                product_id: z.string().nullable(),
                product_name: z.string(),
                product_price: z.number(),
                product_type: z.nativeEnum(product_type),
                position: z.number(),
            })),
            drinks: z.array(z.object({
                product_id: z.string().nullable(),
                product_name: z.string(),
                product_price: z.number(),
                product_type: z.nativeEnum(product_type),
                position: z.number(),
            })),
        }))
        .mutation(async ({ input }) => {
            const { foods, drinks } = input;

            await db.$transaction(async (db) => {
                // Get current products
                const currentProducts = await db.product.findMany({
                    where: {
                        system_id: input.id,
                    },
                });

                // Get products to delete
                const productsToDelete = currentProducts.filter((product) => {
                    return ![...foods, ...drinks].some((p) => p.product_id === product.product_id);
                })

                // Delete products that are not in the new list
                await db.product.deleteMany({
                    where: {
                        id: { in: productsToDelete.map((p) => p.id) },
                    }
                });

                const allProducts = [...foods, ...drinks];

                // Upsert foods and drinks
                for (const product of allProducts) {
                    if (!product.product_id || product.product_id.trim() === "") {
                        console.warn(`Product ID is null or empty for product: ${JSON.stringify(product)}`);
                        continue; // Skip this product
                    }

                    await db.product.upsert({
                        where: {
                            product_id: product.product_id ?? nanoid(),
                        },
                        create: {
                            system_id: input.id,
                            product_id: product.product_id ?? nanoid(),
                            product_name: product.product_name,
                            product_price: product.product_price,
                            product_type: product.product_type,
                            position: product.position,
                        },
                        update: {
                            product_name: product.product_name,
                            product_price: product.product_price,
                            product_type: product.product_type,
                            position: product.position,
                        }
                    });
                }
            });

            productsCache.delete(input.id.toString());
            return true;
        }),
    getOrderProducts: baseProcedure
        .query(async () => {
            const transaction = await db.$transaction(async (db) => {
                const products = await db.system_settings.findFirst({
                    where: { live: true },
                    select: {
                        id: true,
                        name: true,
                        product: {
                            select: {
                                product_id: true,
                                product_name: true,
                                product_type: true,
                                position: true,
                            }
                        }
                    }
                });

                return products;
            });

            const foods = transaction?.product.filter((product) => product.product_type === product_type.FOOD);
            const drinks = transaction?.product.filter((product) => product.product_type === product_type.DRINK);

            return { foods, drinks, id: transaction?.id, name: transaction?.name };
        }),
    makeOrder: baseProcedure
        .input(z.object({
            id: z.string(),
            table: z.string(),
            order: z.record(z.string(), z.string().optional()),
        }))
        .mutation(async ({ input }) => {
            const { id: systemId, table, order } = input;

            const createdOrder = await db.$transaction(async (db) => {
                let products = productsCache.get(systemId);

                if (!products) {
                    products = await db.product.findMany({
                        where: { system_id: parseInt(systemId) },
                        select: {
                            product_id: true,
                            product_name: true,
                            product_price: true,
                            product_type: true,
                        }
                    });
                    productsCache.set(systemId, products);
                }
                const validProductIds = new Set(products.map(p => p.product_id));
                const requestedIds = Object.keys(order);

                for (const id of requestedIds) {
                    if (!validProductIds.has(id)) {
                        throw new Error(`Product ${id} not found`);
                    }
                }
                // Get product data from the database
                const tableData = await db.table.findFirst({
                    where: {
                        system_id: parseInt(systemId),
                        table_number: parseInt(table),
                    },
                    select: {
                        id: true,
                        bar_table_relation: {
                            select: { bar_id: true },
                        }
                    }
                });
                const barId = tableData?.bar_table_relation[0]?.bar_id;

                if (!tableData || !barId) {
                    throw new Error("Tafel nummer niet gevonden");
                }

                // Calculate the total price of the order
                const parsedOrder = products.map((product) => {
                    const quantity = parseInt(order[product.product_id] || "0", 10);
                    const price = product.product_price * quantity;
                    const type = product.product_type;

                    return {
                        product_id: product.product_id,
                        quantity,
                        price,
                        type,
                        name: product.product_name,
                    };
                }).filter((item) => item.quantity > 0);

                const foodItems = parsedOrder.filter((p) => p.type === product_type.FOOD);
                const drinkItems = parsedOrder.filter((p) => p.type === product_type.DRINK);

                await Promise.all([
                    foodItems.length > 0
                        ? db.order.create({
                            data: {
                                system_id: parseInt(systemId),
                                table_id: tableData.id,
                                bar_id: barId,
                                status: "PENDING",
                                foods: foodItems,
                                total_price: foodItems.reduce((acc, item) => acc + item.price, 0),
                            },
                        })
                        : Promise.resolve(),

                    drinkItems.length > 0
                        ? db.order.create({
                            data: {
                                system_id: parseInt(systemId),
                                table_id: tableData.id,
                                bar_id: barId,
                                status: "PENDING",
                                drinks: drinkItems,
                                total_price: drinkItems.reduce((acc, item) => acc + item.price, 0),
                            },
                        })
                        : Promise.resolve(),
                ]);

                return { foodItems, drinkItems };
            });

            // Calculate the total price of the order
            const totalPrice = createdOrder.foodItems.reduce((acc, item) => acc + item.price, 0) +
                createdOrder.drinkItems.reduce((acc, item) => acc + item.price, 0);

            return {
                order: createdOrder,
                totalPrice,
            }
        }),
    getBarOrders: baseProcedure
        .input(z.object({
            barnumber: z.string(),
            sort: z.enum(["asc", "desc"]).optional(),
        }))
        .query(async ({ input }) => {
            const { barnumber, sort } = input;

            const transaction = await db.$transaction(async (db) => {
                const activeSystem = await db.system_settings.findFirst({
                    where: { live: true },
                    select: {
                        id: true,
                        bar: {
                            select: { id: true, bar_number: true, bar_name: true, bar_type: true },
                        }
                    },
                });

                const currentBar = activeSystem?.bar.find((bar) => bar.bar_number === parseInt(barnumber));

                const orders = await db.order.findMany({
                    where: {
                        system_id: activeSystem?.id,
                        bar_id: currentBar?.id,
                        status: "PENDING",
                        drinks: {
                            not: { isEmpty: true },
                        }
                    },
                    include: {
                        table: { select: { table_number: true } },
                    },
                    orderBy: {
                        created_at: sort === "asc" ? "asc" : "desc",
                    }
                });

                return { orders, activeSystem };
            });

            return transaction;
        }),
    sendOrder: baseProcedure
        .input(z.object({
            orderId: z.number(),
        }))
        .mutation(async ({ input }) => {
            await db.order.update({
                where: { id: input.orderId },
                data: {
                    status: "COMPLETED",
                }
            })

            return true;
        }),
    realtime: realTimeRouter,
});

export type Approuter = typeof appRouter;