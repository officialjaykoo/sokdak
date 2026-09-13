좋습니다. **속닥속닥은 VTH를 기반으로 새 제품을 만드는 sibling fork**로 정의하겠습니다.

핵심은 이겁니다.

> **VTH의 검증된 인프라를 가져오고 → VTH 제품 기능은 대부분 제거 → GNU7의 한국형 게시판 구조를 VTH 방식으로 재구현 → Jard식 게시글 단위 익명 ID를 넣는다.**

코드를 세 프로젝트에서 난잡하게 합치는 방식은 하지 않습니다.

# 속닥속닥 제품 정의

**한 줄 정의**

> 소셜 계정으로 가입하지만, 이야기할 때는 익명인 한국형 소셜 커뮤니티.

초기에는 에브리타임/블라인드처럼 복잡한 소속 인증까지 가지 않습니다.

```text
카카오 / 네이버 / Google 로그인
              ↓
          실제 user.id
              ↓
      속닥속닥에서는 익명
              ↓
게시글마다
글쓴이 / 익명1 / 익명2 / 익명3
```

즉 세 identity를 분리합니다.

```text
Login Identity
카카오/네이버/Google
       ↓
Canonical Identity
user.id
       ↓
Public Anonymous Identity
글쓴이 / 익명N
```

이게 프로젝트의 가장 중요한 invariant입니다.

---

# Phase 0 — VTH Fork

새 repo를 만듭니다.

```text
officialjaykoo/viet-tai-han
          ↓
officialjaykoo/sokdak
```

제품명:

**속닥속닥**

코드명/repo는 짧게:

**`sokdak`**

추천합니다.

이 시점에는 기능 추가를 하지 않습니다.

---

# Phase 1 — VTH를 뼈대까지 깎기

여기가 중요합니다.

VTH를 그대로 두고 새 UI만 씌우면 실패합니다.

### 남길 것

```text
Next.js
OpenNext
Cloudflare Workers
D1
R2
Better Auth 기반
user.id identity
API security
rate limiting
Turnstile / anti-abuse
notifications 기반
reports / moderation 기반
block 기반
admin 기반
migration 체계
Vitest
Playwright
CI
배포/runbook
```

현재 VTH에서 가장 가치 있는 자산입니다.

### 제거할 것

```text
Vietnam/Korea 특화 product copy
Vietnamese-first localization
Marketplace
Businesses
Business booking
Q&A 전용 시스템
Follow
Friendship
Presence
Recommendation 사용자 그래프
VTH communities 구조 중 불필요한 부분
VTH developer/product branding
베트남 생활 seed data
```

DM은 **삭제하지 않고 처음에는 비활성화**하는 편이 좋습니다.

익명 DM이 나중에 속닥속닥의 중요한 차별점이 될 가능성이 있기 때문입니다.

결과는 대략:

```text
User
Board
Post
Comment
Like
Report
Block
Notification
Media
Admin
```

만 남습니다.

**Phase 1 목표는 기능 추가가 아니라 코드 감소입니다.**

---

# Phase 2 — GNU7식 Board 시스템

GNU7 backend를 가져오는 게 아닙니다.

**한국형 게시판 개념을 속닥속닥의 Next.js + D1 구조로 다시 구현합니다.**

핵심 객체:

```text
boards
- id
- slug
- name
- description
- visibility
- posting_policy
- commenting_policy
- sort_order
- is_active

posts
- id
- board_id
- author_id
- title
- body
- created_at
- comment_count
- like_count
- view_count
- is_notice
- moderation_state

comments
- id
- post_id
- author_id
- parent_id
- body
- created_at
- like_count
- moderation_state
```

초기 게시판은 많이 만들 필요 없습니다.

```text
전체
실시간
인기

자유
고민
연애
직장
인간관계
돈
지역
아무말
```

GNU7에서 특히 참고할 것은:

**공지 / 게시판 권한 / 목록 밀도 / 검색 / 추천 / 댓글 / 관리 / 게시판별 정책**

입니다.

---

# Phase 3 — Jard식 익명 Identity

여기가 속닥속닥의 핵심 기능입니다.

게시글 #100에서:

```text
user_A = 글쓴이
user_B = 익명1
user_C = 익명2
user_B = 익명1
user_D = 익명3
```

게시글 #101에서는 다시:

```text
user_B = 익명2
user_C = 글쓴이
```

즉 **익명 번호는 게시글 안에서만 의미가 있습니다.**

중요한 것은 `익명1`을 사용자 profile로 만들지 않는 겁니다.

서버 내부에는 계속:

```text
comment.author_id = canonical user.id
```

가 존재합니다.

공개 projection에서만:

```text
anonymousAlias(postId, userId)
```

를 계산합니다.

### 보안 원칙

클라이언트에게 다음 값이 절대 내려가면 안 됩니다.

```text
author_id
provider_id
email
real username
stable anonymous hash
```

API 응답 단계에서 이미:

```text
authorRole: "OP"
```

또는

```text
authorAlias: "익명3"
```

으로 변환합니다.

프론트에서 `user_id`를 받아놓고 숨기는 식으로 만들면 안 됩니다.

---

# Phase 4 — 로그인

초기에는 아주 단순하게 갑니다.

```text
카카오
네이버
Google
```

웹 MVP에는 이 세 개면 충분합니다.

나중에 iOS native 앱을 만들면:

```text
Apple
```

추가.

Facebook은 속닥속닥 초기 대상에는 필요 없습니다.

그리고 VTH처럼:

```text
user.id
   ├─ kakao account
   ├─ naver account
   └─ google account
```

구조를 유지합니다.

소셜 제공자가 identity가 되어서는 안 됩니다.

---

# Phase 5 — 한국형 UX

여기서 에브리타임과 GNU7을 강하게 참고합니다.

홈 화면을 Facebook처럼 만들 필요 없습니다.

오히려:

```text
[실시간] [인기]

회사에서 나만 이런 대우 받냐       23
연애  ·  3분 전 · 공감 14

친구가 돈 빌려달라는데              41
인간관계 · 7분 전 · 공감 32

월급 400인데 서울 살기 힘들다       18
돈 · 12분 전 · 공감 11
```

정도로 **콘텐츠 밀도를 높이는 게 맞습니다.**

글 상세:

```text
직장

회사에서 나만 이런 대우 받냐

글쓴이
본문...

♡ 14   댓글 23   신고


익명1
그건 팀장이 이상한 것 같은데
  ♡ 5

익명2
앞 상황은 어떰?
  ♡ 2

글쓴이
지난주부터 계속 이랬음
  ♡ 8

익명1
그럼 거의 확실하네
```

이 화면 하나가 제품의 핵심입니다.

---

# Phase 6 — 익명 커뮤니티용 Safety

이건 후순위 기능이 아닙니다.

익명 서비스는 처음부터 필요합니다.

### 반드시 들어갈 것

```text
소셜 계정 필수
신규 계정 posting 제한
rate limit
댓글 flood 방지
신고
사용자 차단
게시글 숨김
관리자 삭제/정지
금칙어
반복 도배 탐지
media validation
게시물/댓글 audit trail
```

특히 중요한 것은:

> **사용자에게는 익명이지만 시스템에게는 익명이 아니다.**

완전 무책임 익명으로 만들지 않습니다.

다만 운영자도 평상시에는 identity를 쉽게 볼 수 없게 만드는 것이 좋습니다.

관리자 UX도:

```text
익명 사용자 #ab31...
```

정도로 보여주고, 실제 identity 조회는 별도 권한으로 분리하는 쪽까지 나중에 갈 수 있습니다.

---

# Phase 7 — MVP

첫 출시에는 이것만 있으면 됩니다.

| 영역  | MVP                    |
| --- | ---------------------- |
| 로그인 | Kakao / Naver / Google |
| 게시판 | 고정 board               |
| 글   | 작성/수정/삭제               |
| 댓글  | 댓글 + 1단 대댓글            |
| 익명  | 글쓴이 + 익명N              |
| 반응  | 공감                     |
| 피드  | 최신 / 인기                |
| 검색  | 제목+본문                  |
| 미디어 | 이미지                    |
| 안전  | 신고/차단/rate limit       |
| 운영  | admin                  |
| 알림  | 내 글 댓글, 내 댓글 답글        |

**DM, 소속 인증, 지역 인증, badge, 팔로우 같은 것은 MVP에서 빼겠습니다.**

---

# Phase 8 — 출시 후 1차 확장

실사용 데이터가 생긴 뒤에 결정합니다.

가장 유력한 것은 **익명 DM**입니다.

```text
게시글
글쓴이 ↔ 익명3

[대화 요청]
      ↓

익명 DM room
```

둘 다 서로 실제 identity를 모릅니다.

이게 성공하면 속닥속닥은 단순 게시판에서:

> **익명 social network**

로 넘어갑니다.

그다음 후보가 소속입니다.

```text
지역 인증
학교 인증
회사 인증
직업 인증
```

하지만 초기에 넣지 않습니다.

---

# 속닥속닥의 제품 발전 단계

제가 버전을 이렇게 잡겠습니다.

```text
v0.1
VTH fork + 대청소

v0.2
Board/Post/Comment 재구성

v0.3
게시글별 익명 identity

v0.4
Kakao/Naver/Google auth

v0.5
한국형 UI/인기글/검색

v0.6
신고/차단/moderation hardening

v0.7
E2E + production hardening

v0.8
Closed beta

v0.9
실사용 피드백 반영

v1.0
Public launch
```

## 여기서 GNU7/Jard의 위치

아주 중요합니다.

```text
GNU7 = donor가 아니라 reference
Jard = donor가 아니라 algorithm/reference
VTH = 실제 fork base
```

즉:

**VTH 80% 기반 + GNU7/Jard에서 좋은 설계만 VTH-native로 구현**

이라고 생각하면 됩니다.

세 repo를 merge하는 것은 아닙니다.

---

# 최종 아키텍처

```text
                    속닥속닥
                        │
                   Next.js UI
                        │
                Cloudflare Worker
                        │
        ┌───────────────┼──────────────┐
        │               │              │
       D1              R2        Durable Object
        │            images       (나중에 DM)
        │
 ┌──────┼──────────┐
 │      │          │
User   Board      Content
 │                 │
Auth             Post
                 Comment
                 Like
                 Report
                    │
              Anonymous
               Projection
                    │
        글쓴이 / 익명1 / 익명2
```

그리고 프로젝트에서 절대 놓치면 안 되는 원칙은 세 가지입니다.

> **① VTH를 최대한 먼저 줄인다.
> ② 익명성은 UI 기능이 아니라 서버 identity projection으로 만든다.
> ③ GNU7/Jard의 코드를 억지로 합치지 않고 좋은 패턴만 속닥속닥 방식으로 다시 구현한다.**

이렇게 가면 **VTH보다 범위는 훨씬 작고, 제품 정체성은 오히려 더 선명한 프로젝트**가 됩니다.
