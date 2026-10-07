import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";

const LINE_SEPARATOR = "§";
const LETTER_FRAGMENT = "#letter=v1.";

const toBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array => {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid letter link");
	const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
	return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const letterUrl = (lines: string[]): URL => {
	const url = new URL(window.location.href);
	const body = lines.join("\n");
	url.searchParams.delete("text");
	url.hash = body
		? `${LETTER_FRAGMENT.slice(1)}${toBase64Url(deflateSync(strToU8(body)))}`
		: "";
	return url;
};

export const getLetterLinesFromUrl = (): string[] => {
	if (window.location.hash.startsWith(LETTER_FRAGMENT)) {
		try {
			const compressed = window.location.hash.slice(LETTER_FRAGMENT.length);
			return strFromU8(inflateSync(fromBase64Url(compressed))).split("\n");
		} catch {
			// A damaged fragment can still have a valid legacy ?text= value.
		}
	}
	const text = new URLSearchParams(window.location.search).get("text") || "";
	return text.split(LINE_SEPARATOR);
};

export const setLetterLinesInUrl = (lines: string[]): void => {
	window.history.replaceState({}, "", letterUrl(lines));
};

export const clearLetterFromUrl = (): void => {
	const url = new URL(window.location.href);
	url.searchParams.delete("text");
	if (url.hash.startsWith(LETTER_FRAGMENT)) url.hash = "";
	window.history.replaceState({}, "", url);
};

export const shareUrlForLines = (lines: string[]): string => letterUrl(lines).toString();
