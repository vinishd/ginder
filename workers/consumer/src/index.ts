import { Ai, KVNamespace, D1Database, VectorizeIndex } from '@cloudflare/workers-types';
import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer';
import dedent from 'dedent';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { user, userRepo } from './db/schema';

interface Env {
	AI: Ai;
	CACHE: KVNamespace;
	DB: D1Database;
	VECTORIZE_INDEX: VectorizeIndex;
}

interface Message {
	repo: string;
	githubToken: string;
	username?: string;
	userId?: number;
	isOpenSource?: boolean;
}

interface EmbeddingResponse {
	shape: number[];
	data: number[][];
}

async function generateRepoSummary(octokit: Octokit, owner: string, repoName: string, env: Env): Promise<string> {
	// Fetch README content
	const readmeResponse = await octokit.repos.getReadme({
		owner,
		repo: repoName,
	});
	const readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');

	// Fetch languages used in the repo
	const languagesResponse = await octokit.repos.listLanguages({
		owner,
		repo: repoName,
	});
	const languages = Object.keys(languagesResponse.data).join(', ');

	const prompt = dedent`Based on the provided content, create a concise, bullet-point summary of the tech stack and technologies used in this project. Include only information that is explicitly mentioned or can be clearly inferred from the content provided. Omit any categories not addressed in the content. Do not include any project names, repository names, or other identifying information.

Use the following format, including only relevant sections:

• Main programming languages:
• Frameworks and libraries:
• Databases or storage solutions:
• DevOps tools or cloud services:
• Notable technical components or architectural choices:

README:
${readmeContent}

Languages used: ${languages}

Provide only the bullet-point summary, with no additional text before or after.`;

	const genResp: BaseAiTextGeneration['postProcessedOutputs'] = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
		messages: [{ role: 'user', content: prompt }],
	});

	if (genResp instanceof ReadableStream) {
		throw new Error('Unexpected stream response');
	}
	return genResp.response as string;
}

async function processOpenSourceRepo(message: Message, env: Env): Promise<void> {
	const { repo, githubToken } = message;
	const key = `processed_${repo}`;

	try {
		// Check if the repo has already been processed
		const cacheExists = await env.CACHE.get(key);
		if (cacheExists) {
			console.log('Already processed');
			return;
		}

		const octokit = new Octokit({ auth: githubToken });
		const [owner, repoName] = repo.split('/');

		const summary = await generateRepoSummary(octokit, owner, repoName, env);
		console.log('summary: ', summary);

		const embeddingResp: EmbeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
			text: summary,
		});

		// Convert the vector embeddings into a format Vectorize can accept
		const vector: VectorizeVector = {
			id: repo,
			values: embeddingResp.data[0],
			metadata: {
				repo,
				repoName,
				owner,
				summary,
			},
		};

		// Upsert the vector into the Vectorize index
		await env.VECTORIZE_INDEX.upsert([vector]);

		// Store in KV cache
		await env.CACHE.put(key, JSON.stringify(vector), {
			metadata: vector.metadata,
		});

		console.log(`Processed and stored data for ${repo}`);
	} catch (e) {
		console.error('Error processing repository:', repo, e);
	}
}

async function processUserRepo(message: Message, env: Env): Promise<void> {
	const { repo, githubToken, username, userId } = message;
	const key = `processed_${repo}`;
	const db = drizzle(env.DB);

	if (!userId || !username) {
		console.error('User ID or username not provided');
		return;
	}

	const userData = await db.select().from(user).where(eq(user.id, userId)).get();
	if (!userData) {
		console.error('User not found');
		return;
	}

	const octokit = new Octokit({ auth: githubToken });
	const [owner, repoName] = repo.split('/');

	try {
		const cacheExists = await env.CACHE.get(key);
		if (cacheExists) {
			const userRepoExists = await db
				.select()
				.from(userRepo)
				.where(and(eq(userRepo.repo, repo), eq(userRepo.userId, userId)))
				.get();
			if (!userRepoExists) {
				await db.insert(userRepo).values({ repo, userId });
			}

			console.log('Already processed');
			return;
		}
		const summary = await generateRepoSummary(octokit, owner, repoName, env);
		console.log('Summary for', repo, ':', summary);

		const embeddingResp: EmbeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
			text: summary,
		});

		// Convert the vector embeddings into a format Vectorize can accept
		const vector: VectorizeVector = {
			id: repo,
			values: embeddingResp.data[0],
			metadata: {
				repo,
				repoName,
				owner,
				username,
				summary,
			},
		};
		console.log('Vectorized data for', repo, ':', vector);
		await env.CACHE.put(key, JSON.stringify(vector), {
			metadata: vector.metadata,
		}); // TODO: expiration?

		await db.insert(userRepo).values({
			userId,
			repo,
		});
	} catch (error) {
		console.error('Error processing repository:', repo, error);
	}
}

export default {
	async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
		await Promise.all(
			batch.messages.map(async (message) => {
				try {
					const msg = JSON.parse(message.body as string) as Message;
					console.log(`Processing repo: ${msg.repo} for user: ${msg.username}`);
					if (!!msg.isOpenSource) {
						await processOpenSourceRepo(msg, env); // for open-source repos
					} else {
						await processUserRepo(msg, env); // for users' repos
					}
				} catch (error) {
					console.error('Error processing message:', error);
				}
			}),
		);
	},
};
