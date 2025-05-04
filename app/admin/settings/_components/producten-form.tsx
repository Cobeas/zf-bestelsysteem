"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { product_type } from "@prisma/client";
import { useSettingsStore } from "@/stores/settings-store";
import { trpc } from "@/trpc/client";
import { MenuIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DropArea from "./drop-area";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
    product_id: string | null;
    product_name: string;
    product_price: number;
    product_type: product_type;
    position: number;
}

const ProductenForm = () => {
    const utils = trpc.useUtils();
    const { id } = useSettingsStore((state) => (state));
    const { data, isPending, isLoading } = trpc.getProductSettings.useQuery({ id });
    const mutation = trpc.saveProductSettings.useMutation();
    const [drinks, setDrinks] = useState<Product[]>([]);
    const [foods, setFoods] = useState<Product[]>([]);
    const [activeDrink, setActiveDrink] = useState<Product | null>(null);
    const [activeFood, setActiveFood] = useState<Product | null>(null);

    useEffect(() => {
        if (!isPending && !Array.isArray(data)) {
            setDrinks(data?.drinks.length ? data.drinks.map((drink) => ({
                product_id: drink.product_id,
                product_name: drink.product_name,
                product_price: drink.product_price,
                product_type: drink.product_type,
                position: drink.position,
            })) : []);

            setFoods(Array.isArray(data?.foods) ? data.foods.map((food) => ({
                product_id: food.product_id,
                product_name: food.product_name,
                product_price: food.product_price,
                product_type: food.product_type,
                position: food.position,
            })) : []);
        }
    }, [data, isPending]);

    const addDrink = useCallback(() => {
        setDrinks((prev) => [
            ...prev,
            {
                product_id: nanoid(),
                product_name: '',
                product_price: 0,
                product_type: product_type.DRINK,
                position: prev.length,
            },
        ]);
    }, []);

    const updateDrinkName = useCallback((index: number, name: string) => {
        const prevDrinks = [...drinks];
        prevDrinks[index].product_name = name;
        setDrinks(prevDrinks);
    }, [drinks]);

    const updateDrinkPrice = useCallback((index: number, price: number) => {
        const prevDrinks = [...drinks];
        prevDrinks[index].product_price = price;
        setDrinks(prevDrinks);
    }, [drinks]);

    const deleteDrink = useCallback((index: number) => {
        const prevDrinks = [...drinks];
        prevDrinks.splice(index, 1);
        setDrinks(prevDrinks);
    }, [drinks]);

    const addFood = useCallback(() => {
        setFoods((prev) => [
            ...prev,
            {
                product_id: nanoid(),
                product_name: '',
                product_price: 0,
                product_type: product_type.FOOD,
                position: prev.length,
            },
        ]);
    }, []);

    const updateFoodName = useCallback((index: number, name: string) => {
        const prevFoods = [...foods];
        prevFoods[index].product_name = name;
        setFoods(prevFoods);
    }, [foods]);

    const updateFoodPrice = useCallback((index: number, price: number) => {
        const prevFoods = [...foods];
        prevFoods[index].product_price = price;
        setFoods(prevFoods);
    }, [foods]);

    const deleteFood = useCallback((index: number) => {
        const prevFoods = [...foods];
        prevFoods.splice(index, 1);
        setFoods(prevFoods);
    }, [foods]);

    const saveProducts = useCallback(() => {
        const payload = {
            foods,
            drinks,
            id,
        }

        mutation.mutateAsync({
            ...payload,
        }, {
            onSuccess: () => {
                toast.success("Product instellingen zijn succesvol opgeslagen.");
            },
            onError: (error) => {
                toast.error(error.message);
            },
        })
    }, [foods, drinks, id, mutation]);

    const onDrop = useCallback((position: number, type: 'FOOD' | 'DRINK') => {
        console.log('onDrop', position, type);

        if (type === 'FOOD') {
            if (activeFood === null || activeFood === undefined) return;

            const dragIndex = foods.findIndex(f => f.product_id === activeFood.product_id);
            if (dragIndex === -1) return;

            const updatedFoods = [...foods];
            const [removed] = updatedFoods.splice(dragIndex, 1);
            updatedFoods.splice(position, 0, removed);

            const reorderedFoods = updatedFoods.map((f, i) => ({
                ...f,
                position: i,
            }));

            setFoods(reorderedFoods);
            setActiveFood(null);
        }

        if (type === 'DRINK') {
            if (activeDrink === null || activeDrink === undefined) return;

            const dragIndex = drinks.findIndex(d => d.product_id === activeDrink.product_id);
            if (dragIndex === -1) return;

            const updatedDrinks = [...drinks];
            const [removed] = updatedDrinks.splice(dragIndex, 1);
            updatedDrinks.splice(position, 0, removed);

            const reorderedDrinks = updatedDrinks.map((d, i) => ({
                ...d,
                position: i,
            }));

            setDrinks(reorderedDrinks);
            setActiveDrink(null);
        }
    }, [activeDrink, activeFood, drinks, foods, setDrinks, setFoods, setActiveDrink, setActiveFood]);

    useEffect(() => {
        utils.getProductSettings.refetch({ id });
    }, [id, utils.getProductSettings]);

    if (isPending || isLoading) {
        return <ProductenFormSkeleton />;
    }

    return (
        <div className='border border-neutral-600 rounded-lg p-4 min-h-full shadow-md col-span-1 md:col-span-2 lg:col-span-1'>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold mb-4">Producten</h2>
                <Button onClick={saveProducts} disabled={isPending}>
                    Opslaan
                </Button>
            </div>
            <div className="mb-2 flex items-center justify-between">
                <p className="w-[calc(100%-4rem)]">Dranken</p>
                <p className="w-32">Prijs</p>
                <span className="w-8">&nbsp;</span>
            </div>
            {drinks
                .sort((a, b) => a.position - b.position)
                .map((drink, index) => (
                    <Fragment key={drink.product_id}>
                        <DropArea onDrop={() => onDrop(index, 'DRINK')} />
                        <motion.div
                            layout
                            initial={{ opacity: 0.8, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0.8, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="flex items-center space-x-4"
                            draggable
                            onDragStart={() => setActiveDrink(drink)}
                            onDragEnd={() => setActiveDrink(null)}
                        >
                            <MenuIcon className="size-6 cursor-grab" />
                            <Input
                                value={drinks[index].product_name}
                                onChange={(e) => updateDrinkName(index, e.target.value)}
                                className="w-[calc(100%-2rem)]"
                            />
                            <Input
                                value={drinks[index].product_price}
                                onChange={(e) => updateDrinkPrice(index, parseFloat(e.target.value))}
                                type="number"
                                className="w-32"
                            />
                            {drinks.length > 1 && <Trash2Icon
                                className="size-6 w-8 text-red-500 cursor-pointer"
                                onClick={() => deleteDrink(index)}
                            />}
                        </motion.div>
                    </Fragment>
                ))}
            <DropArea
                onDrop={() => onDrop(drinks.length, 'DRINK')}
            />

            <div
                className="ml-auto mb-4 w-32 flex items-center justify-end cursor-pointer"
                onClick={addDrink}
            >
                <PlusIcon className="mr-2 size-6 text-emerald-500" />
                Drank
            </div>
            <div className="mb-2 flex items-center justify-between">
                <p className="w-[calc(100%-4rem)]">Snacks</p>
                <p className="w-32">Prijs</p>
                <span className="w-8">&nbsp;</span>
            </div>
            {foods.map((food, index) => (
                <Fragment key={food.product_id}>
                    <DropArea onDrop={() => onDrop(index, 'FOOD')} />
                    <motion.div
                        layout
                        initial={{ opacity: 0.8, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0.8, scale: 0.98 }}
                        className="mb-4 flex items-center space-x-4"
                        draggable
                        onDragStart={() => setActiveFood(food)}
                        onDragEnd={() => setActiveFood(null)}
                    >
                        <MenuIcon className="size-6 cursor-grab" />
                        <Input
                            value={foods[index].product_name}
                            onChange={(e) => updateFoodName(index, e.target.value)}
                            className="w-[calc(100%-2rem)]"
                        />
                        <Input
                            value={foods[index].product_price}
                            onChange={(e) => updateFoodPrice(index, parseFloat(e.target.value))}
                            type="number"
                            className="w-32"
                        />
                        {foods.length > 1 && <Trash2Icon
                            className="size-6 w-8 text-red-500 cursor-pointer"
                            onClick={() => deleteFood(index)}
                        />}
                    </motion.div>
                </Fragment>
            ))}
            <DropArea
                onDrop={() => onDrop(foods.length, 'FOOD')}
            />

            <div
                className="ml-auto w-32 flex items-center justify-end cursor-pointer"
                onClick={addFood}
            >
                <PlusIcon className="mr-2 size-6 text-emerald-500" />
                Snack
            </div>
        </div>
    )
}

export default ProductenForm

const ProductenFormSkeleton = () => {
    return (
        <div className='border border-neutral-600 rounded-lg p-4 min-h-full shadow-md md:col-span-2 lg:col-span-1'>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold mb-4">Producten</h2>
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="mb-2 flex items-center justify-between">
                <p className="w-[calc(100%-4rem)]">Dranken</p>
                <p className="w-32">Prijs</p>
                <span className="w-8">&nbsp;</span>
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="mb-6 flex items-center space-x-4">
                    <MenuIcon className="size-6 cursor-grab animate-pulse" />
                    <Skeleton className="w-[calc(100%-2rem)] h-9" />
                    <Skeleton className="w-32 h-9" />
                    <Skeleton className="w-8 h-6" />
                </div>
            ))}
            <Skeleton className="ml-auto mb-4 w-24 h-6" />
            <div className="mb-2 flex items-center justify-between">
                <p className="w-[calc(100%-4rem)]">Snacks</p>
                <p className="w-32">Prijs</p>
                <span className="w-8">&nbsp;</span>
            </div>
            {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="mb-6 flex items-center space-x-4">
                    <MenuIcon className="size-6 cursor-grab animate-pulse" />
                    <Skeleton className="w-[calc(100%-2rem)] h-9" />
                    <Skeleton className="w-32 h-9" />
                    <Skeleton className="w-8 h-6" />
                </div>
            ))}
            <Skeleton className="ml-auto mb-4 w-24 h-6" />
        </div>
    )
}