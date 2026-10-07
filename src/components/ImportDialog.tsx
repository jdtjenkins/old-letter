import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { decryptLetter, isEncryptedLetter } from "../utils/crypto";
import { DialogShell } from "./DialogShell";

type ImportDialogProps = {
	open: boolean;
	onClose: () => void;
	onImport: (body: string) => void;
};

const labelClass = "block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] text-[#e1c49a] uppercase";
const fieldClass = "w-full rounded border border-[#9a7c60]/65 bg-[#17171c] px-3 text-sm text-[#f3e7d3] placeholder:text-[#9d8d8f] shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] focus-visible:outline-2 focus-visible:outline-[#d5aa70]";

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
		<DialogShell open={props.open} title="Enter the whispers from the raven" titleId="import-dialog-title" variant="raven" onClose={() => {
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
						<p class="text-sm leading-6 text-[#e2d2be]">The letter is sealed. Enter the password you were given to reveal its message.</p>
						<label for="import-password" class={labelClass}>Password</label>
						<input id="import-password" class={`${fieldClass} min-h-12`} type="text" autocomplete="off" value={password()} onInput={event => { setPassword(event.currentTarget.value); setError(""); }} />
					</div>
				}>
					<div class="space-y-3">
						<p class="text-sm leading-6 text-[#e2d2be]">Paste the encrypted letter text you received below. Then select Continue to enter its password.</p>
						<label for="import-text" class={labelClass}>Encrypted letter text</label>
						<textarea id="import-text" class={`${fieldClass} resize-y py-2 font-mono text-xs leading-5`} rows="6" placeholder="Paste the encrypted text here" value={encryptedText()} onInput={event => { setEncryptedText(event.currentTarget.value); setError(""); }} />
					</div>
				</Show>
				<Show when={error()}><p class="text-sm text-[#ffb5a5]" role="alert">{error()}</p></Show>
				<div class="flex justify-end gap-2">
					<Show when={stage() === "password"}>
						<button class="min-h-11 rounded border border-[#a68157]/65 px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#e1c49a] uppercase hover:bg-[#44363b] focus-visible:outline-2 focus-visible:outline-[#d5aa70]" type="button" onClick={() => { setStage("paste"); setPassword(""); setError(""); }}>Back</button>
					</Show>
					<button class="min-h-11 rounded border border-[#c59a6c] bg-[#a9774e] px-4 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#18161b] uppercase shadow-[inset_0_0_0_2px_rgba(249,224,177,0.12)] hover:bg-[#c08c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5aa70] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={unlocking()}>{unlocking() ? "Unlocking…" : stage() === "paste" ? "Continue" : "Unlock letter"}</button>
				</div>
			</form>
		</DialogShell>
	);
}
