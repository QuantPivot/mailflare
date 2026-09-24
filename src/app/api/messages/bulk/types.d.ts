export type BulkMessageAction = "archive" | "trash" | "delete" | "spam" | "read" | "unread" | "inbox" | "folder";

export type BulkMessagePayload = {
	messageIds?: string[];
	action?: BulkMessageAction;
	folderId?: string;
};
