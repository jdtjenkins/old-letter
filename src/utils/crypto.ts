const ITERATIONS = 210_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array => {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encrypted letter");
	const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
	return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const deriveKey = async (password: string, salt: Uint8Array, usage: KeyUsage): Promise<CryptoKey> => {
	const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		passwordKey,
		{ name: "AES-GCM", length: 256 },
		false,
		[usage],
	);
};

export const encryptLetter = async (body: string, password: string): Promise<string> => {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(password, salt, "encrypt");
	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(body)));
	return ["v1", toBase64Url(salt), toBase64Url(iv), toBase64Url(ciphertext)].join(".");
};

const parseEncryptedLetter = (payload: string) => {
	const [version, encodedSalt, encodedIv, encodedCiphertext, extra] = payload.split(".");
	if (version !== "v1" || !encodedSalt || !encodedIv || !encodedCiphertext || extra) {
		throw new Error("Invalid encrypted letter");
	}
	const salt = fromBase64Url(encodedSalt);
	const iv = fromBase64Url(encodedIv);
	const ciphertext = fromBase64Url(encodedCiphertext);
	if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) {
		throw new Error("Invalid encrypted letter");
	}
	return { salt, iv, ciphertext };
};

export const isEncryptedLetter = (payload: string): boolean => {
	try {
		parseEncryptedLetter(payload);
		return true;
	} catch {
		return false;
	}
};

export const decryptLetter = async (payload: string, password: string): Promise<string> => {
	const { salt, iv, ciphertext } = parseEncryptedLetter(payload);
	const key = await deriveKey(password, salt, "decrypt");
	const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
	return decoder.decode(plaintext);
};
