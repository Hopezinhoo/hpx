CREATE TABLE `presence_rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `presence_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `presence_users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presence_sessions_token_hash_unique` ON `presence_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_presence` ON `presence_sessions` (`user_id`,`ended_at`,`expires_at`);--> statement-breakpoint
CREATE TABLE `presence_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `users_last_seen` ON `presence_users` (`last_seen`);