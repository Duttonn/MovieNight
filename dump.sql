PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE `friend_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_user_id` integer NOT NULL,
	`to_user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO friend_requests VALUES(1,3,2,'accepted',1745927177);
INSERT INTO friend_requests VALUES(2,4,3,'accepted',1745965397);
INSERT INTO friend_requests VALUES(3,5,3,'accepted',1746008461);
CREATE TABLE `friends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`friend_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO friends VALUES(1,2,3);
INSERT INTO friends VALUES(2,3,2);
INSERT INTO friends VALUES(3,3,4);
INSERT INTO friends VALUES(4,4,3);
INSERT INTO friends VALUES(5,3,5);
INSERT INTO friends VALUES(6,5,3);
CREATE TABLE `group_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO group_members VALUES(1,1,1);
INSERT INTO group_members VALUES(2,2,3);
INSERT INTO group_members VALUES(3,2,2);
INSERT INTO group_members VALUES(4,3,2);
INSERT INTO group_members VALUES(5,3,3);
INSERT INTO group_members VALUES(6,4,2);
INSERT INTO group_members VALUES(7,4,3);
INSERT INTO group_members VALUES(8,5,2);
INSERT INTO group_members VALUES(9,6,2);
INSERT INTO group_members VALUES(10,7,2);
INSERT INTO group_members VALUES(11,8,2);
INSERT INTO group_members VALUES(12,9,2);
INSERT INTO group_members VALUES(13,10,2);
INSERT INTO group_members VALUES(14,11,2);
INSERT INTO group_members VALUES(15,12,2);
INSERT INTO group_members VALUES(16,13,3);
INSERT INTO group_members VALUES(17,13,4);
INSERT INTO group_members VALUES(18,14,3);
INSERT INTO group_members VALUES(19,15,5);
INSERT INTO group_members VALUES(20,16,5);
INSERT INTO group_members VALUES(21,16,3);
INSERT INTO group_members VALUES(22,17,3);
INSERT INTO group_members VALUES(23,17,2);
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`schedule_type` text NOT NULL,
	`schedule_day` integer,
	`schedule_time` text,
	`schedule_date` integer,
	`current_proposer_index` integer DEFAULT 0,
	`last_movie_night` integer
, `decided_movie_id` integer);
INSERT INTO "groups" VALUES(1,'test','recurring',5,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(2,'test','recurring',5,'19:30',NULL,0,1746485237,NULL);
INSERT INTO "groups" VALUES(3,'test3','oneoff',NULL,'19:30',1744840800,1,1746531358,NULL);
INSERT INTO "groups" VALUES(4,'test2','oneoff',NULL,'19:30',1745272800,0,NULL,NULL);
INSERT INTO "groups" VALUES(5,'test','recurring',4,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(6,'testttt','oneoff',NULL,'19:30',1744063200,0,NULL,NULL);
INSERT INTO "groups" VALUES(7,'testitest','recurring',0,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(8,'test','recurring',5,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(9,'ttt','oneoff',NULL,'19:30',1745445600,0,NULL,NULL);
INSERT INTO "groups" VALUES(10,'tetstststst','oneoff',NULL,'19:30',1743976800,0,NULL,NULL);
INSERT INTO "groups" VALUES(11,'tetstststs','recurring',1,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(12,'blbilbi','recurring',2,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(13,'eliot','recurring',5,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(14,'test','recurring',3,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(15,'zoe friends','oneoff',NULL,'19:30',1746396000,0,NULL,NULL);
INSERT INTO "groups" VALUES(16,'test','recurring',5,'19:30',NULL,0,NULL,NULL);
INSERT INTO "groups" VALUES(17,'test','oneoff',NULL,'19:30',1744063200,0,NULL,NULL);
CREATE TABLE `movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`tmdb_id` integer,
	`poster_path` text,
	`proposer_id` integer NOT NULL,
	`proposed_at` integer NOT NULL,
	`proposal_intent` integer NOT NULL,
	`interest_score` integer,
	`watched` integer DEFAULT false,
	`watched_at` integer,
	`notes` text,
	`personal_rating` integer,
	`group_id` integer,
	FOREIGN KEY (`proposer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO movies VALUES(1,'A Working Man',1197306,'/xUkUZ8eOnrOnnJAfusZUqKYZiDu.jpg',1,1745926722,4,NULL,0,NULL,NULL,NULL,1);
INSERT INTO movies VALUES(2,'avengers',NULL,NULL,1,1745926767,4,NULL,0,NULL,NULL,NULL,1);
INSERT INTO movies VALUES(3,'A Working Man',1197306,'/xUkUZ8eOnrOnnJAfusZUqKYZiDu.jpg',3,1745927565,4,4,1,1746263823,'',4,2);
INSERT INTO movies VALUES(4,'Lilo & Stitch',552524,'/3bN675X0K2E5QiAZVChzB5wq90B.jpg',2,1745928141,4,2,1,1746485237,NULL,NULL,2);
INSERT INTO movies VALUES(5,'A Minecraft Movie',950387,'/iPPTGh2OXuIv6d7cwuoPkw8govp.jpg',3,1745965492,4,2,1,1746268463,'',4,13);
INSERT INTO movies VALUES(6,'A Minecraft Movie',950387,'/iPPTGh2OXuIv6d7cwuoPkw8govp.jpg',5,1746008508,4,NULL,0,NULL,NULL,NULL,16);
INSERT INTO movies VALUES(7,'The Hitchhiker''s Guide to the Galaxy',7453,'/yr9A3KGQlxBh3yW0cmglsr8aMIz.jpg',3,1746015569,4,3,1,1746269298,NULL,NULL,4);
INSERT INTO movies VALUES(12,'Avenger',47369,'/cEI5aazuAVJ3PcWeNM8gxYiNjmq.jpg',3,1746262905,4,1,1,1746269998,NULL,NULL,2);
INSERT INTO movies VALUES(13,'Avengers: Infinity War',299536,'/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',3,1746268426,4,NULL,1,1746270124,NULL,NULL,2);
INSERT INTO movies VALUES(14,'Interstellar',157336,'/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',3,1746269283,4,3,1,1746270494,NULL,NULL,2);
INSERT INTO movies VALUES(15,'Avengers: Infinity War',299536,'/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',3,1746269987,4,NULL,1,1746482899,NULL,NULL,2);
INSERT INTO movies VALUES(16,'Avengers: Infinity War',299536,'/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',3,1746270034,4,NULL,1,1746485224,NULL,NULL,2);
INSERT INTO movies VALUES(17,'Your Name.',372058,'/8GJsy7w7frGquw1cy9jasOGNNI1.jpg',3,1746270476,3,4,0,NULL,NULL,NULL,2);
INSERT INTO movies VALUES(18,'Lilo & Stitch',552524,'/3bN675X0K2E5QiAZVChzB5wq90B.jpg',3,1746482804,4,2,0,NULL,NULL,NULL,2);
INSERT INTO movies VALUES(19,'Interstellar',157336,'/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',3,1746484702,4,2,0,NULL,NULL,NULL,2);
INSERT INTO movies VALUES(20,'Avengers: Infinity War',299536,'/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',2,1746527090,4,NULL,1,1746527155,NULL,NULL,3);
INSERT INTO movies VALUES(21,'Interstellar',157336,'/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',2,1746527116,2,4,1,1746531295,NULL,NULL,3);
INSERT INTO movies VALUES(22,'Lilo & Stitch',552524,'/3bN675X0K2E5QiAZVChzB5wq90B.jpg',2,1746527132,2,1,1,1746531358,NULL,NULL,3);
INSERT INTO movies VALUES(23,'Arrival',329865,'/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',2,1746527147,2,3,0,NULL,NULL,NULL,3);
INSERT INTO movies VALUES(24,'Avengers: Endgame',299534,'/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',3,1746527177,4,3,1,1746527234,NULL,NULL,3);
INSERT INTO movies VALUES(25,'Alvin and the Chipmunks: The Squeakquel',23398,'/8mdPqOga5fty15nXmaNcK1fsNMa.jpg',3,1746531315,4,3,1,1746531350,NULL,NULL,3);
INSERT INTO movies VALUES(26,'Lilly the Witch: The Dragon and the Magic Book',30144,'/3nXP7x7vw3raOYwkUagwp3nShHP.jpg',3,1746826916,4,NULL,0,NULL,NULL,NULL,3);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`name` text,
	`avatar` text,
	`password_hash` text NOT NULL,
	`email` text
);
INSERT INTO users VALUES(1,'tttt',NULL,NULL,'$2b$10$B1hTSkFEoAIpazzWiijc2uan0CPPHASbKu0cDrrZFgrDcT7kIPs0K','tttt@example.com');
INSERT INTO users VALUES(2,'test',NULL,NULL,'$2b$10$faOLlUtEqjAWJ2IfYxjdGOLauDZ3PCo7Ns194ImAIQFBkqrYVnomS','test@example.com');
INSERT INTO users VALUES(3,'natao',NULL,NULL,'$2b$10$wv8f2Qkf6VENTyFoOAD8J.AmaNZ1CB9wC6XOjgx7GQ3FLnU7u87Si','natao@example.com');
INSERT INTO users VALUES(4,'eliot',NULL,NULL,'$2b$10$ZK1f7TkvJ8JKHXHXlbrvBuuibdjmoVUiBplX6sZ971taXgJRON/du','eliot@example.com');
INSERT INTO users VALUES(5,'zoe',NULL,NULL,'$2b$10$vfatv.rNVH5UyyiKJlH5JuwtCCDXJW8RLeb9P6RlAozCz06EzQSDe','zoe@example.com');
INSERT INTO users VALUES(6,'euan',NULL,NULL,'$2b$10$QPcebvAf5ppp.kOtoxq.ouWq27r.iP8oMlscAO3EowzJKVrN1WSc2','euan@example.com');
INSERT INTO users VALUES(7,'testi',NULL,NULL,'$2b$10$kOGh1NTCmAc76j62e5BXI.x4EMxwxWqK7/w9JjYCOkI2R56vo11mG','testi@example.com');
INSERT INTO users VALUES(8,'nnn',NULL,NULL,'$2b$10$J4TP4CikNe80.LgRzESvVOJGVLIjf..6JvSBVgpf8oidH2OvNk1sW','nnn@example.com');
INSERT INTO users VALUES(9,'tes',NULL,NULL,'$2b$10$j4HgM2/.wGx14CHer/40ke4bZk0RqZ4lyqz9ufP1J2J3S3upIZR3W','tes@example.com');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',9);
INSERT INTO sqlite_sequence VALUES('groups',17);
INSERT INTO sqlite_sequence VALUES('group_members',23);
INSERT INTO sqlite_sequence VALUES('movies',26);
INSERT INTO sqlite_sequence VALUES('friend_requests',3);
INSERT INTO sqlite_sequence VALUES('friends',6);
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
COMMIT;
