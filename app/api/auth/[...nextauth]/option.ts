import type { Account, AuthOptions, Profile } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

import { JWT } from 'next-auth/jwt';
import { AdapterUser } from 'next-auth/adapters';

declare module 'next-auth' {
	interface Session {
		accessToken?: string;
		username?: string;
	}
}

interface User {
	id: number;
	githubToken: string;
	githubId: string;
	email: string;
	username: string;
}

export const options: AuthOptions = {
	providers: [
		GithubProvider({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			authorization: {
				params: {
					scope: 'read:user user:email read:project',
				},
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, account, profile }) {
			// Persist the OAuth access_token to the token right after signin
			if (account) {
				token.accessToken = account.access_token;
				token.username = (profile as any)?.login;
			}
			return token;
		},
		async session({ session, token }: { session: any; token: JWT }) {
			// Send properties to the client, like an access_token from a provider.
			session.accessToken = token.accessToken;
			session.username = token.username;
			return session;
		},
		async signIn({ user, account, profile }) {
			const accessToken = account?.access_token;
			const username = (profile as any)?.login;
			const email = user?.email;
			const name = user?.name;

			try {
				const res = await fetch(`${process.env.WORKER_URL}/users`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${process.env.APP_SECRET}`,
					},
					body: JSON.stringify({
						githubId: username,
						email,
						username: name,
						githubToken: accessToken,
					}),
				});
				const { id: userId }: User = await res.json();
				const processRes = await fetch(
					`${process.env.WORKER_URL}/process-user`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${process.env.APP_SECRET}`,
						},
						body: JSON.stringify({
							githubToken: accessToken,
							userId,
						}),
					}
				);
				if (!processRes.ok) {
					throw new Error('Failed to process user');
				}
			} catch (error) {
				console.error(error);
			}

			return true;
		},
	},
};
