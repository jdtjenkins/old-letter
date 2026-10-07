const LINE_SEPARATOR = "§";

export const getLetterLinesFromUrl = (): string[] => {
	const text = new URLSearchParams(window.location.search).get("text") || "";
	return text.split(LINE_SEPARATOR);
};

export const setLetterLinesInUrl = (lines: string[]): void => {
	const url = new URL(window.location.href);
	url.searchParams.set("text", lines.join(LINE_SEPARATOR));
	window.history.replaceState({}, "", url);
};

export const clearLetterFromUrl = (): void => {
	const url = new URL(window.location.href);
	url.searchParams.delete("text");
	window.history.replaceState({}, "", url);
};

export const shareUrlForLines = (lines: string[]): string => {
	const url = new URL(window.location.href);
	url.searchParams.set("text", lines.join(LINE_SEPARATOR));
	return url.toString();
};
