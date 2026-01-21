CREATE TABLE `auth_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event_type` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`details` text,
	`success` integer NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_auth_events_user` ON `auth_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_events_type` ON `auth_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_auth_events_created` ON `auth_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`data` text NOT NULL,
	`submitted_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_form_submissions_form` ON `form_submissions` (`form_id`);--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`schema` text NOT NULL,
	`active` integer DEFAULT true,
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_slug_unique` ON `forms` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_forms_slug` ON `forms` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_forms_active` ON `forms` (`active`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`published` integer DEFAULT false,
	`author_id` text,
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pages_slug` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pages_published` ON `pages` (`published`);--> statement-breakpoint
CREATE TABLE `plugin_data` (
	`plugin_id` text NOT NULL,
	`data_key` text NOT NULL,
	`data_value` text,
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	PRIMARY KEY(`plugin_id`, `data_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_plugin_data_plugin` ON `plugin_data` (`plugin_id`);--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`enabled` integer DEFAULT true,
	`config` text,
	`installed_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugins_name_unique` ON `plugins` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_plugins_name` ON `plugins` (`name`);--> statement-breakpoint
CREATE INDEX `idx_plugins_enabled` ON `plugins` (`enabled`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT false,
	`revoked_at` integer,
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_refresh_tokens_token` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_refresh_tokens_user` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`password_hash` text,
	`role` text DEFAULT 'user',
	`created_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL,
	`updated_at` integer DEFAULT CAST(unixepoch() AS INTEGER) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);