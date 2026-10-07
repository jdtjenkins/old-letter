import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { encryptLetter } from "../utils/crypto";
import { DialogShell } from "./DialogShell";

type ShareDialogProps = {
	open: boolean;
	body: string;
	url: string;
	onClose: () => void;
};

export function ShareDialog(props: ShareDialogProps) {
	const [password, setPassword] = createSignal("");
	const [encryptedBody, setEncryptedBody] = createSignal("");
	const [encrypting, setEncrypting] = createSignal(false);
	const [error, setError] = createSignal("");
	const [urlCopied, setUrlCopied] = createSignal(false);
	const [encryptedCopied, setEncryptedCopied] = createSignal(false);
	let encryptionTimer: ReturnType<typeof setTimeout> | undefined;
	let encryptionRun = 0;

	const stopEncryption = () => {
		clearTimeout(encryptionTimer);
		encryptionRun++;
	};

	createEffect(() => {
		if (!props.open) return;
		stopEncryption();
		setPassword("");
		setEncryptedBody("");
		setEncrypting(false);
		setError("");
		setUrlCopied(false);
		setEncryptedCopied(false);
	});

	onCleanup(stopEncryption);

	const updatePassword = (value: string) => {
		stopEncryption();
		const run = encryptionRun;
		setPassword(value);
		setEncryptedBody("");
		setError("");
		setEncryptedCopied(false);
		setEncrypting(Boolean(value));
		if (!value) return;

		encryptionTimer = setTimeout(async () => {
			try {
				const encrypted = await encryptLetter(props.body, value);
				if (run === encryptionRun) {
					setEncryptedBody(encrypted);
					setEncrypting(false);
				}
			} catch {
				if (run === encryptionRun) {
					setError("Could not encrypt this letter. Please try again in a secure browser context.");
					setEncrypting(false);
				}
			}
		}, 250);
	};

	const copy = async (value: string, copied: (value: boolean) => void, message: string) => {
		try {
			await navigator.clipboard.writeText(value);
			copied(true);
			setError("");
		} catch {
			setError(message);
		}
	};

	return (
		<DialogShell open={props.open} title="Share this letter" titleId="share-dialog-title" onClose={() => {
			stopEncryption();
			setPassword("");
			setEncryptedBody("");
			props.onClose();
		}}>
			<div class="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
				<div class="space-y-2">
					<label for="share-url" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Letter URL</label>
					<div class="flex items-start gap-2">
						<textarea id="share-url" class="min-h-12 min-w-0 flex-1 resize-none rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 py-2 text-sm leading-5 text-[#513528] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" rows="2" readOnly value={props.url} onFocus={event => event.currentTarget.select()} />
						<button class="min-h-12 shrink-0 rounded border border-[#8b6842] bg-[#513528] px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#f8e9c9] uppercase hover:bg-[#694534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36]" type="button" onClick={() => copy(props.url, setUrlCopied, "Could not copy the link. Select the URL and copy it manually.")}>{urlCopied() ? "Copied" : "Copy"}</button>
					</div>
				</div>
				<p class="font-main text-sm">If you want to send an encrypted letter, type a password below. Then copy the encrypted text and send it, along with the password, to your recipient.</p>
				<div class="space-y-2">
					<label for="share-password" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Password</label>
					<input id="share-password" class="min-h-12 w-full rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 text-sm text-[#513528] placeholder:text-[#9b8269] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="text" autocomplete="new-password" placeholder="Enter a password to encrypt the letter" value={password()} onInput={event => updatePassword(event.currentTarget.value)} />
				</div>
				<Show when={password()}>
					<div class="space-y-2 border-t border-[#8b6842]/25 pt-5">
						<label for="encrypted-letter" class="block font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.08em] uppercase">Encrypted letter</label>
						<Show when={encryptedBody()} fallback={<p class="text-sm text-[#674a35]">{encrypting() ? "Encrypting letter…" : "Encryption is unavailable."}</p>}>
							<textarea id="encrypted-letter" class="w-full resize-y rounded border border-[#8b6842]/50 bg-[#fff8e8] px-3 py-2 font-mono text-xs leading-5 text-[#513528] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" rows="5" readOnly value={encryptedBody()} onFocus={event => event.currentTarget.select()} />
							<button class="min-h-11 rounded border border-[#8b6842] bg-[#513528] px-3 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#f8e9c9] uppercase hover:bg-[#694534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36]" type="button" onClick={() => copy(encryptedBody(), setEncryptedCopied, "Could not copy the encrypted text. Select it and copy it manually.")}>{encryptedCopied() ? "Copied" : "Copy encrypted text"}</button>
						</Show>
						<p class="text-xs leading-5 text-[#674a35]">Send the encrypted text to your recipient; they can paste it into Import and enter the password. The URL above still contains readable letter text.</p>
					</div>
				</Show>
				<Show when={error()}><p class="text-sm text-[#8a3328]" role="alert">{error()}</p></Show>
			</div>
		</DialogShell>
	);
}
