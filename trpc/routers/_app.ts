import { baseProcedure, createTRPCRouter } from "../init";
import db from "@/lib/db";
import { setSystemSettingsSchema } from "../schemas/system-schemas";
import { hash, verify } from "argon2";
import { z } from "zod";
import { nanoid } from "nanoid";
import { product_type, bar_type } from "@prisma/client"
import { dataEmitter, orderEmitter, realTimeRouter } from "./messages";
import { cookies } from "next/headers";

type OrderItem = {
    name: string;
    type: product_type;
    price: number;
    quantity: number;
    product_id: string;
}

type Order = {
    id: number;
    system_id: number;
    table_id: number;
    bar_id: number;
    status: string;
    drinks: OrderItem[];
    foods: OrderItem[];
    total_price: number;
    created_at: Date;
    table: {
        table_number: number;
    }
}

export type CachedProduct = {
    product_id: string;
    product_name: string;
    product_price: number;
    product_type: product_type;
};
const productsCache = new Map<string, CachedProduct[]>();

type CachedSystemSettings = {
    user_password: string;
    admin_password: string;
    system_name: string;
};
const systemSettingsCache = new Map<string, CachedSystemSettings>();

const COOKIE_DURATION = 60 * 60 * 1000 * 24;
const PITCHER_CONTENT = 5;

export const appRouter = createTRPCRouter({
    logout: baseProcedure
        .mutation(async () => {
            const cookieStore = await cookies();
            cookieStore.delete("zfsession")
            cookieStore.delete("zfadminsession");
            return { success: true };
        }),
    login: baseProcedure
        .input(z.object({
            password: z.string(),
        }))
        .mutation(async ({ input }) => {
            const { password } = input;
            const cookieStore = await cookies();

            const cachedSettings = systemSettingsCache.get("latest-settings");
            if (cachedSettings && cachedSettings.user_password) {
                const isValidPassword = await verify(cachedSettings.user_password, password);
                if (isValidPassword) {
                    cookieStore.set("zfsession", "true", {
                        expires: new Date(Date.now() + COOKIE_DURATION),
                        secure: process.env.ENVIRONMENT === "production",
                        httpOnly: true,
                        sameSite: "lax",
                    })
                    return { success: true };
                }

                return { success: false, isValidPassword };
            } else {
                const settings = await db.system_settings.findFirst({
                    where: { live: true },
                    select: {
                        user_password: true,
                        admin_password: true,
                        name: true,
                    }
                })

                if (!settings || !settings.user_password) {
                    return { success: false };
                }
                const isValidPassword = await verify(settings.user_password, password);

                if (isValidPassword) {
                    cookieStore.set("zfsession", "true", {
                        expires: new Date(Date.now() + COOKIE_DURATION),
                        secure: process.env.ENVIRONMENT === "production",
                        httpOnly: true,
                        sameSite: "lax",
                    })
                    return { success: true };
                }
                return { success: false, isValidPassword };
            }
        }),
    loginAdmin: baseProcedure
        .input(z.object({
            password: z.string(),
        }))
        .mutation(async ({ input }) => {
            const { password } = input;
            const cookieStore = await cookies();

            const cachedSettings = systemSettingsCache.get("latest-settings");
            if (cachedSettings && cachedSettings.admin_password) {
                const isValidPassword = await verify(cachedSettings.admin_password, password);
                if (isValidPassword) {
                    cookieStore.set("zfadminsession", "true", {
                        expires: new Date(Date.now() + COOKIE_DURATION),
                        secure: process.env.ENVIRONMENT === "production",
                        httpOnly: true,
                        sameSite: "lax",
                    })
                    return { success: true };
                }

                return { success: false, isValidPassword };
            } else {
                const settings = await db.system_settings.findFirst({
                    where: { live: true },
                    select: {
                        user_password: true,
                        admin_password: true,
                        name: true,
                    }
                })

                if (!settings || !settings.admin_password) {
                    return { success: false };
                }
                const isValidPassword = await verify(settings.admin_password, password);

                if (isValidPassword) {
                    cookieStore.set("zfadminsession", "true", {
                        expires: new Date(Date.now() + COOKIE_DURATION),
                        secure: process.env.ENVIRONMENT === "production",
                        httpOnly: true,
                        sameSite: "lax",
                    })
                    return { success: true };
                }
                return { success: false, isValidPassword };
            }
        }),
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

            systemSettingsCache.set("latest-settings", {
                user_password: transaction.user_password || "",
                admin_password: transaction.admin_password || "",
                system_name: transaction.name || "",
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
            // console.log(JSON.stringify(input, null, 2));
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
                    // First delete the relations
                    await db.bar_table_relation.deleteMany({
                        where: {
                            id: { in: toDelete.map(r => r.id) },
                        },
                    });

                    // Then delete the tables and bars if they are not referenced by any other relation
                    await db.table.deleteMany({
                        where: {
                            system_id: systemId,
                            id: { in: toDelete.map(r => r.table_id) },
                            bar_table_relation: { none: {} },
                        }
                    });
                    await db.bar.deleteMany({
                        where: {
                            system_id: systemId,
                            id: { in: toDelete.map(r => r.bar_id) },
                            bar_table_relation: { none: {} },
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
                        },
                        table: { select: { table_number: true } },
                    }
                });

                return products;
            });

            const foods = transaction?.product.filter((product) => product.product_type === product_type.FOOD);
            const drinks = transaction?.product.filter((product) => product.product_type === product_type.DRINK);

            return { foods, drinks, id: transaction?.id, name: transaction?.name, tables: transaction?.table };
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

                return { foodItems, drinkItems, table };
            });
            orderEmitter.emit('order');
            dataEmitter.emit('refreshdata');

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
    getKitchenOrders: baseProcedure
        .input(z.object({
            sort: z.enum(["asc", "desc"]).optional(),
        }))
        .query(async ({ input }) => {
            const { sort } = input;

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

                const foodOrders = await db.order.findMany({
                    where: {
                        system_id: activeSystem?.id,
                        foods: { not: { isEmpty: true } },
                        status: "PENDING",
                    },
                    include: {
                        table: { select: { table_number: true } },
                    },
                    orderBy: {
                        created_at: sort === "asc" ? "asc" : "desc",
                    }
                });

                return { foodOrders, activeSystem };
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
            orderEmitter.emit('order');
            dataEmitter.emit('refreshdata');

            return true;
        }),
    getStatistics: baseProcedure
        .query(async () => {
            const transaction = await db.$transaction(async (db) => {
                const activeSystem = await db.system_settings.findFirst({
                    where: { live: true },
                    select: {
                        id: true,
                    },
                });
                const systemId = activeSystem?.id ?? 0;
                const orderCounts = await db.order.groupBy({
                    by: ["status"],
                    where: { system_id: systemId },
                    _count: { _all: true },
                    _sum: { total_price: true },
                });

                const topTables = await db.order.groupBy({
                    by: ["table_id"],
                    where: { system_id: systemId },
                    _count: { _all: true },
                    _sum: { total_price: true },
                    orderBy: {
                        _count: { table_id: "desc" },
                    },
                    take: 5,
                });

                const topTableIds = topTables.map((table) => table.table_id);
                const topTableNumbers = await db.table.findMany({
                    where: {
                        system_id: systemId,
                        id: { in: topTableIds },
                    },
                    select: {
                        table_number: true,
                        id: true,
                    }
                });

                const servedOrders = await db.order.findMany({
                    where: {
                        system_id: systemId,
                        status: "COMPLETED",
                    },
                    select: {
                        drinks: true,
                        foods: true,
                        table: { select: { table_number: true } },
                    }
                });

                const allProducts = productsCache.has(systemId.toString())
                    ? productsCache.get(systemId.toString())
                    : await db.product.findMany({
                        where: { system_id: systemId },
                        select: {
                            product_id: true,
                            product_name: true,
                            product_price: true,
                            product_type: true,
                        }
                    }) as CachedProduct[];

                const allTables = await db.table.findMany({
                    where: { system_id: systemId },
                    select: {
                        table_number: true,
                        id: true,
                    }
                });

                return { orderCounts, topTables, topTableNumbers, servedOrders, allProducts, allTables };
            })

            // Create a flat map of order counts and sums
            const countsMap = Object.fromEntries(
                transaction.orderCounts.map((count) => [count.status, count._count._all])
            );
            // const sumMap = Object.fromEntries(
            //     transaction.orderCounts.map((count) => [count.status, count._sum.total_price])
            // );

            // Create a flat map of top tables and their sums
            const topTablesMap = Object.fromEntries(
                transaction.topTables.map((table) => [table.table_id, table._count._all])
            );
            // Connect the table numbers to the top tables
            const topTableNumbersMap = Object.fromEntries(
                transaction.topTableNumbers.map((table) => [table.id, table.table_number])
            );
            const topTablesMapWithNumbers = Object.fromEntries(
                Object.entries(topTablesMap).map(([tableId, count]) => {
                    const tableNumber = topTableNumbersMap[tableId];
                    return [tableNumber, count];
                })
            );
            // Create a flat map of top tables and their sums
            // const topTablesSumMap = Object.fromEntries(
            //     transaction.topTables.map((table) => [table.table_id, table._sum.total_price])
            // );

            // Create an array of total served drinks and foods
            const drinkCounts = new Map<string, { name: string; quantity: number }>();
            const foodCounts = new Map<string, { name: string; quantity: number }>();

            const servedOrders = transaction.servedOrders as unknown as Order[];
            for (const order of servedOrders) {
                const drinks: OrderItem[] = Array.isArray(order.drinks) ? order.drinks : [];
                const foods: OrderItem[] = Array.isArray(order.foods) ? order.foods : [];

                for (const drink of drinks) {
                    const key = drink.product_id;

                    if (!drinkCounts.has(key)) {
                        drinkCounts.set(key, { name: drink.name, quantity: 0 });
                    }
                    drinkCounts.get(key)!.quantity += drink.quantity;
                }

                for (const food of foods) {
                    const key = food.product_id;

                    if (!foodCounts.has(key)) {
                        foodCounts.set(key, { name: food.name, quantity: 0 });
                    }
                    foodCounts.get(key)!.quantity += food.quantity;
                }
            }

            const orderedFoods = Array.from(foodCounts.entries()).map(([product_id, { name, quantity }]) => ({
                product_id,
                name,
                quantity,
            }));
            const orderedDrinks = Array.from(drinkCounts.entries()).map(([product_id, { name, quantity }]) => ({
                product_id,
                name,
                quantity,
            }));

            // Calculate the table that drank the most beer
            type TableDrinkCount = Map<number, number>;

            const countBeersPerTable = (servedOrders: Order[]) => {
                const targetNames = new Set(['Bier', 'Pitcher Bier']);
                const counts: TableDrinkCount = new Map();

                for (const order of servedOrders) {
                    const drinks: OrderItem[] = Array.isArray(order.drinks) ? order.drinks : [];

                    for (const drink of drinks) {
                        if (!targetNames.has(drink.name)) continue;

                        const prev = counts.get(order.table.table_number) || 0;
                        counts.set(
                            order.table.table_number, prev +
                        (drink.name.split(' ')[0] === 'Pitcher' ? drink.quantity * PITCHER_CONTENT : drink.quantity)
                        );
                    }
                }

                return counts;
            }

            const countRoseBeersPerTable = (servedOrders: Order[]) => {
                const targetNames = new Set(['Rosé Bier', 'Pitcher Rosé Bier']);
                const counts: TableDrinkCount = new Map();

                for (const order of servedOrders) {
                    const drinks: OrderItem[] = Array.isArray(order.drinks) ? order.drinks : [];

                    for (const drink of drinks) {
                        if (!targetNames.has(drink.name)) continue;

                        const prev = counts.get(order.table.table_number) || 0;
                        counts.set(
                            order.table.table_number, prev +
                        (drink.name.split(' ')[0] === 'Pitcher' ? drink.quantity * PITCHER_CONTENT : drink.quantity)
                        );
                    }
                }

                return counts;
            }

            const beerCounts = countBeersPerTable(servedOrders);
            const sortedBeers = Array.from(beerCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)

            const roseBeerCounts = countRoseBeersPerTable(servedOrders);
            const sortedRoseBeers = Array.from(roseBeerCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)

            // Get the table with the most food orders
            const totalFoodPerTable = new Map<number, number>();
            for (const { table, foods } of servedOrders) {
                const foodItems = Array.isArray(foods) ? foods : [];

                const totalQty = foodItems.reduce((sum, food) => sum + food.quantity || 0, 0);

                totalFoodPerTable.set(
                    table.table_number, (totalFoodPerTable.get(table.table_number) || 0) + totalQty
                )
            }

            const [tablenumber, topFoodQuantity] = Array.from(totalFoodPerTable.entries())
                .sort((a, b) => b[1] - a[1])[0] || [];

            // Get the table with the most orders for each food
            type FoodTracker = Map<string, { name: string; table_number: number; quantity: number }>;
            const topPerFood: FoodTracker = new Map();

            for (const { table, foods } of servedOrders) {
                const foodItems = Array.isArray(foods) ? foods : [];
                const table_number = table.table_number;

                for (const food of foodItems) {
                    const name = food.name;
                    const qty = food.quantity || 0;

                    const prevQty = topPerFood.get(name)?.table_number === table_number
                        ? topPerFood.get(name)?.quantity || 0
                        : 0;

                    const newQty = prevQty + qty;

                    const existing = topPerFood.get(name);
                    if (!existing || newQty > existing.quantity) {
                        topPerFood.set(name, {
                            name,
                            table_number,
                            quantity: newQty
                        });
                    }
                }
            };

            const topFoodByTable = Array.from(topPerFood.values())
                .map(item => ({
                    food: item.name,
                    table_number: item.table_number,
                    quantity: item.quantity,
                }));

            return {
                orderCounts: countsMap,
                // orderSum: sumMap,
                topTables: topTablesMapWithNumbers,
                // topTablesSum: topTablesSumMap,
                orderedFoods,
                orderedDrinks,
                allProducts: transaction.allProducts,
                orderedBeers: sortedBeers,
                orderedRoseBeers: sortedRoseBeers,
                mostSnacksTable: {
                    table: tablenumber,
                    quantity: topFoodQuantity,
                },
                topFoodByTable,
            }
        }),
    realtime: realTimeRouter,
});

export type Approuter = typeof appRouter;