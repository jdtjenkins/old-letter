import { createSignal, onMount, For, Show } from "solid-js";

const createTimer = (time: number) => new Promise(resolve => setTimeout(resolve, time));
const getTextFromUrl = () => {
	const urlParams = new URLSearchParams(window.location.search);
	const textParam = urlParams.get("text") || "";
	return textParam.split("§");
}

export function Letter() {	
	const [lines, setLines] = createSignal<string[]>([""]);
	const [editMode, setEditMode] = createSignal(false);

	const updateQueryParam = (newLines: string[]) => {
		const url = new URL(window.location.href);
		url.searchParams.set("text", newLines.join("§"));
		window.history.replaceState({}, "", url);
	};

	const startTyping = async () => {
		let timer: number | null = null

		const initialLines = getTextFromUrl();

		setLines([""])

		for (const [index, line] of initialLines.entries()) {
			let skipToNextLine = false;

			if (line === "") {
				setLines(prev => {
					const newArr = [...prev];
					newArr[index] = ""
					
					return newArr
				})

				await createTimer(50);

				continue
			}

			const fastForward = async () => {
				setLines(prev => {
					const newArr = [...prev]
					newArr[index] = initialLines[index]
					
					return newArr
				})

				document.removeEventListener("click", next);
				
				skipToNextLine = true

				await createTimer(50)
			}

			const next = () => {
				if (editMode()) return;

				fastForward();
			};

			document.addEventListener("click", next);

			for (const char of line) {
				if (skipToNextLine) break

				setLines(prev => {
					const newArr = [...prev];
					newArr[index] = `${newArr[index] || ""}${char}`
					
					return newArr
				})

				await createTimer(50)
			}
		}
	};

	const toggleMode = () => {
		setEditMode((m) => !m);

		if (!editMode()) {
			startTyping()
		}
	};

	onMount(() => {
		startTyping();
	});

	return (
		<div class="w-screen h-screen bg-gradient-to-br from-[#e9dcbf] to-[#e5cda2] flex justify-stretch items-start relative p-4 overflow-hidden">
			<div class="w-full p-4 md:p-8 text-shadow-amber-950 text-4xl md:text-6xl leading-12 font-(family-name:--font-lovers-quarrel) whitespace-pre-wrap overflow-y-auto h-full">

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
						class="w-full h-full min-h-[60vh] border border-dotted rounded border-slate-500 p-3 outline-none"
						contentEditable
						onInput={(e) => {
							updateQueryParam(e.currentTarget.innerText.split("\n"));
						}}
					>{getTextFromUrl()}</div>
				</Show>
			</div>

			{/* EDIT BUTTON */}
			<button
				class="fixed bottom-4 right-4 h-8 w-8 transition-opacity"
				onClick={toggleMode}
				classList={{
					"opacity-30": !editMode(),
					"opacity-100": editMode(),
				}}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current">
					<path d="M17.586 2a2 2 0 0 1 2.828 0L22 3.586a2 2 0 0 1 0 2.828L20.414 8L16 3.586zM14.586 5L9 10.586A2 2 0 0 0 9 12v2a2 2 0 0 0 2 2h2a2 2 0 0 0 1.414-.586L20 9.414z"/>
				</svg>
			</button>
		</div>
	);
}
