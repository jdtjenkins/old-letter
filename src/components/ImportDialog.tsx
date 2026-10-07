import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { decryptLetter, isEncryptedLetter } from "../utils/crypto";
import { DialogShell } from "./DialogShell";

type ImportDialogProps = {
	open: boolean;
	onClose: () => void;
	onImport: (body: string) => void;
};

export function ImportDialog(props: ImportDialogProps) {
	const [encryptedText, setEncryptedText] = createSignal("");
	const [stage, setStage] = createSignal<"paste" | "password">("paste");
	const [password, setPassword] = createSignal("");
	const [error, setError] = createSignal("");
	const [unlocking, setUnlocking] = createSignal(false);
	let importRun = 0;

	createEffect(() => {
		if (!props.open) return;
		importRun++;
		setEncryptedText("");
		setStage("paste");
		setPassword("");
		setError("");
		setUnlocking(false);
		requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("#import-text")?.focus());
	});

	onCleanup(() => { importRun++; });

	const continueImport = () => {
		if (!isEncryptedLetter(encryptedText().trim())) {
			setError("Paste encrypted letter text created by this app.");
			return;
		}
		setError("");
		setStage("password");
		requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#import-password")?.focus());
	};

	const unlock = async () => {
		if (!password()) {
			setError("Enter the password for this letter.");
			return;
		}
		const run = ++importRun;
		setUnlocking(true);
		setError("");
		try {
			const body = await decryptLetter(encryptedText().trim(), password());
			if (run !== importRun) return;
			props.onImport(body);
			props.onClose();
		} catch {
			if (run === importRun) setError("Incorrect password or damaged encrypted letter text.");
		} finally {
			if (run === importRun) setUnlocking(false);
		}
	};

	return (
		<DialogShell open={props.open} title="Import a letter" titleId="import-dialog-title" onClose={() => {
			importRun++;
			setEncryptedText("");
			setPassword("");
			setError("");
			setUnlocking(false);
			props.onClose();
		}}>
			<form class="space-y-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={event => {
				event.preventDefault();
				if (stage() === "paste") continueImport();
				else unlock();
			}}>
				<Show when={stage() === "paste"} fallback={
					<div class="space-y-2">
						<p class="text-sm leading-6 text-[#674a35]">Encrypted letter received. Enter its password to read it.</p>
						<label for="import-password" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Password</label>
						<input id="import-password" class="min-h-12 w-full rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 text-sm text-[#513528] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="text" autocomplete="off" value={password()} onInput={event => { setPassword(event.currentTarget.value); setError(""); }} />
					</div>
				}>
					<div class="space-y-2">
						<label for="import-text" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Encrypted letter text</label>
						<textarea id="import-text" class="w-full resize-y rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 py-2 font-mono text-xs leading-5 text-[#513528] placeholder:text-[#9b8269] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" rows="6" placeholder="Paste the encrypted text here" value={encryptedText()} onInput={event => { setEncryptedText(event.currentTarget.value); setError(""); }} />
					</div>
				</Show>
				<Show when={error()}><p class="text-sm text-[#8a3328]" role="alert">{error()}</p></Show>
				<div class="flex justify-end gap-2">
					<Show when={stage() === "password"}>
						<button class="min-h-11 rounded border border-[#8b6842]/50 px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase hover:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" onClick={() => { setStage("paste"); setPassword(""); setError(""); }}>Back</button>
					</Show>
					<button class="min-h-11 rounded border border-[#8b6842] bg-[#513528] px-4 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#f8e9c9] uppercase hover:bg-[#694534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={unlocking()}>{unlocking() ? "Unlocking…" : stage() === "paste" ? "Continue" : "Unlock letter"}</button>
				</div>
			</form>
		</DialogShell>
	);
}
