ALTER TABLE `applications` ADD `details_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `account_type` text;