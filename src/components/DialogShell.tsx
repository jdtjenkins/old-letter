import { createEffect, type JSX } from "solid-js";

type DialogShellProps = {
	open: boolean;
	title: string;
	titleId: string;
	onClose: () => void;
	children: JSX.Element;
};

export function DialogShell(props: DialogShellProps) {
	let dialog: HTMLDialogElement | undefined;

	createEffect(() => {
		if (props.open && !dialog?.open) dialog?.showModal();
		if (!props.open && dialog?.open) dialog.close();
	});

	return (
		<dialog
			ref={element => { dialog = element; }}
			class="fixed top-1/2 left-1/2 right-auto bottom-auto m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-[#8b6842]/70 bg-[#f5e6c8] p-0 text-[#3d2c20] shadow-[0_24px_70px_rgba(38,23,16,0.35)] backdrop:bg-[#261912]/60"
			aria-labelledby={props.titleId}
			onClose={() => props.onClose()}
		>
			<div class="border-b border-[#8b6842]/25 px-5 py-4 sm:px-6">
				<div class="flex items-center justify-between gap-4">
					<h2 id={props.titleId} class="font-[family-name:var(--font-cinzel)] text-lg tracking-[0.06em]">{props.title}</h2>
					<button class="rounded p-1.5 text-[#674a35] hover:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]" type="button" aria-label={`Close ${props.title.toLowerCase()} dialog`} onClick={() => dialog?.close()}>
						<svg class="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19" /></svg>
					</button>
				</div>
			</div>
			{props.children}
		</dialog>
	);
}
