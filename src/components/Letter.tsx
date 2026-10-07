import { createSignal, lazy, onCleanup, onMount, Show, Suspense } from "solid-js";
import { ImportDialog } from "./ImportDialog";
import { LetterNav } from "./LetterNav";
import { MarkdownView } from "./MarkdownView";
import { NewLetterDialog } from "./NewLetterDialog";
import { ShareDialog } from "./ShareDialog";
import { clearLetterFromUrl, getLetterLinesFromUrl, setLetterLinesInUrl, shareUrlForLines } from "../utils/letterUrl";

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const MarkdownEditor = lazy(() => import("./MarkdownEditor").then(module => ({ default: module.MarkdownEditor })));

export function Letter() {
	const [lines, setLines] = createSignal<string[]>([""]);
	const [editMode, setEditMode] = createSignal(false);
	const [importedBody, setImportedBody] = createSignal<string | null>(null);
	const [shareSnapshot, setShareSnapshot] = createSignal<{ body: string; url: string } | null>(null);
	const [importOpen, setImportOpen] = createSignal(false);
	const [newLetterConfirmOpen, setNewLetterConfirmOpen] = createSignal(false);
	const [editorReset, setEditorReset] = createSignal(0);
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

	const toggleEditMode = () => {
		if (editMode()) {
			setEditMode(false);
			startTyping();
		} else {
			stopTyping();
			setEditMode(true);
		}
	};

	const newLetter = () => {
		setImportedBody(null);
		setLetterLinesInUrl([""]);
		stopTyping();
		setLines([""]);
		setEditorReset(value => value + 1);
		setEditMode(true);
	};

	const requestNewLetter = () => {
		if (currentLetterLines().join("\n").trim()) setNewLetterConfirmOpen(true);
		else newLetter();
	};

	const confirmNewLetter = () => {
		setNewLetterConfirmOpen(false);
		newLetter();
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
			<LetterNav editing={editMode()} onEdit={toggleEditMode} onNew={requestNewLetter} onImport={() => setImportOpen(true)} onShare={openShareDialog} />
			<main class="letter-content font-main">
				<Show when={!editMode()}>
					<MarkdownView source={lines().join("\n")} />
				</Show>
				<Show when={editMode()}>
					<Suspense fallback={<p class="text-base">Preparing editor…</p>}>
						<MarkdownEditor
							initialValue={currentLetterLines().join("\n")}
							resetKey={editorReset()}
							onChange={value => {
								if (importedBody() === null) setLetterLinesInUrl(value.split("\n"));
								else setImportedBody(value);
							}}
						/>
					</Suspense>
				</Show>
			</main>
			<ShareDialog open={shareSnapshot() !== null} body={shareSnapshot()?.body ?? ""} url={shareSnapshot()?.url ?? ""} onClose={() => setShareSnapshot(null)} />
			<ImportDialog open={importOpen()} onClose={() => setImportOpen(false)} onImport={importLetter} />
			<NewLetterDialog open={newLetterConfirmOpen()} onClose={() => setNewLetterConfirmOpen(false)} onConfirm={confirmNewLetter} />
		</div>
	);
}
