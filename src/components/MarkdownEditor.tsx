import { Editor, Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createEffect, onCleanup, onMount, untrack } from "solid-js";

type MarkdownEditorProps = {
	initialValue: string;
	resetKey: number;
	onChange: (value: string) => void;
};

const RevealHeadingMarkdown = Extension.create({
	name: "revealHeadingMarkdown",
	priority: 1000,
	addKeyboardShortcuts() {
		return {
			Backspace: () => {
				const { selection, schema, tr } = this.editor.state;
				const { $from, empty } = selection;
				if (!empty || $from.parentOffset !== 0 || $from.parent.type.name !== "heading") return false;

				const prefix = `${"#".repeat($from.parent.attrs.level as number)} `;
				const start = $from.before();
				tr.setNodeMarkup(start, schema.nodes.paragraph);
				tr.insertText(prefix, start + 1);
				this.editor.view.dispatch(tr);
				this.editor.commands.setTextSelection(start + 1 + prefix.length);
				return true;
			},
		};
	},
});

export function MarkdownEditor(props: MarkdownEditorProps) {
	let host: HTMLDivElement | undefined;
	let editor: Editor | undefined;

	onMount(() => {
		if (!host) return;
		editor = new Editor({
			element: host,
			editorProps: { attributes: { "aria-label": "Letter text" } },
			extensions: [
				StarterKit,
				Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
				Table,
				TableRow,
				TableHeader,
				TableCell,
				Image,
				TaskList,
				TaskItem.configure({ nested: true }),
				RevealHeadingMarkdown,
			],
			content: props.initialValue,
			contentType: "markdown",
			onUpdate: ({ editor }) => props.onChange(editor.getMarkdown()),
		});
	});

	createEffect(() => {
		void props.resetKey;
		const value = untrack(() => props.initialValue);
		if (editor) {
			editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
			requestAnimationFrame(() => editor?.commands.focus("end"));
		}
	});

	onCleanup(() => editor?.destroy());

	return (
		<div class="overflow-hidden rounded border border-[#8b6842]/50 bg-[#f4e6c9]/35 shadow-[0_3px_12px_rgba(67,41,25,0.05)]">
			<div ref={element => { host = element; }} class="letter-markdown letter-rich-editor min-h-[60vh] p-5" aria-label="Letter text" />
		</div>
	);
}
