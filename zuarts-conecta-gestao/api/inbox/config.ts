export const INBOX = {
  path: "/api/inbox",
  conversations: { defaultLimit: 50, maxLimit: 100 },
  messages: { defaultLimit: 200, maxLimit: 500 },
} as const;
