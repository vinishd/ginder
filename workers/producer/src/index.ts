import { Hono } from 'hono';
import { Ai, Queue, D1Database, KVNamespace } from '@cloudflare/workers-types';
import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer';
import dedent from 'dedent';
import { drizzle } from 'drizzle-orm/d1';
import { user } from './db/schema';

interface Env {
	VECTORIZE_INDEX: VectorizeIndex;
	AI: Ai;
	APP_SECRET: string;
	GITHUB_TOKEN: string;
	QUEUE: Queue;
	DB: D1Database;
	CACHE: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

const authMiddleware = async (c: any, next: () => Promise<void>) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || authHeader !== `Bearer ${c.env.APP_SECRET}`) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	await next();
};

app.use(authMiddleware);

interface EmbeddingResponse {
	shape: number[];
	data: number[][];
}

interface Summary {
	[key: string]: any;
}

app.post('/parse', async c => {
	// Get the README content from the request body
	const { repo } = await c.req.json();
	if (!repo) {
		return c.json({ error: 'Repository name is required' }, 400);
	}

	const octokit = new Octokit({ auth: c.env.GITHUB_TOKEN });
	const [owner, repoName] = repo.split('/');
	console.log(`${owner}/${repo}`);

	try {
		// Fetch README content
		const readmeResponse = await octokit.repos.getReadme({
			owner,
			repo: repoName,
		});
		const readmeContent = Buffer.from(
			readmeResponse.data.content,
			'base64'
		).toString('utf-8');

		console.log('readme: ', readmeContent);

		// Fetch languages used in the repo
		const languagesResponse = await octokit.repos.listLanguages({
			owner,
			repo: repoName,
		});
		const languages = Object.keys(languagesResponse.data).join(', ');
		console.log('languages: ', languages);

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

		const genResp: BaseAiTextGeneration['postProcessedOutputs'] =
			await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
				messages: [{ role: 'user', content: prompt }],
			});
		if (genResp instanceof ReadableStream) {
			throw new Error('Unexpected stream response');
		}
		const summary = genResp.response as string;
		console.log('summary: ', summary);

		const embeddingResp: EmbeddingResponse = await c.env.AI.run(
			'@cf/baai/bge-base-en-v1.5',
			{
				text: summary,
			}
		);

		// Convert the vector embeddings into a format Vectorize can accept
		const vectors: VectorizeVector[] = embeddingResp.data.map((vector, _) => ({
			id: repo,
			values: vector,
			metadata: {
				repo,
				repoName,
				owner,
			},
		}));

		// Upsert the vectors into the Vectorize index
		let inserted = await c.env.VECTORIZE_INDEX.upsert(vectors);

		return Response.json(inserted);
	} catch (e) {
		return c.json(
			{
				success: false,
				message: 'Error processing repository information',
				error: (e as Error).message,
			},
			500
		);
	}
});

app.post('/process-user', async c => {
	const { githubToken, userId } = await c.req.json();
	if (!githubToken) {
		return c.json({ error: 'GitHub token is required' }, 400);
	}

	const octokit = new Octokit({ auth: githubToken });
	// Get the authenticated user's information
	const { data: user } = await octokit.users.getAuthenticated();
	const username = user.login;

	try {
		const repos = await octokit.paginate(
			octokit.repos.listForAuthenticatedUser,
			{
				per_page: 300,
			}
		);
		const processedRepos: any[] = []; // TODO: add interface

		await Promise.all(
			repos.map(async r => {
				await c.env.QUEUE.send(
					JSON.stringify({
						repo: r.full_name,
						githubToken,
						username,
						userId,
					})
				);
				processedRepos.push(r.full_name);
			})
		);

		console.log('number of repos: ', repos.length);

		return c.json({ success: true, processedRepos });
	} catch (e) {
		return c.json({ error: (e as Error).message }, 500);
	}
});

app.get('/describe', async c => {
	const index = await c.env.VECTORIZE_INDEX.describe();
	return Response.json(index);
});

app.get('/query', async c => {
	// query from vectorize
	const { matches } = await c.env.VECTORIZE_INDEX.query(
		new Array(768).fill(0),
		{
			topK: 3,
			returnValues: true,
			returnMetadata: true,
		}
	);
	matches.forEach(match => {
		console.log(match.id);
	});

	return c.json({ status: 'ok' });
});

app.get('/users', async c => {
	const db = drizzle(c.env.DB);
	const result = await db.select().from(user).all();
	return c.json(result);
});

// add new user
app.post('/users', async c => {
	const db = drizzle(c.env.DB);
	const { username, githubToken, githubId, email } = await c.req.json();
	const result = await db
		.insert(user)
		.values({
			username,
			githubToken,
			githubId,
			email,
		})
		.returning();
	return c.json(result[0]);
});

export default app;
