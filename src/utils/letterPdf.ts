import { marked, type Token, type Tokens } from "marked";
import type { Content, ContentText, TDocumentDefinitions } from "pdfmake/interfaces";

const ink = "#3d2c20";
const mutedInk = "#684a35";
const accent = "#a57b4c";
const pageWidth = 483;
const pdfFont = "IMFellEnglish";
const pdfFontFiles = {
	normal: "IMFeENrm28P.ttf",
	italic: "IMFeENit28P.ttf",
} as const;

const loadPdfFonts = async (): Promise<Record<string, string>> => {
	const entries = await Promise.all(Object.values(pdfFontFiles).map(async filename => {
		const response = await fetch(`/fonts/${filename}`);
		if (!response.ok) throw new Error(`Could not load PDF font: ${filename}`);
		const bytes = new Uint8Array(await response.arrayBuffer());
		let binary = "";
		for (let offset = 0; offset < bytes.length; offset += 8192) {
			binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
		}
		return [filename, btoa(binary)] as const;
	}));
	return Object.fromEntries(entries);
};

const decodeEntities = (value: string): string => {
	const textarea = document.createElement("textarea");
	textarea.innerHTML = value;
	return textarea.value;
};

const safeLink = (href: string): string | undefined => {
	try {
		const url = new URL(href, window.location.href);
		return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
	} catch {
		return undefined;
	}
};

type InlineStyle = Pick<Partial<ContentText>, "bold" | "italics" | "decoration" | "color" | "link" | "background" | "fontSize">;

const inlineContent = (tokens: Token[], style: InlineStyle = {}): Content[] => tokens.flatMap((token): Content[] => {
	switch (token.type) {
		case "text":
			return token.tokens?.length ? inlineContent(token.tokens, style) : [{ text: decodeEntities(token.text), ...style }];
		case "escape":
			return [{ text: decodeEntities(token.text), ...style }];
		case "strong":
			return inlineContent(token.tokens ?? [], { ...style, bold: true });
		case "em":
			return inlineContent(token.tokens ?? [], { ...style, italics: true });
		case "del":
			return inlineContent(token.tokens ?? [], { ...style, decoration: "lineThrough" });
		case "codespan":
			return [{ text: decodeEntities(token.text), ...style, background: "#eadfc9", fontSize: 10 }];
		case "link": {
			const link = safeLink(token.href);
			return inlineContent(token.tokens ?? [], { ...style, color: "#74452f", decoration: "underline", ...(link ? { link } : {}) });
		}
		case "image":
			return [{ text: decodeEntities(token.text || token.href), ...style, italics: true }];
		case "br":
			return [{ text: "\n", ...style }];
		case "html":
			return [{ text: decodeEntities(token.text), ...style }];
		default:
			return "text" in token && typeof token.text === "string" ? [{ text: decodeEntities(token.text), ...style }] : [];
	}
});

const imageContent = (token: Tokens.Image, images: Map<string, string>): Content => {
	const image = images.get(token.href);
	if (image) return { image, fit: [pageWidth, 600], margin: [0, 2, 0, 12] };
	const link = safeLink(token.href);
	return { text: `Image: ${decodeEntities(token.text || token.href)}`, italics: true, color: mutedInk, margin: [0, 0, 0, 10], ...(link ? { link } : {}) };
};

const paragraphContent = (tokens: Token[], images: Map<string, string>): Content[] => {
	const result: Content[] = [];
	let pending: Token[] = [];
	const flush = () => {
		if (pending.length) result.push({ text: inlineContent(pending), margin: [0, 0, 0, 10], lineHeight: 1.35 });
		pending = [];
	};
	for (const token of tokens) {
		if (token.type === "image") {
			flush();
			result.push(imageContent(token as Tokens.Image, images));
		} else pending.push(token);
	}
	flush();
	return result;
};

const blockContent = (tokens: Token[], images: Map<string, string>): Content[] => tokens.flatMap((token): Content[] => {
	switch (token.type) {
		case "heading":
			return [{ text: inlineContent(token.tokens ?? []), fontSize: Math.max(12, 22 - (token.depth - 1) * 2), bold: true, color: ink, margin: [0, 14, 0, 7], lineHeight: 1.15 }];
		case "paragraph":
			return paragraphContent(token.tokens ?? [], images);
		case "text":
			return paragraphContent(token.tokens?.length ? token.tokens : [token], images);
		case "blockquote":
			return [{ stack: blockContent(token.tokens ?? [], images), margin: [14, 5, 0, 12], color: mutedInk, italics: true }];
		case "code":
			return [{ table: { widths: ["*"], body: [[{ text: token.text, fontSize: 9, color: "#f5e6c8", fillColor: "#3d3029", margin: [8, 6, 8, 6], lineHeight: 1.2 }]] }, layout: "noBorders", margin: [0, 3, 0, 12] }];
		case "list": {
			const list = token as Tokens.List;
			const items = list.items.map(item => {
				const contents = blockContent(item.tokens.filter(child => child.type !== "checkbox"), images);
				if (item.task) {
					const checkbox = item.checked ? "[x] " : "[ ] ";
					const first = contents[0];
					if (first && typeof first === "object" && "text" in first) {
						const textBlock = first as ContentText;
						contents[0] = { ...textBlock, text: [checkbox, textBlock.text] };
					}
					else contents.unshift({ text: checkbox });
				}
				return contents.length === 1 ? contents[0] : { stack: contents };
			});
			return [{ ...(list.ordered ? { ol: items, start: typeof list.start === "number" ? list.start : 1 } : { ul: items, type: list.items.every(item => item.task) ? "none" as const : "disc" as const }), margin: [0, 0, 0, 10] }];
		}
		case "table": {
			const table = token as Tokens.Table;
			const cell = (value: Tokens.TableCell): Content => ({ text: inlineContent(value.tokens), bold: value.header, alignment: value.align ?? "left", fillColor: value.header ? "#eadfc9" : undefined, margin: [3, 4, 3, 4] });
			return [{ table: { headerRows: 1, widths: table.header.map(() => "*"), body: [table.header.map(cell), ...table.rows.map(row => row.map(cell))] }, layout: "lightHorizontalLines", fontSize: 10, margin: [0, 3, 0, 12] }];
		}
		case "hr":
			return [{ canvas: [{ type: "line", x1: 0, y1: 0, x2: pageWidth, y2: 0, lineWidth: 0.8, lineColor: accent }], margin: [0, 8, 0, 16] }];
		case "html":
			return [{ text: decodeEntities(token.text), margin: [0, 0, 0, 10] }];
		default:
			return [];
	}
});

const imageTokens = (tokens: Token[]): Tokens.Image[] => tokens.flatMap((token): Tokens.Image[] => {
	if (token.type === "image") return [token as Tokens.Image];
	if (token.type === "list") return (token as Tokens.List).items.flatMap(item => imageTokens(item.tokens));
	if (token.type === "table") {
		const table = token as Tokens.Table;
		return [...table.header, ...table.rows.flat()].flatMap(cell => imageTokens(cell.tokens));
	}
	return "tokens" in token && Array.isArray(token.tokens) ? imageTokens(token.tokens) : [];
});

const loadImage = async (href: string): Promise<string | undefined> => {
	const url = safeLink(href);
	if (!url || !/^https?:/.test(url)) return undefined;
	try {
		const response = await fetch(url, { credentials: "omit" });
		if (!response.ok) return undefined;
		const blob = await response.blob();
		if (!["image/png", "image/jpeg"].includes(blob.type) || blob.size > 10_000_000) return undefined;
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(blob);
		});
	} catch {
		return undefined;
	}
};

export const createLetterPdfDefinition = (source: string, images = new Map<string, string>()): TDocumentDefinitions => {
	const tokens = marked.lexer(source, { gfm: true, breaks: true });
	return {
		pageSize: "A4",
		pageMargins: [56, 58, 56, 58],
		background: { canvas: [{ type: "rect", x: 0, y: 0, w: 595.28, h: 841.89, color: "#f9f0dc" }] },
		content: blockContent(tokens, images),
		defaultStyle: { font: pdfFont, fontSize: 14, color: ink, lineHeight: 1.5 },
		info: { title: "Letter" },
	};
};

export const downloadLetterPdf = async (source: string): Promise<{ omittedImages: number }> => {
	const tokens = marked.lexer(source, { gfm: true, breaks: true });
	const referencedImages = imageTokens(tokens);
	const urls = [...new Set(referencedImages.map(token => token.href))];
	const loaded = await Promise.all(urls.map(async href => [href, await loadImage(href)] as const));
	const images = new Map(loaded.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
	const [{ default: pdfMake }, fontVfs] = await Promise.all([
		import("pdfmake/build/pdfmake"),
		loadPdfFonts(),
	]);
	const fonts = {
		[pdfFont]: {
			normal: pdfFontFiles.normal,
			bold: pdfFontFiles.normal,
			italics: pdfFontFiles.italic,
			bolditalics: pdfFontFiles.italic,
		},
	};
	const pdf = pdfMake.createPdf(createLetterPdfDefinition(source, images), undefined, fonts, fontVfs);
	const blob = await new Promise<Blob>(resolve => pdf.getBlob(resolve));
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = "letter.pdf";
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
	return { omittedImages: referencedImages.filter(token => !images.has(token.href)).length };
};
