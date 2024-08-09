import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	githubToken: text('github_token'),
	githubId: text('github_id'),
	email: text('email'),
	username: text('username'),
});

export const userRepo = sqliteTable('user_repo', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').references(() => user.id),
	repo: text('repo'),
});
