"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { bar_type } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { trpc } from "@/trpc/client";
import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface BarTableSetting {
    table: number;
    table_id: number | null;
    bar: number;
    bar_id: number | null;
};

interface BarSetting {
    number: number;
    name: string;
    type: bar_type;
    id: number | null;
};

const TafelIndeling: React.FC = () => {
    const utils = trpc.useUtils();
    const { id } = useSettingsStore((state) => state);
    const { data, isPending } = trpc.getTableSettings.useQuery({ id });
    const mutation = trpc.setTableSettings.useMutation();
    const [tableCount, setTableCount] = useState<number>(0);
    const [barTableSettings, setBarTableSettings] = useState<BarTableSetting[]>([]);
    const [bars, setBars] = useState<BarSetting[]>([]);
    const [kitchens, setKitchens] = useState<BarSetting[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isPending && !Array.isArray(data)) {
            setTableCount(data?.totalTables || 0);
            const sortedSettings: BarTableSetting[] = Array.from({ length: data?.totalTables || 0 }, (_, i) => {
                const tableNumber = i + 1;
                const setting = data?.settings.find((s) => s.table.table_number === tableNumber);

                return {
                    table: tableNumber,
                    table_id: setting?.table.id ?? null,
                    bar: setting?.bar.bar_number ?? 1,
                    bar_id: setting?.bar.id ?? null,
                };
            });
            setBarTableSettings(sortedSettings);
            setBars(data?.bars.filter((bar) => bar.bar_type === "BAR").map((b) => ({
                number: b.bar_number,
                name: b.bar_name,
                type: b.bar_type,
                id: b.id,
            })) || []);
            setKitchens(data?.bars.filter((bar) => bar.bar_type === "KITCHEN").map((k) => ({
                number: k.bar_number,
                name: k.bar_name,
                type: k.bar_type,
                id: k.id,
            })) || []);
        }
    }, [data, isPending]);

    const applyEvenDistribution = useCallback(() => {
        if (bars.length === 0 || tableCount === 0) return;

        const tablesPerBar = Math.floor(tableCount / bars.length);
        const remaining = tableCount % bars.length;

        const newSettings: BarTableSetting[] = [];
        let tableIndex = 0;

        bars.forEach((bar, i) => {
            const count = tablesPerBar + (i < remaining ? 1 : 0); // spread remainder
            for (let j = 0; j < count; j++) {
                newSettings.push({
                    table: tableIndex + 1,
                    table_id: barTableSettings[tableIndex]?.table_id ?? null,
                    bar: bar.number,
                    bar_id: bar.id,
                });
                tableIndex++;
            }
        });

        setBarTableSettings(newSettings);
    }, [bars, tableCount, barTableSettings]);

    const applyAlternatingDistribution = useCallback(() => {
        if (bars.length === 0 || tableCount === 0) return;

        const newSettings: BarTableSetting[] = Array.from({ length: tableCount }, (_, i) => {
            const bar = bars[i % bars.length];
            return {
                table: i + 1,
                table_id: barTableSettings[i]?.table_id ?? null,
                bar: bar.number,
                bar_id: bar.id,
            };
        });

        setBarTableSettings(newSettings);
    }, [bars, tableCount, barTableSettings]);

    const deleteBar = useCallback((removeId: number) => {
        // Create a new array of bars without the deleted bar
        const newBars = bars.filter((bar) => bar.number !== removeId);
        // Set the bar_number of the remaining bars to their index + 1
        const updatedBars = newBars.map((bar, index) => ({
            ...bar,
            number: index + 1,
        }));
        setBars(updatedBars);

        // Clear barTableSettings for the deleted bar
        // Get old to new bar number mapping
        const barNumberMap = new Map<number, number>();
        updatedBars.forEach((bar, idx) => {
            barNumberMap.set(bar.number, idx + 1);
        });
        // Update barTableSettings and cleanup stale entries
        setBarTableSettings((prev) =>
            prev.map((s) => {
                const isDeleted = !updatedBars.some((bar) => bar.number === s.bar);
                if (isDeleted) {
                    return { ...s, bar: 1, bar_id: null };
                }

                const newBarNumber = barNumberMap.get(s.bar) ?? 1;
                const newBar = updatedBars.find((bar) => bar.number === newBarNumber);

                return {
                    ...s,
                    bar: newBarNumber,
                    bar_id: newBar?.id ?? null,
                };
            })
        )
    }, [bars]);

    const addBar = useCallback(() => {
        setBars((prev) => [
            ...prev,
            {
                number: prev.length > 0 ? prev[prev.length - 1].number + 1 : 1,
                name: '',
                type: bar_type.BAR,
                id: null,
            },
        ]);
    }, []);

    const updateBarName = useCallback((number: number, name: string) => {
        setBars((prev) =>
            prev.map((bar) => (bar.number === number ? { ...bar, name } : bar))
        );
    }, []);

    const deleteKitchen = useCallback((removeId: number) => {
        // Create a new array of kitchens without the deleted kitchen
        const newKitchens = kitchens.filter((kitchen) => kitchen.number !== removeId);
        // Set the kitchen_number of the remaining kitchens to their index + 1
        const updatedKitchens = newKitchens.map((kitchen, index) => ({
            ...kitchen,
            number: index + 1,
        }));
        setKitchens(updatedKitchens);
    }, [kitchens]);

    const addKitchen = useCallback(() => {
        setKitchens((prev) => [
            ...prev,
            {
                number: prev.length > 0 ? prev[prev.length - 1].number + 1 : 1,
                name: '',
                type: bar_type.KITCHEN,
                id: null,
            },
        ]);
    }, []);

    const updateKitchenName = useCallback((number: number, name: string) => {
        setKitchens((prev) =>
            prev.map((kitchen) => (kitchen.number === number ? { ...kitchen, name } : kitchen))
        );
    }, []);

    const setTableBar = useCallback((tableIndex: number, barNumber: number) => {
        const selectedBar = bars.find((bar) => bar.number === barNumber);
        if (!selectedBar) return;

        setBarTableSettings((prev) => {
            const existing = [...prev];
            const current = existing[tableIndex];

            const newEntry = {
                table: tableIndex + 1,
                table_id: current.table_id ?? null,
                bar: selectedBar.number,
                bar_id: selectedBar.id,
            };

            if (current) {
                existing[tableIndex] = newEntry;
            } else {
                existing.push(newEntry);
            }

            return existing;
        });
    }, [bars]);

    const saveSettings = useCallback(() => {
        const tableMapToKeep = barTableSettings.slice(0, tableCount);

        // true only if every mapping has a numeric bar id
        const allTablesHaveBar =
            tableMapToKeep.length === tableCount &&
            tableMapToKeep.every((m) => Number.isInteger(m.bar_id) && m.bar_id ? m.bar_id > 0 : false);

        if (!allTablesHaveBar) {
            toast.error("Elke tafel moet aan een bar zijn toegewezen.");
            return;
        }
        const payload = {
            id,
            totalTables: tableCount,
            bars,
            kitchens,
            settings: barTableSettings
                .slice(0, tableCount)
                .sort((a, b) => a.table - b.table)
                .filter((s => s.bar_id !== null))
                .map((s) => ({ table_id: s.table_id, bar_id: s.bar_id })),
        }

        console.log(JSON.stringify(payload, null, 2));

        mutation.mutateAsync({
            ...payload,
        }, {
            onSuccess: () => {
                toast.success("Tafel instellingen zijn succesvol opgeslagen.");
            },
            onError: (error) => {
                toast.error(error.message);
            },
        })
    }, [barTableSettings, bars, kitchens, tableCount, id, mutation]);

    useEffect(() => {
        utils.getTableSettings.refetch({ id });
    }, [id, utils.getTableSettings]);

    if (isPending) {
        return <TafelIndelingSkeleton />;
    }

    return (
        <>
            <div className="border border-neutral-600 rounded-lg p-4 min-h-full shadow-md md:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold mb-4">Bar Instellingen</h2>
                    <Button
                        className="ml-auto"
                        onClick={saveSettings}
                        disabled={isPending}
                    >
                        Opslaan
                    </Button>
                </div>
                <div className="flex items-center justify-start space-x-4 mb-2">
                    <span className="w-6">#</span>
                    <span className="w-[calc(100%-6rem)]">Naam</span>
                    <span className="w-32">&nbsp;</span>
                </div>

                {bars.map((bar) => (
                    <div key={bar.number} className="flex items-center justify-start space-x-4 mb-2">
                        <span className="w-6">{bar.number}</span>

                        <Input
                            value={bar.name}
                            onChange={(e) => updateBarName(bar.number, e.target.value)}
                            className="w-[calc(100%-6rem)]"
                            placeholder="Vul naam in"
                        />

                        {bars.length > 1 ? (
                            <Trash2Icon
                                className="size-6 w-32 text-red-500 cursor-pointer"
                                onClick={() => deleteBar(bar.number)}
                            />
                        ) : (
                            <span className="w-32" />
                        )}
                    </div>
                ))}

                <div
                    className="ml-auto w-32 pr-3 flex items-center justify-end cursor-pointer"
                    onClick={addBar}
                >
                    <PlusIcon className="mr-2 size-6 text-emerald-500" />
                    Bar
                </div>

                <h2 className="text-lg font-semibold mb-4 mt-6">Keuken Instellingen</h2>
                <div className="flex items-center justify-start space-x-4 mb-2">
                    <span className="w-6">#</span>
                    <span className="w-[calc(100%-6rem)]">Naam</span>
                    <span className="w-32">&nbsp;</span>
                </div>
                {kitchens.map((kitchen) => (
                    <div key={kitchen.number} className="flex items-center justify-start space-x-4 mb-2">
                        <span className="w-6">{kitchen.number}</span>

                        <Input
                            value={kitchen.name}
                            onChange={(e) => updateKitchenName(kitchen.number, e.target.value)}
                            className="w-[calc(100%-6rem)]"
                            placeholder="Vul naam in"
                        />

                        {kitchens.length > 1 ? (
                            <Trash2Icon
                                className="size-6 w-32 text-red-500 cursor-pointer"
                                onClick={() => deleteKitchen(kitchen.number)}
                            />
                        ) : (
                            <span className="w-32" />
                        )}
                    </div>
                ))}

                <div
                    className="ml-auto w-32 pr-3 flex items-center justify-end cursor-pointer"
                    onClick={addKitchen}
                >
                    <PlusIcon className="mr-2 size-6 text-emerald-500" />
                    Keuken
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold mb-4 mt-6">Tafel Indeling</h2>
                    <div className="flex items-center justify-between space-x-4">
                        <Badge className="cursor-pointer" onClick={applyEvenDistribution}>Verdeel</Badge>
                        <Badge className="cursor-pointer" onClick={applyAlternatingDistribution}>Split Bars</Badge>
                    </div>
                    <div className="flex items-center justify-end">
                        <span>Aantal Tafels</span>
                        <Input
                            type="number"
                            className="w-16 ml-2"
                            value={tableCount}
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!isNaN(value) && value >= 0) {
                                    setTableCount(value);

                                    setBarTableSettings((prev) => {
                                        if (value < prev.length) {
                                            return prev.slice(0, value);
                                        } else {
                                            const newSettings = [...prev];
                                            for (let i = prev.length; i < value; i++) {
                                                newSettings.push({
                                                    table: i + 1,
                                                    table_id: null,
                                                    bar: 1,
                                                    bar_id: null,
                                                });
                                            }

                                            return newSettings;
                                        }
                                    })
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-start space-x-4 mb-2">
                    {tableCount > 0 && <span className="w-8">Tafel</span>}
                    {bars.map((bar) => (
                        <span key={bar.number} className="w-16 text-center">
                            Bar {bar.number}
                        </span>
                    ))}
                </div>
                <Collapsible onOpenChange={setOpen}>
                    <CollapsibleTrigger className="w-full flex items-center justify-start space-x-4">
                        <span>Maak tafel indeling</span>
                        <ChevronDownIcon className={cn('size-6 transition-all duration-500 ease-in', open && 'rotate-180')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        {Array.from({ length: tableCount }, (_, table) => {
                            const isUnassigned = !barTableSettings[table]?.bar_id;
                            return (
                                <div
                                    key={table}
                                    className={cn(
                                        "flex items-center justify-start space-x-4 mb-2",
                                        isUnassigned && "bg-red-100/60 border border-red-400 rounded-md text-black"
                                    )}
                                >
                                    <span className="w-8">{table + 1}</span>
                                    {bars.map((bar, index) => (
                                        <label key={index}>
                                            <input
                                                type="radio"
                                                name={`table-${table + 1}`}
                                                value={bar.number}
                                                checked={barTableSettings[table]?.bar === bar.number}
                                                onChange={() => setTableBar(table, bar.number)}
                                                className="cursor-pointer w-16"
                                            />
                                        </label>
                                    ))}
                                </div>
                            )
                        })}
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </>
    );
};

export default TafelIndeling;

const TafelIndelingSkeleton = () => {
    return (
        <div className='border border-neutral-600 rounded-lg p-4 min-h-full shadow-md md:col-span-2 lg:col-span-1'>
            <h2 className="text-lg font-semibold mb-4">Tafel Indeling</h2>
            <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
            </div>
        </div>
    )
}