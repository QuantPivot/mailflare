import { Skeleton } from "@/components/ui/skeleton";

export default function DomainDnsSkeleton() {
	return (
		<div className="space-y-3 border-t border-neutral-100 pt-5">
			<Skeleton className="h-4 w-28" />
			<div className="space-y-2">
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton key={index} className="h-9 w-full rounded-xl" />
				))}
			</div>
		</div>
	);
}
