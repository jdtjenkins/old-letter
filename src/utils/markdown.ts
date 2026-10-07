import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

const extensions = [gfm()];
const htmlExtensions = [gfmHtml()];

export const renderMarkdown = (source: string): string =>
	micromark(source, { extensions, htmlExtensions });
