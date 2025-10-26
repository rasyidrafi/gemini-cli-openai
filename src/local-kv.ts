import * as fs from "fs";
import * as path from "path";

/**
 * Simple file-based key-value storage to replace Cloudflare KV
 * for local Node.js deployment
 */
export class LocalKVStorage {
	private storagePath: string;
	private data: Map<string, { value: string; expiry?: number }> = new Map();

	constructor(storagePath: string = "./.local-kv") {
		this.storagePath = storagePath;
		this.ensureStorageDirectory();
		this.loadFromDisk();
	}

	private ensureStorageDirectory(): void {
		const dir = path.dirname(this.storagePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	private loadFromDisk(): void {
		try {
			if (fs.existsSync(this.storagePath)) {
				const data = JSON.parse(fs.readFileSync(this.storagePath, "utf-8"));
				this.data = new Map(Object.entries(data));
			}
		} catch (error) {
			console.warn("Failed to load KV storage from disk:", error);
			this.data = new Map();
		}
	}

	private saveToDisk(): void {
		try {
			const data = Object.fromEntries(this.data);
			fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
		} catch (error) {
			console.error("Failed to save KV storage to disk:", error);
		}
	}

	private cleanupExpired(): void {
		const now = Date.now();
		let hasExpired = false;

		for (const [key, item] of this.data.entries()) {
			if (item.expiry && item.expiry < now) {
				this.data.delete(key);
				hasExpired = true;
			}
		}

		if (hasExpired) {
			this.saveToDisk();
		}
	}

	async get(key: string): Promise<string | null>;
	async get(key: string, type: "text"): Promise<string | null>;
	async get(key: string, type: "json"): Promise<any>;
	async get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer>;
	async get(key: string, type: "stream"): Promise<ReadableStream>;
	async get(key: string, type?: "text" | "json" | "arrayBuffer" | "stream"): Promise<any> {
		this.cleanupExpired();

		const item = this.data.get(key);
		if (!item) return null;

		switch (type) {
			case "json":
				return JSON.parse(item.value);
			case "arrayBuffer":
				return new TextEncoder().encode(item.value).buffer;
			case "stream":
				// For simplicity, return a readable stream from the string
				const stream = new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode(item.value));
						controller.close();
					}
				});
				return stream;
			default:
				return item.value;
		}
	}

	async put(key: string, value: string | ArrayBuffer, options?: { expirationTtl?: number }): Promise<void> {
		let stringValue: string;

		if (value instanceof ArrayBuffer) {
			stringValue = new TextDecoder().decode(value);
		} else {
			stringValue = value;
		}

		const expiry = options?.expirationTtl ? Date.now() + (options.expirationTtl * 1000) : undefined;

		this.data.set(key, { value: stringValue, expiry });
		this.saveToDisk();
	}

	async delete(key: string): Promise<void> {
		this.data.delete(key);
		this.saveToDisk();
	}

	async list(prefix?: string): Promise<{ keys: { name: string }[] }> {
		this.cleanupExpired();

		const keys = Array.from(this.data.keys())
			.filter(key => !prefix || key.startsWith(prefix))
			.map(name => ({ name }));

		return { keys };
	}
}

/**
 * Cloudflare KV-compatible interface for LocalKVStorage
 */
export interface KVNamespace {
	get(key: string): Promise<string | null>;
	get(key: string, type: "text"): Promise<string | null>;
	get(key: string, type: "json"): Promise<any>;
	get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer>;
	get(key: string, type: "stream"): Promise<ReadableStream>;
	put(key: string, value: string | ArrayBuffer, options?: { expirationTtl?: number }): Promise<void>;
	delete(key: string): Promise<void>;
	list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}