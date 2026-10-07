import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

type ActionName = "edit" | "view" | "new" | "import" | "share";

type LetterNavProps = {
	editing: boolean;
	onEdit: () => void;
	onNew: () => void;
	onImport: () => void;
	onShare: () => void;
};

const buttonBase = "inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] whitespace-nowrap rounded-[3px] border px-[11px] py-2 font-[family-name:var(--font-cinzel)] text-[10px] font-semibold tracking-[0.09em] uppercase transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#8b5d36] active:translate-y-px sm:px-[17px] sm:py-[9px] sm:text-xs";
const lightButton = "border-[#8b6842] bg-[#f4e6c9]/65 text-[#513528] shadow-[inset_0_0_0_2px_rgba(255,251,238,0.3)] hover:bg-[#f4e6c9]";
const darkButton = "border-[#8b6842] bg-[#513528] text-[#f8e9c9] shadow-[inset_0_0_0_2px_rgba(241,216,170,0.15),0_2px_5px_rgba(67,41,25,0.1)] hover:bg-[#694534] hover:shadow-[inset_0_0_0_2px_rgba(241,216,170,0.2),0_3px_8px_rgba(67,41,25,0.15)]";
const mobileAction = "flex min-h-12 w-full items-center gap-3 rounded px-3 text-left font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.06em] text-[#513528] uppercase transition-colors hover:bg-[#e9d4aa] focus-visible:bg-[#e9d4aa] focus-visible:outline-2 focus-visible:outline-[#8b5d36]";

function ActionIcon(props: { name: ActionName; class?: string }) {
	return (
		<svg class={props.class ?? "h-4 w-4"} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<Show when={props.name === "edit"}><path d="M12 19h8" /><path d="M16.5 4.5a2.12 2.12 0 0 1 3 3L9 18l-4 1 1-4z" /></Show>
			<Show when={props.name === "view"}><path d="M4 6.5c2.8-1.2 5.4-1.2 8 0v12c-2.6-1.2-5.2-1.2-8 0z" /><path d="M20 6.5c-2.8-1.2-5.4-1.2-8 0v12c2.6-1.2 5.2-1.2 8 0z" /></Show>
			<Show when={props.name === "new"}><path d="M12 5v14" /><path d="M5 12h14" /></Show>
			<Show when={props.name === "import"}><path d="M12 3v12m-5-5 5 5 5-5M5 18v2h14v-2" /></Show>
			<Show when={props.name === "share"}><path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></Show>
		</svg>
	);
}

export function LetterNav(props: LetterNavProps) {
	const [menuOpen, setMenuOpen] = createSignal(false);
	let menuContainer: HTMLDivElement | undefined;
	let menuTrigger: HTMLButtonElement | undefined;

	const actions = [
		{ label: () => props.editing ? "View letter" : "Edit letter", icon: () => props.editing ? "view" as const : "edit" as const, run: () => props.onEdit(), primary: false },
		{ label: () => "Import", icon: () => "import" as const, run: () => props.onImport(), primary: false },
		{ label: () => "Share", icon: () => "share" as const, run: () => props.onShare(), primary: false },
		{ label: () => "New letter", icon: () => "new" as const, run: () => props.onNew(), primary: true },
	];

	const runAction = (action: typeof actions[number]) => {
		setMenuOpen(false);
		action.run();
	};

	onMount(() => {
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
		});
	});

	return (
		<header class="relative z-10 shrink-0 border-b border-[rgba(100,70,42,0.24)] bg-[rgba(247,235,207,0.54)] shadow-[0_2px_12px_rgba(93,61,32,0.05)]">
			<div class="mx-auto flex min-h-[66px] w-full max-w-[1120px] items-center justify-end gap-2 px-4 sm:min-h-[76px] sm:gap-5 sm:px-6">
				<div class="relative sm:hidden" ref={element => { menuContainer = element; }}>
					<button ref={element => { menuTrigger = element; }} class="inline-flex min-h-11 items-center gap-2.5 rounded-[3px] border border-[#8b6842] bg-[#f4e6c9]/65 px-3.5 font-[family-name:var(--font-cinzel)] text-xs font-semibold tracking-[0.09em] text-[#513528] uppercase shadow-[inset_0_0_0_2px_rgba(255,251,238,0.3)] transition-colors hover:bg-[#f4e6c9] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#8b5d36]" type="button" aria-expanded={menuOpen()} aria-controls="letter-mobile-actions" onClick={() => setMenuOpen(open => !open)}>
						<svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
						<span>Menu</span>
						<svg class={`h-3 w-3 transition-transform ${menuOpen() ? "rotate-180" : ""}`} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
					</button>
					<Show when={menuOpen()}>
						<div id="letter-mobile-actions" class="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-[#8b6842]/65 bg-[#f6e8ca] p-1.5 shadow-[0_12px_28px_rgba(67,41,25,0.2)]" role="group" aria-label="Letter actions">
							<For each={actions}>{(action, index) => <>
								<Show when={index() > 0}><div class="mx-3 border-t border-[#8b6842]/20" aria-hidden="true" /></Show>
								<button class={mobileAction} type="button" onClick={() => runAction(action)}>
									<ActionIcon name={action.icon()} class="h-4 w-4 shrink-0" />
									<span>{action.label()}</span>
								</button>
							</>}</For>
						</div>
					</Show>
				</div>
				<div class="hidden items-center gap-5 sm:flex">
					<For each={actions}>{(action, index) =>
						<button class={`${buttonBase} ${action.primary ? darkButton : lightButton}`} type="button" aria-pressed={index() === 0 ? props.editing : undefined} onClick={() => runAction(action)}>
							<ActionIcon name={action.icon()} />
							<span>{action.label()}</span>
						</button>
					}</For>
				</div>
			</div>
		</header>
	);
}
