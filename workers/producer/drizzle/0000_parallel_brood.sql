CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_token` text,
	`github_id` text,
	`email` text,
	`username` text
);
--> statement-breakpoint
CREATE TABLE `user_repo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_uuid` text,
	`repo` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
