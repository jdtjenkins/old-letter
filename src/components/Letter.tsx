import { createSignal, onCleanup, onMount, untrack, For, Show } from "solid-js";
import { decryptLetter, encryptLetter, isEncryptedLetter } from "../utils/crypto";

const createTimer = (time: number) => new Promise(resolve => setTimeout(resolve, time));
const getTextFromUrl = () => {
	const urlParams = new URLSearchParams(window.location.search);
	const textParam = urlParams.get("text") || "";
	return textParam.split("§");
}

const navButtonClasses = "inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] whitespace-nowrap rounded-[3px] border px-[11px] py-2 font-[family-name:var(--font-cinzel)] text-[10px] font-semibold tracking-[0.09em] uppercase transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#8b5d36] active:translate-y-px sm:px-[17px] sm:py-[9px] sm:text-xs";

export function Letter() {
	const [lines, setLines] = createSignal<string[]>([""]);
	const [editMode, setEditMode] = createSignal(false);
	const [menuOpen, setMenuOpen] = createSignal(false);
	const [importedBody, setImportedBody] = createSignal<string | null>(null);
	const [shareUrl, setShareUrl] = createSignal("");
	const [sharePassword, setSharePassword] = createSignal("");
	const [encryptedBody, setEncryptedBody] = createSignal("");
	const [encrypting, setEncrypting] = createSignal(false);
	const [shareError, setShareError] = createSignal("");
	const [copied, setCopied] = createSignal(false);
	const [encryptedCopied, setEncryptedCopied] = createSignal(false);
	const [importText, setImportText] = createSignal("");
	const [importStage, setImportStage] = createSignal<"paste" | "password">("paste");
	const [importPassword, setImportPassword] = createSignal("");
	const [importError, setImportError] = createSignal("");
	const [unlocking, setUnlocking] = createSignal(false);
	let typingRun = 0;
	let removeSkipListener: (() => void) | undefined;
	let menuContainer: HTMLDivElement | undefined;
	let menuTrigger: HTMLButtonElement | undefined;
	let shareDialog: HTMLDialogElement | undefined;
	let importDialog: HTMLDialogElement | undefined;
	let encryptionTimer: ReturnType<typeof setTimeout> | undefined;
	let encryptionRun = 0;
	let importRun = 0;

	const stopTyping = () => {
		typingRun++;
		removeSkipListener?.();
		removeSkipListener = undefined;
	};

	const updateQueryParam = (newLines: string[]) => {
		const url = new URL(window.location.href);
		url.searchParams.set("text", newLines.join("§"));
		window.history.replaceState({}, "", url);
	};

	const currentLetterLines = () => importedBody() === null ? getTextFromUrl() : importedBody()!.split("\n");

	const startTyping = async () => {
		stopTyping();
		const run = typingRun;

		const initialLines = currentLetterLines();

		setLines([""])

		for (const [index, line] of initialLines.entries()) {
			if (run !== typingRun) return;
			let skipToNextLine = false;

			if (line === "") {
				setLines(prev => {
					const newArr = [...prev];
					newArr[index] = ""
					
					return newArr
				})

				await createTimer(50);
				if (run !== typingRun) return;

				continue
			}

			const fastForward = () => {
				setLines(prev => {
					const newArr = [...prev]
					newArr[index] = initialLines[index]
					
					return newArr
				})

				skipToNextLine = true
				removeSkipListener?.();
				removeSkipListener = undefined;
			}

			const next = (event: MouseEvent) => {
				if (editMode() || (event.target as Element).closest("header, dialog")) return;

				fastForward();
			};

			document.addEventListener("click", next);
			removeSkipListener = () => document.removeEventListener("click", next);

			for (const char of line) {
				if (run !== typingRun) return;
				if (skipToNextLine) break

				setLines(prev => {
					const newArr = [...prev];
					newArr[index] = `${newArr[index] || ""}${char}`
					
					return newArr
				})

				await createTimer(50)
			}
			removeSkipListener?.();
			removeSkipListener = undefined;
		}
	};

	const toggleEditMode = () => {
		setMenuOpen(false);
		if (editMode()) {
			setEditMode(false);
			startTyping();
			return;
		}

		stopTyping();
		setEditMode(true);
		requestAnimationFrame(() => document.querySelector<HTMLElement>(".letter-editor")?.focus());
	};

	const newLetter = () => {
		setMenuOpen(false);
		setImportedBody(null);
		updateQueryParam([""]);
		stopTyping();
		setLines([""]);
		if (editMode()) {
			const editor = document.querySelector<HTMLElement>(".letter-editor");
			if (editor) editor.textContent = "";
			editor?.focus();
		} else {
			setEditMode(true);
			requestAnimationFrame(() => document.querySelector<HTMLElement>(".letter-editor")?.focus());
		}
	};

	const openShareDialog = () => {
		setMenuOpen(false);
		const url = new URL(window.location.href);
		url.searchParams.set("text", currentLetterLines().join("§"));
		setShareUrl(url.toString());
		setSharePassword("");
		setEncryptedBody("");
		setEncrypting(false);
		setShareError("");
		setCopied(false);
		setEncryptedCopied(false);
		shareDialog?.showModal();
	};

	const updateSharePassword = (value: string) => {
		clearTimeout(encryptionTimer);
		const run = ++encryptionRun;
		setSharePassword(value);
		setEncryptedBody("");
		setShareError("");
		setCopied(false);
		setEncryptedCopied(false);
		setEncrypting(Boolean(value));
		if (!value) return;

		encryptionTimer = setTimeout(async () => {
			try {
				const encrypted = await encryptLetter(currentLetterLines().join("\n"), value);
				if (run === encryptionRun) {
					setEncryptedBody(encrypted);
					setEncrypting(false);
				}
			} catch {
				if (run === encryptionRun) {
					setShareError("Could not encrypt this letter. Please try again in a secure browser context.");
					setEncrypting(false);
				}
			}
		}, 250);
	};

	const copyShareUrl = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl());
			setCopied(true);
			setShareError("");
		} catch {
			setShareError("Could not copy the link. Select the URL and copy it manually.");
		}
	};

	const copyEncryptedBody = async () => {
		try {
			await navigator.clipboard.writeText(encryptedBody());
			setEncryptedCopied(true);
			setShareError("");
		} catch {
			setShareError("Could not copy the encrypted text. Select it and copy it manually.");
		}
	};

	const openImportDialog = () => {
		setMenuOpen(false);
		setImportText("");
		setImportStage("paste");
		setImportPassword("");
		setImportError("");
		setUnlocking(false);
		importDialog?.showModal();
		requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("#import-text")?.focus());
	};

	const continueImport = () => {
		if (!isEncryptedLetter(importText().trim())) {
			setImportError("Paste encrypted letter text created by this app.");
			return;
		}
		setImportError("");
		setImportStage("password");
		requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#import-password")?.focus());
	};

	const unlockImportedLetter = async () => {
		if (!importPassword()) {
			setImportError("Enter the password for this letter.");
			return;
		}
		const run = ++importRun;
		setUnlocking(true);
		setImportError("");
		try {
			const plaintext = await decryptLetter(importText().trim(), importPassword());
			if (run !== importRun) return;
			const url = new URL(window.location.href);
			url.searchParams.delete("text");
			window.history.replaceState({}, "", url);
			setImportedBody(plaintext);
			setEditMode(false);
			importDialog?.close();
			startTyping();
		} catch {
			if (run === importRun) setImportError("Incorrect password or damaged encrypted letter text.");
		} finally {
			if (run === importRun) setUnlocking(false);
		}
	};

	onMount(() => {
		startTyping();
		const closeOnOutsideClick = (event: PointerEvent) => {
			if (menuOpen() && !menuContainer?.contains(event.target as Node)) setMenuOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && menuOpen()) {
				setMenuOpen(false);
				menuTrigger?.focus();
			}
		};
		document.addEventListener("pointerdown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		onCleanup(() => {
			document.removeEventListener("pointerdown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
			stopTyping();
			clearTimeout(encryptionTimer);
			encryptionRun++;
			importRun++;
		});
	});

	return (
		<div class="letter-page">
			<header class="relative z-10 shrink-0 border-b border-[rgba(100,70,42,0.24)] bg-[rgba(247,235,207,0.54)] shadow-[0_2px_12px_rgba(93,61,32,0.05)]">
				<div class="mx-auto flex min-h-[66px] w-full max-w-[1120px] items-center justify-end gap-2 px-4 sm:min-h-[76px] sm:gap-5 sm:px-6">
					<div class="relative sm:hidden" ref={element => { menuContainer = element; }}>
						<button
							ref={element => { menuTrigger = element; }}
							class="inline-flex min-h-11 items-center gap-2.5 rounded-[3px] border border-[#8b6842] bg-[#f4e6c9]/65 px-3.5 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.09em] text-[#513528] uppercase shadow-[inset_0_0_0_2px_rgba(255,251,238,0.3)] transition-colors hover:bg-[#f4e6c9] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#8b5d36]"
							type="button"
							aria-expanded={menuOpen()}
							aria-controls="letter-mobile-actions"
							onClick={() => setMenuOpen(open => !open)}
						>
							<svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
								<path d="M4 7h16M4 12h16M4 17h16" />
							</svg>
							<span>Menu</span>
							<svg class={`h-3 w-3 transition-transform ${menuOpen() ? "rotate-180" : ""}`} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="m6 9 6 6 6-6" />
							</svg>
						</button>
						<Show when={menuOpen()}>
							<div id="letter-mobile-actions" class="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-[#8b6842]/65 bg-[#f6e8ca] p-1.5 shadow-[0_12px_28px_rgba(67,41,25,0.2)]" role="group" aria-label="Letter actions">
								<button class="flex min-h-12 w-full items-center gap-3 rounded px-3 text-left font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase transition-colors hover:bg-[#e9d4aa] focus-visible:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" onClick={toggleEditMode}>
									<svg class="h-4 w-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<Show when={editMode()} fallback={<><path d="M12 19h8" /><path d="M16.5 4.5a2.12 2.12 0 0 1 3 3L9 18l-4 1 1-4z" /></>}>
											<path d="M4 6.5c2.8-1.2 5.4-1.2 8 0v12c-2.6-1.2-5.2-1.2-8 0z" />
											<path d="M20 6.5c-2.8-1.2-5.4-1.2-8 0v12c2.6-1.2 5.2-1.2 8 0z" />
										</Show>
									</svg>
									<span>{editMode() ? "View letter" : "Edit letter"}</span>
								</button>
								<div class="mx-3 border-t border-[#8b6842]/20" aria-hidden="true" />
								<button class="flex min-h-12 w-full items-center gap-3 rounded px-3 text-left font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase transition-colors hover:bg-[#e9d4aa] focus-visible:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" onClick={newLetter}>
									<svg class="h-4 w-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<path d="M12 5v14" /><path d="M5 12h14" />
									</svg>
									<span>New letter</span>
								</button>
								<div class="mx-3 border-t border-[#8b6842]/20" aria-hidden="true" />
								<button class="flex min-h-12 w-full items-center gap-3 rounded px-3 text-left font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase transition-colors hover:bg-[#e9d4aa] focus-visible:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" onClick={openImportDialog}>
									<svg class="h-4 w-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<path d="M12 3v12m-5-5 5 5 5-5M5 18v2h14v-2" />
									</svg>
									<span>Import</span>
								</button>
								<div class="mx-3 border-t border-[#8b6842]/20" aria-hidden="true" />
								<button class="flex min-h-12 w-full items-center gap-3 rounded px-3 text-left font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase transition-colors hover:bg-[#e9d4aa] focus-visible:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" onClick={openShareDialog}>
									<svg class="h-4 w-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
									</svg>
									<span>Share</span>
								</button>
							</div>
						</Show>
					</div>
					<div class="hidden items-center gap-5 sm:flex">
					<button class={`${navButtonClasses} border-[#8b6842] bg-[#f4e6c9]/65 text-[#513528] shadow-[inset_0_0_0_2px_rgba(255,251,238,0.3)] hover:bg-[#f4e6c9]`} type="button" aria-pressed={editMode()} onClick={toggleEditMode}>
						<svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<Show when={editMode()} fallback={<><path d="M12 19h8" /><path d="M16.5 4.5a2.12 2.12 0 0 1 3 3L9 18l-4 1 1-4z" /></>}>
								<path d="M4 6.5c2.8-1.2 5.4-1.2 8 0v12c-2.6-1.2-5.2-1.2-8 0z" />
								<path d="M20 6.5c-2.8-1.2-5.4-1.2-8 0v12c2.6-1.2 5.2-1.2 8 0z" />
							</Show>
						</svg>
						<span>{editMode() ? "View letter" : "Edit letter"}</span>
					</button>
					<button class={`${navButtonClasses} border-[#8b6842] bg-[#513528] text-[#f8e9c9] shadow-[inset_0_0_0_2px_rgba(241,216,170,0.15),0_2px_5px_rgba(67,41,25,0.1)] hover:bg-[#694534] hover:shadow-[inset_0_0_0_2px_rgba(241,216,170,0.2),0_3px_8px_rgba(67,41,25,0.15)]`} type="button" onClick={newLetter}>
						<svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 5v14" /><path d="M5 12h14" />
						</svg>
						<span>New letter</span>
					</button>
					<button class={`${navButtonClasses} border-[#8b6842] bg-[#f4e6c9]/65 text-[#513528] shadow-[inset_0_0_0_2px_rgba(255,251,238,0.3)] hover:bg-[#f4e6c9]`} type="button" onClick={openImportDialog}>
						<svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 3v12m-5-5 5 5 5-5M5 18v2h14v-2" />
						</svg>
						<span>Import</span>
					</button>
					<button class={`${navButtonClasses} border-[#8b6842] bg-[#f4e6c9]/65 text-[#513528] shadow-[inset_0_0_0_2px_rgba(255,251,238,0.3)] hover:bg-[#f4e6c9]`} type="button" onClick={openShareDialog}>
						<svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
						</svg>
						<span>Share</span>
					</button>
					</div>
				</div>
			</header>
			<main class="letter-content font-main">

				{/* READ MODE */}
				<Show when={!editMode()}>
					{/* fully revealed lines */}
					<For each={lines()}>
						{line => <p class="block min-h-8">{line}</p>}
					</For>
				</Show>

				{/* EDIT MODE */}
				<Show when={editMode()}>
					<div
						class="letter-editor"
						contentEditable
						role="textbox"
						aria-label="Letter text"
						aria-multiline="true"
						data-placeholder="Write your letter here…"
						onInput={(e) => {
							const text = e.currentTarget.innerText;
							if (importedBody() === null) updateQueryParam(text.split("\n"));
							else setImportedBody(text);
						}}
					>{untrack(() => currentLetterLines().join("\n"))}</div>
				</Show>
			</main>
			<dialog
				ref={element => { shareDialog = element; }}
				class="fixed top-1/2 left-1/2 right-auto bottom-auto m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-[#8b6842]/70 bg-[#f5e6c8] p-0 text-[#3d2c20] shadow-[0_24px_70px_rgba(38,23,16,0.35)] backdrop:bg-[#261912]/60"
				aria-labelledby="share-dialog-title"
				onClose={() => {
					clearTimeout(encryptionTimer);
					encryptionRun++;
					setSharePassword("");
					setEncryptedBody("");
				}}
			>
				<div class="border-b border-[#8b6842]/25 px-5 py-4 sm:px-6">
					<div class="flex items-center justify-between gap-4">
						<h2 id="share-dialog-title" class="font-[family-name:var(--font-cinzel)] text-lg tracking-[0.06em]">Share this letter</h2>
						<button class="rounded p-1.5 text-[#674a35] hover:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" aria-label="Close share dialog" onClick={() => shareDialog?.close()}>
							<svg class="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19" /></svg>
						</button>
					</div>
				</div>
				<div class="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
					<div class="space-y-2">
						<label for="share-url" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Letter URL</label>
						<div class="flex items-start gap-2">
							<textarea id="share-url" class="min-h-12 min-w-0 flex-1 resize-none rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 py-2 text-sm leading-5 text-[#513528] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" rows="2" readOnly value={shareUrl()} onFocus={event => event.currentTarget.select()} />
							<button class="min-h-12 shrink-0 rounded border border-[#8b6842] bg-[#513528] px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#f8e9c9] uppercase hover:bg-[#694534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36]" type="button" onClick={copyShareUrl}>{copied() ? "Copied" : "Copy"}</button>
						</div>
					</div>
					<p class="font-main text-sm">If you want to send an encrypted letter, type a password below. Then, copy the encrypted text and send that, along with the password, to your recepient.</p>
					<div class="space-y-2">
						<label for="share-password" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Password</label>
						<input id="share-password" class="min-h-12 w-full rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 text-sm text-[#513528] placeholder:text-[#9b8269] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="text" autocomplete="new-password" placeholder="Enter a password to encrypt the letter" value={sharePassword()} onInput={event => updateSharePassword(event.currentTarget.value)} />
					</div>
					<Show when={sharePassword()}>
						<div class="space-y-2 border-t border-[#8b6842]/25 pt-5">
							<label for="encrypted-letter" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Encrypted letter</label>
							<Show when={encryptedBody()} fallback={<p class="text-sm text-[#674a35]">{encrypting() ? "Encrypting letter…" : "Encryption is unavailable."}</p>}>
								<textarea id="encrypted-letter" class="w-full resize-y rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 py-2 font-mono text-xs leading-5 text-[#513528] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" rows="5" readOnly value={encryptedBody()} onFocus={event => event.currentTarget.select()} />
								<button class="min-h-11 rounded border border-[#8b6842] bg-[#513528] px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#f8e9c9] uppercase hover:bg-[#694534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36]" type="button" onClick={copyEncryptedBody}>{encryptedCopied() ? "Copied" : "Copy encrypted text"}</button>
							</Show>
							<p class="text-xs leading-5 text-[#674a35]">Send the encrypted text to your recipient; they can paste it into Import and enter the password. The URL above still contains readable letter text.</p>
						</div>
					</Show>
					<Show when={shareError()}><p class="text-sm text-[#8a3328]" role="alert">{shareError()}</p></Show>
				</div>
			</dialog>
			<dialog
				ref={element => { importDialog = element; }}
				class="fixed top-1/2 left-1/2 right-auto bottom-auto m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-[#8b6842]/70 bg-[#f5e6c8] p-0 text-[#3d2c20] shadow-[0_24px_70px_rgba(38,23,16,0.35)] backdrop:bg-[#261912]/60"
				aria-labelledby="import-dialog-title"
				onClose={() => {
					importRun++;
					setImportText("");
					setImportPassword("");
					setImportError("");
					setUnlocking(false);
				}}
			>
				<div class="border-b border-[#8b6842]/25 px-5 py-4 sm:px-6">
					<div class="flex items-center justify-between gap-4">
						<h2 id="import-dialog-title" class="font-[family-name:var(--font-cinzel)] text-lg tracking-[0.06em]">Import a letter</h2>
						<button class="rounded p-1.5 text-[#674a35] hover:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" aria-label="Close import dialog" onClick={() => importDialog?.close()}>
							<svg class="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19" /></svg>
						</button>
					</div>
				</div>
				<form class="space-y-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={event => {
					event.preventDefault();
					if (importStage() === "paste") continueImport();
					else unlockImportedLetter();
				}}>
					<Show when={importStage() === "paste"} fallback={
						<div class="space-y-2">
							<p class="text-sm leading-6 text-[#674a35]">Encrypted letter received. Enter its password to read it.</p>
							<label for="import-password" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Password</label>
							<input id="import-password" class="min-h-12 w-full rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 text-sm text-[#513528] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="password" autocomplete="off" value={importPassword()} onInput={event => { setImportPassword(event.currentTarget.value); setImportError(""); }} />
						</div>
					}>
						<div class="space-y-2">
							<label for="import-text" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Encrypted letter text</label>
							<textarea id="import-text" class="w-full resize-y rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 py-2 font-mono text-xs leading-5 text-[#513528] placeholder:text-[#9b8269] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" rows="6" placeholder="Paste the encrypted text here" value={importText()} onInput={event => { setImportText(event.currentTarget.value); setImportError(""); }} />
						</div>
					</Show>
					<Show when={importError()}><p class="text-sm text-[#8a3328]" role="alert">{importError()}</p></Show>
					<div class="flex justify-end gap-2">
						<Show when={importStage() === "password"}>
							<button class="min-h-11 rounded border border-[#8b6842]/50 px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase hover:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" onClick={() => { setImportStage("paste"); setImportPassword(""); setImportError(""); }}>Back</button>
						</Show>
						<button class="min-h-11 rounded border border-[#8b6842] bg-[#513528] px-4 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#f8e9c9] uppercase hover:bg-[#694534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={unlocking()}>{unlocking() ? "Unlocking…" : importStage() === "paste" ? "Continue" : "Unlock letter"}</button>
					</div>
				</form>
			</dialog>
		</div>
	);
}
