import { createSignal, onCleanup, onMount, untrack, For, Show } from "solid-js";
import { ImportDialog } from "./ImportDialog";
import { LetterNav } from "./LetterNav";
import { ShareDialog } from "./ShareDialog";
import { clearLetterFromUrl, getLetterLinesFromUrl, setLetterLinesInUrl, shareUrlForLines } from "../utils/letterUrl";

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export function Letter() {
	const [lines, setLines] = createSignal<string[]>([""]);
	const [editMode, setEditMode] = createSignal(false);
	const [importedBody, setImportedBody] = createSignal<string | null>(null);
	const [shareSnapshot, setShareSnapshot] = createSignal<{ body: string; url: string } | null>(null);
	const [importOpen, setImportOpen] = createSignal(false);
	let editor: HTMLDivElement | undefined;
	let typingRun = 0;
	let removeSkipListener: (() => void) | undefined;

	const currentLetterLines = () => importedBody() === null ? getLetterLinesFromUrl() : importedBody()!.split("\n");

	const stopTyping = () => {
		typingRun++;
		removeSkipListener?.();
		removeSkipListener = undefined;
	};

	const startTyping = async () => {
		stopTyping();
		const run = typingRun;
		const sourceLines = currentLetterLines();
		setLines([""]);

		for (const [index, line] of sourceLines.entries()) {
			if (run !== typingRun) return;
			let skipLine = false;

			if (line === "") {
				setLines(previous => {
					const next = [...previous];
					next[index] = "";
					return next;
				});
				await wait(50);
				if (run !== typingRun) return;
				continue;
			}

			const skipToEnd = () => {
				setLines(previous => {
					const next = [...previous];
					next[index] = line;
					return next;
				});
				skipLine = true;
				removeSkipListener?.();
				removeSkipListener = undefined;
			};

			const onClick = (event: MouseEvent) => {
				if (editMode() || (event.target as Element).closest("header, dialog")) return;
				skipToEnd();
			};
			document.addEventListener("click", onClick);
			removeSkipListener = () => document.removeEventListener("click", onClick);

			for (const character of line) {
				if (run !== typingRun) return;
				if (skipLine) break;
				setLines(previous => {
					const next = [...previous];
					next[index] = `${next[index] || ""}${character}`;
					return next;
				});
				await wait(50);
			}
			removeSkipListener?.();
			removeSkipListener = undefined;
		}
	};

	const focusEditor = () => requestAnimationFrame(() => editor?.focus());

	const toggleEditMode = () => {
		if (editMode()) {
			setEditMode(false);
			startTyping();
		} else {
			stopTyping();
			setEditMode(true);
			focusEditor();
		}
	};

	const newLetter = () => {
		setImportedBody(null);
		setLetterLinesInUrl([""]);
		stopTyping();
		setLines([""]);
		if (editMode() && editor) editor.textContent = "";
		else setEditMode(true);
		focusEditor();
	};

	const importLetter = (body: string) => {
		clearLetterFromUrl();
		setImportedBody(body);
		setEditMode(false);
		startTyping();
	};

	const openShareDialog = () => {
		const letterLines = currentLetterLines();
		setShareSnapshot({ body: letterLines.join("\n"), url: shareUrlForLines(letterLines) });
	};

	onMount(() => { startTyping(); });
	onCleanup(stopTyping);

	return (
		<div class="letter-page">
			<LetterNav editing={editMode()} onEdit={toggleEditMode} onNew={newLetter} onImport={() => setImportOpen(true)} onShare={openShareDialog} />
			<main class="letter-content font-main">
				<Show when={!editMode()}>
					<For each={lines()}>{line => <p class="block min-h-8">{line}</p>}</For>
				</Show>
				<Show when={editMode()}>
					<div
						ref={element => { editor = element; }}
						class="letter-editor"
						contentEditable
						role="textbox"
						aria-label="Letter text"
						aria-multiline="true"
						data-placeholder="Write your letter here…"
						onInput={event => {
							const text = event.currentTarget.innerText;
							if (importedBody() === null) setLetterLinesInUrl(text.split("\n"));
							else setImportedBody(text);
						}}
					>{untrack(() => currentLetterLines().join("\n"))}</div>
				</Show>
			</main>
			<ShareDialog open={shareSnapshot() !== null} body={shareSnapshot()?.body ?? ""} url={shareSnapshot()?.url ?? ""} onClose={() => setShareSnapshot(null)} />
			<ImportDialog open={importOpen()} onClose={() => setImportOpen(false)} onImport={importLetter} />
		</div>
	);
}
