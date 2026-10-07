import { createEffect, type JSX } from "solid-js";

type DialogShellProps = {
	open: boolean;
	title: string;
	titleId: string;
	onClose: () => void;
	variant?: "raven";
	children: JSX.Element;
};

export function DialogShell(props: DialogShellProps) {
	let dialog: HTMLDialogElement | undefined;
	const raven = () => props.variant === "raven";

	createEffect(() => {
		if (props.open && !dialog?.open) dialog?.showModal();
		if (!props.open && dialog?.open) dialog.close();
	});

	return (
		<dialog
			ref={element => { dialog = element; }}
			class={`fixed top-1/2 left-1/2 right-auto bottom-auto m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border p-0 shadow-[0_24px_70px_rgba(38,23,16,0.35)] ${raven() ? "border-[#a68157]/60 bg-[#252127] text-[#f3e7d3] backdrop:bg-[#0d0b10]/75" : "border-[#8b6842]/70 bg-[#f5e6c8] text-[#3d2c20] backdrop:bg-[#261912]/60"}`}
			aria-labelledby={props.titleId}
			onClose={() => props.onClose()}
		>
			<div class={raven() ? "border-b border-[#a68157]/30 bg-[radial-gradient(ellipse_at_top,#443640_0%,#2b252c_62%,#211e24_100%)] px-5 pt-4 pb-5 sm:px-6" : "border-b border-[#8b6842]/25 px-5 py-4 sm:px-6"}>
				<div class={raven() ? "relative flex items-center justify-center" : "flex items-center justify-between gap-4"}>
					<h2 id={props.titleId} class={raven() ? "px-8 text-center font-[family-name:var(--font-cinzel)] text-base leading-6 tracking-[0.06em] text-[#f4e1c4] sm:text-lg" : "font-[family-name:var(--font-cinzel)] text-lg tracking-[0.06em]"}>{props.title}</h2>
					<button class={raven() ? "absolute top-1/2 right-0 -translate-y-1/2 rounded p-1.5 text-[#d6b993] hover:bg-[#5a4750] focus-visible:outline-2 focus-visible:outline-[#d6aa6f]" : "rounded p-1.5 text-[#674a35] hover:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]"} type="button" aria-label={`Close ${props.title.toLowerCase()} dialog`} onClick={() => dialog?.close()}>
						<svg class="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5 19 19M19 5 5 19" /></svg>
					</button>
				</div>
			</div>
			{props.children}
		</dialog>
	);
}
