import { renderMarkdown } from "../utils/markdown";

type MarkdownViewProps = {
	source: string;
	class?: string;
};

export function MarkdownView(props: MarkdownViewProps) {
	return <div class={`letter-markdown ${props.class ?? ""}`} innerHTML={renderMarkdown(props.source)} />;
}
