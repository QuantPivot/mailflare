export const PASSWORD_CHANGE_PATH = "/change-password";
export const PASSWORD_CHANGE_HEADER = "X-Mailflare-Password-Change-Required";

export function passwordChangeRequiredResponse(): Response {
	return Response.json({
		error: "Change your password before continuing",
		code: "PASSWORD_CHANGE_REQUIRED",
		redirect: PASSWORD_CHANGE_PATH,
	}, {
		status: 403,
		headers: { [PASSWORD_CHANGE_HEADER]: "true", "Cache-Control": "no-store" },
	});
}
