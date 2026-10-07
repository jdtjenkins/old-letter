import { DialogShell } from "./DialogShell";

type NewLetterDialogProps = {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

const buttonClass = "min-h-11 rounded border px-4 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5d36]";

export function NewLetterDialog(props: NewLetterDialogProps) {
	return (
		<DialogShell open={props.open} title="Begin a new letter?" titleId="new-letter-dialog-title" onClose={props.onClose}>
			<div class="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
				<p class="text-sm leading-6">Starting a new letter will clear the one you are writing now. Share it first if you want to keep a copy.</p>
				<div class="flex flex-wrap justify-end gap-2">
					<button class={`${buttonClass} border-[#8b6842]/65 bg-[#f4e6c9] text-[#513528] hover:bg-[#ead6ae]`} type="button" onClick={props.onClose}>Keep letter</button>
					<button class={`${buttonClass} border-[#8b6842] bg-[#513528] text-[#f8e9c9] hover:bg-[#694534]`} type="button" onClick={props.onConfirm}>Start new letter</button>
				</div>
			</div>
		</DialogShell>
	);
}
