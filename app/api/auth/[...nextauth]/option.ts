import type { Account, AuthOptions, Profile, Session } from 'next-auth';
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

export interface CustomSession extends Session {
	userId?: string;
	status: string;
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
			console.log('JWT callback', { token, user, account, profile });
			if (account) {
				token.accessToken = account.access_token;
				token.username = (profile as any)?.login;
			}
			return token;
		},
		async session({
			session,
			token,
			user,
		}: {
			session: any;
			token: JWT;
			user: any;
		}) {
			console.log('Session callback', { session, token, user });
			session.accessToken = token.accessToken;
			session.username = token.username;

			const accessToken = token.accessToken;
			const username = session.username;
			const email = session.user.email;
			const name = session.user.name;

			try {
				console.log('Fetching user data from worker');
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
				console.log('User data fetched, userId:', userId);
				session.userId = userId;

				console.log('Processing user');
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
					console.error('Failed to process user', await processRes.text());
					throw new Error('Failed to process user');
				}
				console.log('User processed successfully');
			} catch (error) {
				console.error('Error in session callback:', error);
			}

			console.log('Final session object:', session);
			return session;
		},

		async signIn({ user, account, profile }) {
			return true;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
};