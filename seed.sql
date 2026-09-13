-- Local seed: richer dataset for feed / sort / pagination testing.
-- Post/comment IDs are opaque YouTube-style tokens (not sequential).
-- Re-run safely on an un-rekeyed local DB; production never runs this seed.

-- Rate-limit events are ephemeral; local resets must not inherit test throttles.
DELETE FROM security_rate_events;

DELETE FROM comment_likes
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
   OR comment_id IN (
     SELECT id FROM comments
     WHERE author_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
        OR post_id IN (
          SELECT id FROM posts
          WHERE author_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
        )
   );
DELETE FROM post_likes
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
   OR post_id IN (
     SELECT id FROM posts
     WHERE author_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
   );
DELETE FROM comments
WHERE author_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM post_saves
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM hidden_posts
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM notifications
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM chat_messages
WHERE room_id IN (
  SELECT room_id FROM chat_room_members
  WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
);
DELETE FROM chat_requests
WHERE from_user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local')
   OR to_user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM chat_room_members
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM chat_rooms
WHERE created_by IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM posts
WHERE author_id IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');

DELETE FROM banned_words WHERE id LIKE 'bw_%';
DELETE FROM account
WHERE userId IN (SELECT id FROM "user" WHERE email LIKE '%@example.local');
DELETE FROM "user" WHERE email LIKE '%@example.local';

INSERT OR IGNORE INTO "user" (
  id, name, email, emailVerified, username,
  role, status, bio, preferredLanguage, createdAt
) VALUES
  ('7Kp3nZ8QaM2wX5Rc', 'Alice', 'alice@example.local', 1, 'alice',
   'admin', 'active', '속닥속닥을 Cloudflare 위에 만들고 있습니다.', 'ko', datetime('now', '-400 days')),
  ('2Vt9Lm4Qx7Nc1RsA', 'Bob', 'bob@example.local', 1, 'bob',
   'user', 'active', '사이드 프로젝트 수집가.', 'ko', datetime('now', '-30 days')),
  ('H6sP0dK3wZ8mB2yQ', 'Carol', 'carol@example.local', 1, 'carol',
   'moderator', 'active', '운영을 돕습니다.', 'ko', datetime('now', '-120 days')),
  ('9Aa4Cc7Ee1Gg3IiK', 'Dave', 'dave@example.local', 1, 'dave',
   'user', 'active', '엣지 런타임을 만지작거립니다.', 'ko', datetime('now', '-14 days')),
  ('L2nR5tY8uW1qE4oP', 'Erin', 'erin@example.local', 1, 'erin',
   'user', 'active', 'DX와 툴링 이야기를 씁니다.', 'ko', datetime('now', '-220 days')),
  ('B7vD0fH3jL6zX9cM', 'Frank', 'frank@example.local', 1, 'frank',
   'user', 'active', NULL, 'ko', datetime('now', '-3 days')),
  ('Q4sN7kT0mV3xA6pR', 'Grace', 'grace@example.local', 1, 'grace',
   'user', 'active', '댓글 스레드 고고학자.', 'ko', datetime('now', '-90 days')),
  ('E8rU1iO4aS7dF0gH', 'Henry', 'henry@example.local', 1, 'henry',
   'user', 'active', '대부분 링크만 공유합니다.', 'ko', datetime('now', '-60 days')),
  ('W3yC6bN9hK2lP5vX', 'Ivy', 'ivy@example.local', 1, 'ivy',
   'user', 'active', '한국어와 영어로 씁니다.', 'en', datetime('now', '-45 days')),
  ('M0qR3tY6uI9oA2sD', 'Jake', 'jake@example.local', 1, 'jake',
   'user', 'active', '게임 + CSS.', 'ko', datetime('now', '-18 days')),
  ('Z5xV8nB1mK4pH7cQ', 'Kate', 'kate@example.local', 1, 'kate',
   'user', 'active', NULL, 'ko', datetime('now', '-7 days')),
  ('F2gJ5lS8dO1wE4rT', 'Leo', 'leo@example.local', 1, 'leo',
   'user', 'active', '사진 취미.', 'ko', datetime('now', '-150 days')),
  ('A9cD2fG5hJ8kL1zX', 'Mira', 'mira@example.local', 1, 'mira',
   'user', 'active', 'Workers라면 무엇이든 물어보세요.', 'ko', datetime('now', '-80 days')),
  ('P6qW9eR2tY5uI8oA', 'Nate', 'nate@example.local', 1, 'nate',
   'user', 'active', '신입 — 피드 테스트 중.', 'ko', datetime('now', '-1 day'));

-- Posts: mixed ages, likes, link posts — enough for sort and pagination testing.
INSERT OR IGNORE INTO posts (
  id, author_id, title, body, url,
  like_count, comment_count, created_at
) VALUES
  ('k7Qm2xR9pLw', '7Kp3nZ8QaM2wX5Rc',
   'Cloudflare 위에 속닥속닥 커뮤니티 만들기',
   'D1로 저장하고, Durable Objects로 실시간 채팅을 전달하고, R2로 미디어를 저장하고, OpenNext로 Workers에서 Next.js를 돌립니다.',
   NULL, 0, 0, datetime('now', '-2 hours')),
  ('n3Vt8cY1hKs', '2Vt9Lm4Qx7Nc1RsA',
   '버벅임 없는 가상화 무한 스크롤',
   'react-virtuoso가 긴 피드와 중첩 댓글 스레드에서 꽤 안정적이었습니다.',
   NULL, 0, 0, datetime('now', '-5 hours')),
  ('o7Oo8Pp9Qq0', '7Kp3nZ8QaM2wX5Rc',
   '속닥 속삭임: 오늘의 커밋',
   '오늘은 조용히 버그 세 개를 고쳤습니다. 아무도 모르는 게 익명의 미학.',
   NULL, 0, 0, datetime('now', '-8 hours')),
  ('e9Ee0Ff1Gg2', '2Vt9Lm4Qx7Nc1RsA',
   '사이드 프로젝트의 에러 버짓',
   '취미 프로젝트에 SLO를 거는 건 과할까요? 전 월간 다운타임 예산을 하나 둡니다.',
   NULL, 0, 0, datetime('now', '-11 hours')),
  ('a4Dd7Hh1Jj3', 'H6sP0dK3wZ8mB2yQ',
   '운영 메모: 이번 주 신고 처리 현황',
   '스팸 신고 대부분이 한 계정에서 나왔습니다. 속도 제한이 잘 동작하고 있네요.',
   NULL, 0, 0, datetime('now', '-1 day')),
  ('m5Mn7Pp9Qr2', 'L2nR5tY8uW1qE4oP',
   'D1 쿼리를 12배 빠르게 만든 인덱스 하나',
   'created_at DESC + id DESC 복합 인덱스가 커서 페이지네이션에서 핵심이었습니다.',
   NULL, 0, 0, datetime('now', '-1 day')),
  ('x8Xy0Zz1Aa3', '9Aa4Cc7Ee1Gg3IiK',
   'Workers에서 WebSocket 비용 줄이기',
   'Durable Object hibernation이 유휴 연결 비용을 거의 0으로 만들어 줍니다.',
   'https://developers.cloudflare.com/durable-objects/', 0, 0, datetime('now', '-2 days')),
  ('b2Bc4Cd6De8', 'Q4sN7kT0mV3xA6pR',
   '댓글 스레드 깊이는 어디까지가 적당할까',
   'depth 3을 넘어가면 모바일에서 읽기 힘들어지는 것 같아요. 여러분 생각은?',
   NULL, 0, 0, datetime('now', '-2 days')),
  ('f9Fg1Gh3Hi5', 'E8rU1iO4aS7dF0gH',
   '읽을거리: SQLite의 FK cascade와 DROP TABLE',
   '부모 테이블을 지울 때 자식이 어떻게 정리되는지 문서가 생각보다 친절합니다.',
   'https://sqlite.org/foreignkeys.html', 0, 0, datetime('now', '-3 days')),
  ('j6Jk7Kl9Lm1', 'W3yC6bN9hK2lP5vX',
   'Anonymous but kind: writing norms for a small community',
   'A short note on keeping anonymity without losing accountability.',
   NULL, 0, 0, datetime('now', '-3 days')),
  ('c3Cv5Bn7Nm9', 'M0qR3tY6uI9oA2sD',
   '요즘 하는 게임 근황',
   '로그라이크 하나만 붙잡고 두 달째. 빌드 다양성이 생명이네요.',
   NULL, 0, 0, datetime('now', '-4 days')),
  ('q1Qw2We4Er6', 'Z5xV8nB1mK4pH7cQ',
   '처음 왔어요. 뭐부터 읽으면 좋을까요?',
   '가입한 지 일주일 — 조용히 눈팅만 하다가 인사 남깁니다.',
   NULL, 0, 0, datetime('now', '-5 days')),
  ('r5Rt6Ty7Yu8', 'F2gJ5lS8dO1wE4rT',
   '서울 야경 사진 찍기 좋은 곳',
   '남산 말고 사람 적은 포인트 아시는 분? 삼각대 들고 다니기 애매해서요.',
   NULL, 0, 0, datetime('now', '-6 days')),
  ('t0Tr1Uw3Ix5', 'A9cD2fG5hJ8kL1zX',
   'Workers + D1 마이그레이션 회고',
   '포워드 마이그레이션만 쌓는 전략이 운영에서 얼마나 편한지 모릅니다.',
   NULL, 0, 0, datetime('now', '-8 days')),
  ('p4Ps6Df8Gh0', 'P6qW9eR2tY5uI8oA',
   '테스트 글입니다',
   '피드에 뭐라도 하나 있어야 해서요. 곧 지울 수도 있습니다.',
   NULL, 0, 0, datetime('now', '-10 days')),
  ('z7Zx9Vc2Bn4', 'L2nR5tY8uW1qE4oP',
   '오래된 글: 익명 커뮤니티의 신뢰 설계',
   '신원이 아니라 행동에 신호를 주는 시스템이 필요하다는 이야기.',
   NULL, 0, 0, datetime('now', '-30 days')),
  ('h1Hj3Gk5Ll7', 'Q4sN7kT0mV3xA6pR',
   '잠긴 글 테스트: 댓글이 닫혀 있습니다',
   '이 글은 is_locked 상태라 댓글을 달 수 없습니다.',
   NULL, 0, 0, datetime('now', '-12 days')),
  ('s9Sw1Qe3Rt6', '9Aa4Cc7Ee1Gg3IiK',
   '내부 링크 글',
   '링크 타입 글 렌더링 테스트용입니다.',
   'https://sokdak.kr', 0, 0, datetime('now', '-9 days'));

UPDATE posts SET is_locked = 1 WHERE id = 'h1Hj3Gk5Ll7';

-- Board metadata: one pinned notice + realistic view counts.
UPDATE posts SET is_notice = 1, views = 412 WHERE id = 'a4Dd7Hh1Jj3';
UPDATE posts SET views = 96 WHERE id = 'k7Qm2xR9pLw';
UPDATE posts SET views = 54 WHERE id = 'n3Vt8cY1hKs';
UPDATE posts SET views = 31 WHERE id = 'e9Ee0Ff1Gg2';
UPDATE posts SET views = 22 WHERE id = 'm5Mn7Pp9Qr2';
UPDATE posts SET views = 18 WHERE id = 'x8Xy0Zz1Aa3';
UPDATE posts SET views = 12 WHERE id = 'b2Bc4Cd6De8';
UPDATE posts SET views = 7 WHERE id = 'o7Oo8Pp9Qq0';

-- Comments: a few threads with nested replies.
INSERT OR IGNORE INTO comments (
  id, post_id, author_id, parent_id, body, like_count, depth, num, created_at
) VALUES
  ('cm01aAb2Cd3', 'k7Qm2xR9pLw', '2Vt9Lm4Qx7Nc1RsA', NULL,
   'D1 마이그레이션은 어떻게 관리하고 계신가요?', 0, 0, 1, datetime('now', '-110 minutes')),
  ('cm02eEf4Gh5', 'k7Qm2xR9pLw', '7Kp3nZ8QaM2wX5Rc', 'cm01aAb2Cd3',
   '포워드 전용으로만 쌓고 있어요. 롤백은 새 마이그레이션으로.', 0, 1, 2, datetime('now', '-105 minutes')),
  ('cm03iIj6Kl7', 'k7Qm2xR9pLw', 'L2nR5tY8uW1qE4oP', 'cm02eEf4Gh5',
   '>>2 이 조합이 정답인 것 같습니다.', 0, 2, 3, datetime('now', '-100 minutes')),
  ('cm04mMn8Op9', 'e9Ee0Ff1Gg2', 'Q4sN7kT0mV3xA6pR', NULL,
   '취미에 SLO라니, 그래도 알람은 끄시죠?', 0, 0, 1, datetime('now', '-10 hours')),
  ('cm05qQr0St1', 'e9Ee0Ff1Gg2', '2Vt9Lm4Qx7Nc1RsA', 'cm04mMn8Op9',
   '알람은 이메일로만 받습니다. 휴대폰은 쉬어야죠.', 0, 1, 2, datetime('now', '-9 hours')),
  ('cm06uUv2Wx3', 'n3Vt8cY1hKs', 'E8rU1iO4aS7dF0gH', NULL,
   '커서 기반인가요 오프셋 기반인가요?', 0, 0, 1, datetime('now', '-4 hours')),
  ('cm07yYz4Ab5', 'n3Vt8cY1hKs', '2Vt9Lm4Qx7Nc1RsA', 'cm06uUv2Wx3',
   '커서요. 오프셋은 중간 삽입에서 깨지더라고요.', 0, 1, 2, datetime('now', '-3 hours')),
  ('cm08cCd6Ef7', 'm5Mn7Pp9Qr2', '9Aa4Cc7Ee1Gg3IiK', NULL,
   '실행 계획 캡처 공유해 주실 수 있나요?', 0, 0, 1, datetime('now', '-20 hours')),
  ('cm09gGh8Ij9', 'b2Bc4Cd6De8', 'A9cD2fG5hJ8kL1zX', NULL,
   'depth 2까지만 펼치고 나머지는 더보기가 낫다고 봅니다.', 0, 0, 1, datetime('now', '-1 day')),
  ('cm10kKl0Mn1', 'q1Qw2We4Er6', '7Kp3nZ8QaM2wX5Rc', NULL,
   '환영합니다! 인기 탭부터 보시면 됩니다.', 0, 0, 1, datetime('now', '-4 days'));

-- Reconcile denormalized counters with the seeded rows.
UPDATE posts
SET comment_count = (
  SELECT COUNT(*) FROM comments
  WHERE comments.post_id = posts.id
    AND comments.is_deleted = 0
    AND comments.is_removed = 0
);

-- Likes spread across posts and comments.
INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES
  ('k7Qm2xR9pLw', '2Vt9Lm4Qx7Nc1RsA', datetime('now', '-110 minutes')),
  ('k7Qm2xR9pLw', 'L2nR5tY8uW1qE4oP', datetime('now', '-100 minutes')),
  ('k7Qm2xR9pLw', 'Q4sN7kT0mV3xA6pR', datetime('now', '-95 minutes')),
  ('k7Qm2xR9pLw', '9Aa4Cc7Ee1Gg3IiK', datetime('now', '-90 minutes')),
  ('e9Ee0Ff1Gg2', '7Kp3nZ8QaM2wX5Rc', datetime('now', '-10 hours')),
  ('e9Ee0Ff1Gg2', 'Q4sN7kT0mV3xA6pR', datetime('now', '-9 hours')),
  ('e9Ee0Ff1Gg2', 'M0qR3tY6uI9oA2sD', datetime('now', '-8 hours')),
  ('n3Vt8cY1hKs', '7Kp3nZ8QaM2wX5Rc', datetime('now', '-4 hours')),
  ('n3Vt8cY1hKs', 'E8rU1iO4aS7dF0gH', datetime('now', '-3 hours')),
  ('m5Mn7Pp9Qr2', '9Aa4Cc7Ee1Gg3IiK', datetime('now', '-22 hours')),
  ('m5Mn7Pp9Qr2', '2Vt9Lm4Qx7Nc1RsA', datetime('now', '-21 hours')),
  ('m5Mn7Pp9Qr2', '7Kp3nZ8QaM2wX5Rc', datetime('now', '-20 hours')),
  ('j6Jk7Kl9Lm1', 'Z5xV8nB1mK4pH7cQ', datetime('now', '-3 days')),
  ('j6Jk7Kl9Lm1', 'P6qW9eR2tY5uI8oA', datetime('now', '-2 days')),
  ('b2Bc4Cd6De8', 'A9cD2fG5hJ8kL1zX', datetime('now', '-1 day')),
  ('b2Bc4Cd6De8', 'F2gJ5lS8dO1wE4rT', datetime('now', '-1 day')),
  ('z7Zx9Vc2Bn4', 'H6sP0dK3wZ8mB2yQ', datetime('now', '-25 days')),
  ('z7Zx9Vc2Bn4', 'W3yC6bN9hK2lP5vX', datetime('now', '-24 days')),
  ('z7Zx9Vc2Bn4', 'E8rU1iO4aS7dF0gH', datetime('now', '-23 days')),
  ('z7Zx9Vc2Bn4', '2Vt9Lm4Qx7Nc1RsA', datetime('now', '-22 days')),
  ('a4Dd7Hh1Jj3', 'L2nR5tY8uW1qE4oP', datetime('now', '-20 hours')),
  ('t0Tr1Uw3Ix5', '9Aa4Cc7Ee1Gg3IiK', datetime('now', '-7 days'));

UPDATE posts
SET like_count = (
  SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id
);

INSERT OR IGNORE INTO comment_likes (comment_id, user_id, created_at) VALUES
  ('cm02eEf4Gh5', 'L2nR5tY8uW1qE4oP', datetime('now', '-100 minutes')),
  ('cm02eEf4Gh5', 'Q4sN7kT0mV3xA6pR', datetime('now', '-98 minutes')),
  ('cm05qQr0St1', 'Q4sN7kT0mV3xA6pR', datetime('now', '-9 hours')),
  ('cm09gGh8Ij9', 'F2gJ5lS8dO1wE4rT', datetime('now', '-20 hours')),
  ('cm10kKl0Mn1', 'Z5xV8nB1mK4pH7cQ', datetime('now', '-4 days'));

UPDATE comments
SET like_count = (
  SELECT COUNT(*) FROM comment_likes WHERE comment_likes.comment_id = comments.id
);

-- An established DM room between alice and bob (history survives dm_enabled flips).
INSERT OR IGNORE INTO chat_rooms (
  id, kind, pair_key, created_by, created_at, last_message_at
) VALUES (
  'room_alice_bob', 'dm', '2Vt9Lm4Qx7Nc1RsA|7Kp3nZ8QaM2wX5Rc',
  '2Vt9Lm4Qx7Nc1RsA', datetime('now', '-2 days'), datetime('now', '-1 day')
);
INSERT OR IGNORE INTO chat_room_members (
  room_id, user_id, role, membership_status, joined_at, last_read_at
) VALUES
  ('room_alice_bob', '7Kp3nZ8QaM2wX5Rc', 'member', 'active', datetime('now', '-2 days'), NULL),
  ('room_alice_bob', '2Vt9Lm4Qx7Nc1RsA', 'owner', 'active', datetime('now', '-2 days'), datetime('now', '-1 day'));
INSERT OR IGNORE INTO chat_requests (
  id, room_id, from_user_id, to_user_id, opener_body, status, created_at, responded_at
) VALUES (
  'req_alice_bob', 'room_alice_bob', '2Vt9Lm4Qx7Nc1RsA', '7Kp3nZ8QaM2wX5Rc',
  '첫 메시지 보내 봅니다!', 'accepted', datetime('now', '-2 days'), datetime('now', '-2 days')
);
INSERT OR IGNORE INTO chat_messages (
  id, room_id, sender_id, body, delivery_status, created_at
) VALUES
  ('msg_01', 'room_alice_bob', '2Vt9Lm4Qx7Nc1RsA', '첫 메시지 보내 봅니다!', 'delivered', datetime('now', '-2 days')),
  ('msg_02', 'room_alice_bob', '7Kp3nZ8QaM2wX5Rc', '오 실시간 잘 오네요.', 'delivered', datetime('now', '-2 days')),
  ('msg_03', 'room_alice_bob', '2Vt9Lm4Qx7Nc1RsA', '내일 인덱스 이야기 정리해 올게요.', 'delivered', datetime('now', '-1 day'));

-- A notification for alice so the inbox is not empty.
INSERT OR IGNORE INTO notifications (
  id, user_id, actor_id, kind, title, body, href, post_id, is_read, created_at
) VALUES (
  'ntf_01', '7Kp3nZ8QaM2wX5Rc', '2Vt9Lm4Qx7Nc1RsA', 'comment_on_post',
  'bob님이 내 글에 댓글을 남겼습니다', 'D1 마이그레이션은 어떻게 관리하고 계신가요?',
  '/post/k7Qm2xR9pLw', 'k7Qm2xR9pLw', 0, datetime('now', '-110 minutes')
);

-- Moderation fixtures.
INSERT OR IGNORE INTO banned_words (id, word, severity, created_by) VALUES
  ('bw_spam1', '무료 충전', 'shadow', '7Kp3nZ8QaM2wX5Rc'),
  ('bw_spam2', 'airdrop deal', 'block', '7Kp3nZ8QaM2wX5Rc');

-- Feature flags and quotas for local development.
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('site_name', 'sokdak'),
  ('dm_enabled', 'true'),
  ('registration_open', 'true'),
  ('min_account_age_hours_to_post', '0'),
  ('max_posts_per_hour', '10'),
  ('max_comments_per_hour', '30'),
  ('max_dm_requests_per_hour', '5'),
  ('max_dm_messages_per_hour', '60');

UPDATE "user" SET createdAt = datetime('now', '-400 days') WHERE id = '7Kp3nZ8QaM2wX5Rc';
UPDATE "user" SET createdAt = datetime('now', '-30 days') WHERE id = '2Vt9Lm4Qx7Nc1RsA';
UPDATE "user" SET createdAt = datetime('now', '-120 days') WHERE id = 'H6sP0dK3wZ8mB2yQ';
UPDATE "user" SET createdAt = datetime('now', '-14 days') WHERE id = '9Aa4Cc7Ee1Gg3IiK';
UPDATE "user" SET createdAt = datetime('now', '-220 days') WHERE id = 'L2nR5tY8uW1qE4oP';
UPDATE "user" SET createdAt = datetime('now', '-3 days') WHERE id = 'B7vD0fH3jL6zX9cM';
UPDATE "user" SET createdAt = datetime('now', '-90 days') WHERE id = 'Q4sN7kT0mV3xA6pR';
UPDATE "user" SET createdAt = datetime('now', '-60 days') WHERE id = 'E8rU1iO4aS7dF0gH';
UPDATE "user" SET createdAt = datetime('now', '-45 days'), preferredLanguage = 'en' WHERE id = 'W3yC6bN9hK2lP5vX';
UPDATE "user" SET createdAt = datetime('now', '-18 days') WHERE id = 'M0qR3tY6uI9oA2sD';
UPDATE "user" SET createdAt = datetime('now', '-7 days') WHERE id = 'Z5xV8nB1mK4pH7cQ';
UPDATE "user" SET createdAt = datetime('now', '-150 days') WHERE id = 'F2gJ5lS8dO1wE4rT';
UPDATE "user" SET createdAt = datetime('now', '-80 days') WHERE id = 'A9cD2fG5hJ8kL1zX';
UPDATE "user" SET createdAt = datetime('now', '-1 day') WHERE id = 'P6qW9eR2tY5uI8oA';

-- Local fixtures represent completed profile setup.
UPDATE "user" SET onboardingComplete = 1 WHERE email LIKE '%@example.local';

-- Dev social identities for allowlisted E2E session setup.
INSERT OR IGNORE INTO account (
  id, accountId, providerId, userId, createdAt, updatedAt
) VALUES
  (
    'acc_alice_kakao',
    'e2e_alice',
    'kakao',
    '7Kp3nZ8QaM2wX5Rc',
    datetime('now'),
    datetime('now')
  ),
  (
    'acc_bob_kakao',
    'e2e_bob',
    'kakao',
    '2Vt9Lm4Qx7Nc1RsA',
    datetime('now'),
    datetime('now')
  );
