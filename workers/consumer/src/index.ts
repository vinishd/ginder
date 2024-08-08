import { Ai, KVNamespace } from '@cloudflare/workers-types';

interface Env {
	VECTORIZE_INDEX: VectorizeIndex;
	AI: Ai;
	CACHE: KVNamespace;
}

interface Message {
	repo: string;
	githubToken: string;
	username: string;
}

export default {
	async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
		batch.messages.forEach(async (message) => {
			try {
				const msg = JSON.parse(message.body as string) as Message;
				console.log(`Processing repo: ${msg.repo} for user: ${msg.username}`);
			} catch (error) {
				console.error('Error parsing message:', error);
			}
		});
	},
};
