export type PermanentDeleteResult = {
	status: number;
	ok: boolean;
	deletedIds: string[];
	failedIds?: string[];
	error?: string;
};
