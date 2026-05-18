"use client";

import { Eye, Heart, PackageCheck, Plus, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
	formatMoney,
	getProductAvailability,
	getProductDetailPath,
} from "@/lib/commerce";
import type { Currency, Product } from "@/lib/products";

type ProductCardProps = {
	product: Product;
	currency: Currency;
	onAdd?: (product: Product) => void;
};

function availabilityClassName(status: ReturnType<typeof getProductAvailability>["status"]) {
	if (status === "out_of_stock") {
		return "bg-[#fff1ee] text-[#a43b24]";
	}

	if (status === "low_stock") {
		return "bg-[#fff8e6] text-[#8a5a13]";
	}

	return "bg-[#eef6f0] text-[#1d7053]";
}

export function ProductCard({ product, currency, onAdd }: ProductCardProps) {
	const availability = getProductAvailability(product);
	const isUnavailable = availability.status === "out_of_stock";

	return (
		<article className="overflow-hidden rounded-sm border border-[#ded7ca] bg-white shadow-sm">
			<div className="relative aspect-[4/3] overflow-hidden bg-[#e7dfd0]">
				<Link href={getProductDetailPath(product)} aria-label={`View ${product.name}`}>
					<Image
						src={product.image}
						alt={product.name}
						fill
						sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
						className="object-cover transition-transform duration-500 hover:scale-105"
					/>
				</Link>
				<span className="absolute left-3 top-3 rounded-sm bg-white px-3 py-1 text-xs font-bold text-[#17221b] shadow-sm">
					{product.badge}
				</span>
				<button
					type="button"
					className="absolute right-3 top-3 grid size-9 place-items-center rounded-sm bg-white text-[#17221b] shadow-sm hover:bg-[#f3c969]"
					aria-label={`Save ${product.name}`}
				>
					<Heart className="size-4" />
				</button>
			</div>
			<div className="p-4">
				<div className="mb-3 flex items-center justify-between gap-3">
					<span className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d7053]">
						{product.category}
					</span>
					<span className="inline-flex items-center gap-1 text-sm font-semibold text-[#8a5a13]">
						<Star className="size-4 fill-[#f3c969] text-[#f3c969]" />
						{product.rating}
					</span>
				</div>
				<Link
					href={getProductDetailPath(product)}
					className="text-lg font-semibold text-[#17221b] hover:text-[#1d7053]"
				>
					{product.name}
				</Link>
				<p className="mt-2 min-h-12 text-sm leading-6 text-[#5d6b62]">
					{product.description}
				</p>
				<div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5d6b62]">
					<span className="inline-flex items-center gap-1">
						<PackageCheck className="size-4 text-[#1d7053]" />
						{product.origin}
					</span>
					<span className="text-[#b0a797]">/</span>
					<span>{product.shipsIn}</span>
				</div>
				<div
					className={`mt-3 inline-flex h-7 items-center rounded-sm px-2 text-xs font-bold ${availabilityClassName(
						availability.status,
					)}`}
				>
					{availability.label}
				</div>
				<div className="mt-5 flex items-end justify-between gap-3">
					<div>
						<div className="text-2xl font-bold text-[#17221b]">
							{formatMoney(product.price, currency)}
						</div>
						{product.compareAt && (
							<div className="text-sm font-medium text-[#8f988f] line-through">
								{formatMoney(product.compareAt, currency)}
							</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Link
							href={getProductDetailPath(product)}
							className="grid size-11 place-items-center rounded-sm border border-[#ded7ca] text-[#17221b] hover:border-[#1d7053] hover:text-[#1d7053]"
							aria-label={`View details for ${product.name}`}
						>
							<Eye className="size-4" />
						</Link>
						<button
							type="button"
							onClick={() => onAdd?.(product)}
							disabled={isUnavailable}
							className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053] disabled:cursor-not-allowed disabled:bg-[#b0a797]"
						>
							<Plus className="size-4" />
							Add
						</button>
					</div>
				</div>
			</div>
		</article>
	);
}
