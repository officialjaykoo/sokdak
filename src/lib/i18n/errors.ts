import type { Locale } from "@/lib/i18n/config";

/**
 * Canonical English AuthError / API messages → localized copy.
 * Keep AuthError.message in English (stable key); translate at response / display time.
 */
const ERROR_CATALOG: Record<
  string,
  { en: string; ko?: string }
> = {
  KOE004: {
    en: "Kakao Login is not enabled for this app. Enable Kakao Login in Kakao Developers and try again.",
    ko: "이 앱의 카카오 로그인이 활성화되지 않았습니다. Kakao Developers에서 카카오 로그인을 켠 후 다시 시도하세요.",
  },
  KOE205: {
    en: "Kakao rejected a requested profile item. Enable nickname and profile image in Kakao Developers; email is optional.",
    ko: "카카오가 요청한 프로필 항목을 거부했습니다. Kakao Developers에서 닉네임과 프로필 사진을 활성화하세요. 이메일은 선택 사항입니다.",
  },
  "Sign in to continue": {
    en: "Sign in to continue",
  },
  "This account can't do that": {
    en: "This account can't do that",
  },
  "Complete onboarding before continuing": {
    en: "Complete profile setup before continuing",
    ko: "계속하려면 프로필 설정을 완료하세요",
  },
  "Request failed": {
    en: "Request failed",
  },
  "Something went wrong": {
    en: "Something went wrong",
  },
  "This content isn't allowed": {
    en: "This content isn't allowed",
    ko: "허용되지 않는 내용입니다",
  },
  "You're doing that too often. Try again later.": {
    en: "You're doing that too often. Try again later.",
    ko: "요청이 너무 많습니다. 나중에 다시 시도해 주세요.",
  },
  "You're doing that too fast. Slow down.": {
    en: "You're doing that too fast. Slow down.",
    ko: "너무 빠르게 요청했습니다. 잠시 기다려 주세요.",
  },
  "Too many requests from this network.": {
    en: "Too many requests from this network.",
    ko: "이 네트워크에서 요청이 너무 많습니다.",
  },
  "Too many API requests. Try again later.": {
    en: "Too many API requests. Try again later.",
    ko: "API 요청이 너무 많습니다. 나중에 다시 시도해 주세요.",
  },
  "User not found": {
    en: "User not found",
    ko: "사용자를 찾을 수 없습니다",
  },
  "Post not found": {
    en: "Post not found",
  },
  "Comment not found": {
    en: "Comment not found",
  },
  "Community not found": {
    en: "Community not found",
  },
  "Subreddit not found": {
    en: "Subreddit not found",
  },
  "Chat not found": {
    en: "Chat not found",
    ko: "대화를 찾을 수 없습니다",
  },
  "Request not found": {
    en: "Request not found",
    ko: "요청을 찾을 수 없습니다",
  },
  "Not found": {
    en: "Not found",
  },
  "Direct messages are disabled": {
    en: "Direct messages are disabled",
    ko: "현재 쪽지 기능이 꺼져 있습니다",
  },
  "You can't message this user": {
    en: "You can't message this user",
    ko: "이 사용자에게 메시지를 보낼 수 없습니다",
  },
  "Interaction blocked": {
    en: "Interaction blocked",
    ko: "상호작용이 차단되었습니다",
  },
  "You can't message yourself": {
    en: "You can't message yourself",
    ko: "자기 자신에게 메시지를 보낼 수 없습니다",
  },
  "This user isn't accepting chat requests": {
    en: "This user isn't accepting chat requests",
    ko: "이 사용자는 대화 요청을 받지 않습니다",
  },
  "Message must be 1–2000 characters": {
    en: "Message must be 1–2000 characters",
    ko: "메시지는 1–2000자여야 합니다",
  },
  "Message must be 1–4000 characters": {
    en: "Message must be 1–4000 characters",
    ko: "메시지는 1–4000자여야 합니다",
  },
  "Chat already exists": {
    en: "Chat already exists",
    ko: "이미 대화가 존재합니다",
  },
  "A chat request is already pending": {
    en: "A chat request is already pending",
    ko: "대화 요청이 이미 처리 대기 중입니다",
  },
  "Request already handled": {
    en: "Request already handled",
    ko: "대화 요청은 이미 처리되었습니다",
  },
  "Chat isn't open yet": {
    en: "Chat isn't open yet",
    ko: "아직 대화를 시작할 수 없습니다",
  },
  "Display name is required": {
    en: "Display name is required",
  },
  "Username is required": {
    en: "Username is required",
    ko: "사용자 이름을 입력하세요",
  },
  "Username must be 3–24 letters, numbers, or underscores": {
    en: "Username must be 3–24 letters, numbers, or underscores",
    ko: "사용자 이름은 영문, 숫자 또는 밑줄 3–24자여야 합니다",
  },
  "Username already in use": {
    en: "Username already in use",
    ko: "이미 사용 중인 사용자 이름입니다",
  },
  "Username is reserved": {
    en: "This username is temporarily reserved",
    ko: "이 사용자 이름은 현재 임시로 예약되어 있습니다",
  },
  "Username change is on cooldown": {
    en: "You can’t change your username yet",
    ko: "아직 사용자 이름을 변경할 수 없습니다",
  },
  "Complete onboarding before changing username": {
    en: "Complete profile setup before changing your username",
    ko: "사용자 이름을 변경하기 전에 프로필 설정을 완료하세요",
  },
  "Username change could not be completed": {
    en: "Could not change username. Try again.",
    ko: "사용자 이름을 변경하지 못했습니다. 다시 시도하세요.",
  },
  "Onboarding already complete": {
    en: "Profile setup is already complete",
    ko: "프로필 설정이 이미 완료되었습니다",
  },
  "Onboarding language is required": {
    en: "Choose a language to continue",
    ko: "계속하려면 언어를 선택하세요",
  },
  "Onboarding fields are required": {
    en: "Name, username, and language are required",
    ko: "이름, 사용자 이름과 언어를 입력하세요",
  },
  "Invalid contact email": {
    en: "Enter a valid contact email",
    ko: "유효한 연락 이메일을 입력하세요",
  },
  "contactEmail is required": {
    en: "Contact email must be provided as text",
    ko: "연락 이메일은 문자열이어야 합니다",
  },
  "Invalid theme": {
    en: "Invalid theme",
  },
  "Invalid language": {
    en: "Invalid language",
  },
  "Invalid DM preference": {
    en: "Invalid DM preference",
  },
  "You can't block yourself": {
    en: "You can't block yourself",
  },
  "You can't follow yourself": {
    en: "You can't follow yourself",
  },
  "Can't follow this user": {
    en: "Can't follow this user",
  },
  "Invalid report reason": {
    en: "Invalid report reason",
  },
  "You can't report your own post": {
    en: "You can't report your own post",
  },
  "You can't report yourself": {
    en: "You can't report yourself",
  },
  "You can't report your own comment": {
    en: "You can't report your own comment",
  },
  "You already reported this": {
    en: "You already reported this",
  },
  "Warning message required": {
    en: "Warning message required",
  },
  "Word too short": {
    en: "Word too short",
  },
  "Invalid severity": {
    en: "Invalid severity",
  },
  "Word already banned": {
    en: "Word already banned",
  },
  "Title must be 3–300 characters": {
    en: "Title must be 3–300 characters",
  },
  "Title must be 3–100 characters": {
    en: "Title must be 3–100 characters",
  },
  "Invalid post payload": {
    en: "Invalid post payload",
    ko: "게시글 입력값이 올바르지 않습니다",
  },
  "Post body must be 20,000 characters or fewer": {
    en: "Post body must be 20,000 characters or fewer",
    ko: "게시글 본문은 20,000자 이하여야 합니다",
  },
  "Post URL must be 2,048 characters or fewer": {
    en: "Post URL must be 2,048 characters or fewer",
    ko: "게시글 URL은 2,048자 이하여야 합니다",
  },
  "Choose either a link or an image, not both": {
    en: "Choose either a link or an image, not both",
  },
  "Invalid URL": {
    en: "Invalid URL",
  },
  "Invalid media": {
    en: "Invalid media",
  },
  "Invalid profile payload": {
    en: "Invalid profile payload",
    ko: "프로필 입력값이 올바르지 않습니다",
  },
  "Invalid profile image": {
    en: "Invalid profile image",
    ko: "프로필 이미지가 올바르지 않습니다",
  },
  "Could not link account": {
    en: "Could not link account",
    ko: "계정을 연결할 수 없습니다",
  },
  "Invalid profile tab": {
    en: "Invalid profile tab",
    ko: "프로필 탭이 올바르지 않습니다",
  },
  "Failed to load profile activity": {
    en: "Failed to load profile activity",
    ko: "프로필 활동을 불러오지 못했습니다",
  },
  "Invalid settings payload": {
    en: "Invalid settings payload",
    ko: "설정 입력값이 올바르지 않습니다",
  },
  "Comment must be 1–10000 characters": {
    en: "Comment must be 1–10000 characters",
  },
  "Post is locked": {
    en: "Post is locked",
  },
  "Parent comment not found": {
    en: "Parent comment not found",
  },
  "Comment nesting too deep": {
    en: "Comment nesting too deep",
  },
  "Only the author can delete this post": {
    en: "Only the author can delete this post",
    ko: "작성자만 이 글을 삭제할 수 있습니다",
  },
  "Only the author can delete this comment": {
    en: "Only the author can delete this comment",
    ko: "작성자만 이 댓글을 삭제할 수 있습니다",
  },
  "Post has comments and cannot be deleted": {
    en: "Post has comments and cannot be deleted",
    ko: "댓글이 있는 글은 삭제할 수 없습니다",
  },
  "Comment has replies and cannot be deleted": {
    en: "Comment has replies and cannot be deleted",
    ko: "답글이 있는 댓글은 삭제할 수 없습니다",
  },
  "Only the author can edit this post": {
    en: "Only the author can edit this post",
  },
  "Only the author can edit this comment": {
    en: "Only the author can edit this comment",
  },
  "Community name must be at least 3 characters": {
    en: "Community name must be at least 3 characters",
  },
  "Community name already taken": {
    en: "Community name already taken",
  },
  "Name required": {
    en: "Name required",
  },
  "Invalid target URL": {
    en: "Invalid target URL",
  },
  "You don't have permission to do that": {
    en: "You don't have permission to do that",
  },
  "Image must be under 1 MB": {
    en: "Image must be under 1 MB",
  },
  "Image must be under 1 MB after processing": {
    en: "Image must be under 1 MB after processing",
  },
  "Image must be under 1 MB after compression": {
    en: "Image must be under 1 MB after compression",
  },
  "Only JPEG, PNG, or WebP images are allowed": {
    en: "Only JPEG, PNG, or WebP images are allowed",
  },
  "Image failed security check": {
    en: "Image failed security check",
  },
  "Image contains trailing dangerous data": {
    en: "Image contains trailing dangerous data",
  },
  "Corrupt JPEG image": {
    en: "Corrupt JPEG image",
  },
  "Corrupt PNG image": {
    en: "Corrupt PNG image",
  },
  "Corrupt WebP image": {
    en: "Corrupt WebP image",
  },
  "Invalid image": {
    en: "Invalid image",
  },
  "Nothing to mark read": {
    en: "Nothing to mark read",
  },
  "Failed to load": {
    en: "Failed to load",
  },
  "Failed to save": {
    en: "Failed to save",
  },
  Failed: {
    en: "Failed",
  },
  "Upload failed": {
    en: "Upload failed",
  },
  "file is required": {
    en: "file is required",
  },
  "section is required": {
    en: "section is required",
  },
  "Unknown section": {
    en: "Unknown section",
  },
  "Unknown action": {
    en: "Unknown action",
  },
  "Unknown op": {
    en: "Unknown op",
  },
  "Missing fields": {
    en: "Missing fields",
  },
  "Missing userId": {
    en: "Missing userId",
  },
  "Missing subredditId": {
    en: "Missing subredditId",
  },
  "Missing wordId": {
    en: "Missing wordId",
  },
  "Admin action failed": {
    en: "Admin action failed",
  },
  "Failed to load admin overview": {
    en: "Failed to load admin overview",
  },
  "preferredLanguage must be one of ko or en": {
    en: "preferredLanguage must be one of ko or en",
    ko: "언어는 ko 또는 en 중 하나여야 합니다",
  },
  "Could not update language": {
    en: "Could not update language",
  },
  "Could not save profile": {
    en: "Could not save profile",
  },
  "Could not save": {
    en: "Could not save",
  },
  Saved: {
    en: "Saved",
  },
  "Could not post comment": {
    en: "Could not post comment",
  },
  "Couldn't update membership": {
    en: "Couldn't update membership",
  },
  "Couldn't load more posts.": {
    en: "Couldn't load more posts.",
  },
  "Failed to load more posts": {
    en: "Failed to load more posts",
  },
  "Edit failed": {
    en: "Edit failed",
  },
  "Delete failed": {
    en: "Delete failed",
  },
  "Delete this post?": {
    en: "Delete this post?",
  },
  "Action failed": {
    en: "Action failed",
  },
  "Backfill failed": {
    en: "Backfill failed",
  },
  "Could not generate avatar": {
    en: "Could not generate avatar",
  },
  "Couldn't load messages": {
    en: "Couldn't load messages",
  },
  "Couldn't load chat": {
    en: "Couldn't load chat",
  },
  "Couldn't send request": {
    en: "Couldn't send request",
  },
  "Couldn't update request": {
    en: "Couldn't update request",
  },
  "Couldn't send": {
    en: "Couldn't send",
  },
  "Failed to load chat": {
    en: "Failed to load chat",
  },
  "Failed to send message": {
    en: "Failed to send message",
  },
  "Failed to update request": {
    en: "Failed to update request",
  },
  "Failed to load messages": {
    en: "Failed to load messages",
  },
  "Failed to start chat": {
    en: "Failed to start chat",
  },
  "Failed to load feed": {
    en: "Failed to load feed",
  },
  "Failed to create post": {
    en: "Failed to create post",
  },
  "Failed to edit post": {
    en: "Failed to edit post",
  },
  "Failed to delete post": {
    en: "Failed to delete post",
  },
  "Failed to edit comment": {
    en: "Failed to edit comment",
  },
  "Failed to delete comment": {
    en: "Failed to delete comment",
  },
  "Failed to load community": {
    en: "Failed to load community",
  },
  "Failed to join community": {
    en: "Failed to join community",
  },
  "Failed to leave community": {
    en: "Failed to leave community",
  },
  "Could not submit report": {
    en: "Could not submit report",
  },
  "Could not unhide post": {
    en: "Could not unhide post",
  },
  "subreddit and title are required": {
    en: "subreddit and title are required",
  },
  "toUsername and body are required": {
    en: "toUsername and body are required",
  },
  "action must be accept or decline": {
    en: "action must be accept or decline",
  },
  "body is required": {
    en: "body is required",
  },
  "Invalid limit": {
    en: "Invalid limit",
  },
  "Invalid cursor": {
    en: "Invalid cursor",
  },
  "Invalid sort": {
    en: "Invalid sort",
  },
  "Invalid feed mode": {
    en: "Invalid feed mode",
  },
  "Missing post id": {
    en: "Missing post id",
  },
  "Could not hide post": {
    en: "Could not hide post",
  },
  "Failed to load post": {
    en: "Failed to load post",
  },
  "reason is required": {
    en: "reason is required",
  },
  "Search failed": {
    en: "Search failed",
  },
  "Failed to create comment": {
    en: "Failed to create comment",
  },
  "Failed to create community": {
    en: "Failed to create community",
  },
  "Failed to list communities": {
    en: "Failed to list communities",
  },
  "Failed to load recommendations": {
    en: "Failed to load recommendations",
  },
  "name and title are required": {
    en: "name and title are required",
  },
};

function genericError(locale: Locale): string {
  switch (locale) {
        case "ko":
      return "문제가 발생했습니다";
    default:
      return "Something went wrong";
  }
}

function normalizeKey(message: string): string {
  return message
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .trim();
}

export function localizeErrorMessage(
  message: string,
  locale: Locale,
  fallback?: string
): string {
  const key = normalizeKey(message);
  const entry = ERROR_CATALOG[key];
  if (entry) return entry[locale] ?? genericError(locale);

  // Policy / infra sanitization (mirror public-error rules)
  if (/banned words/i.test(key)) {
    return genericError(locale);
  }
  if (/shadow/i.test(key)) {
    return genericError(locale);
  }
  if (/rate limit/i.test(key)) {
    return genericError(locale);
  }
  if (
    /sql|d1|sqlite|workers ai|durable object|r2|wrangler/i.test(key)
  ) {
    return genericError(locale);
  }

  return fallback ?? genericError(locale);
}
