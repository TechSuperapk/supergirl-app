// ─────────────────────────────────────────────────────────────────────────────
// SuperGirl — Navigation Type Definitions
// Single source of truth for all route param lists
// ─────────────────────────────────────────────────────────────────────────────

// ── Main app top tabs ─────────────────────────────────────────────────────────
export type MainTabParamList = {
  Journal:   undefined;
  Fits:      undefined;
  Trackers:  undefined;
  Profile:   undefined;
};

// ── Club stack ────────────────────────────────────────────────────────────────
export type ClubFeedStackParamList = {
  ClubFeed:     undefined;
  PostDetail:   { postId: string };
  CreatePost:   { groupId?: string };
  Hashtag:      { tag: string };
  UserProfile:  { userId: string };
};

export type ClubEventsStackParamList = {
  EventsList:   undefined;
  EventDetail:  { eventId: string };
  CreateEvent:  undefined;
  Ticket:       { ticketId: string };
};

export type ClubGroupsStackParamList = {
  GroupsList:   undefined;
  GroupDetail:  { groupId: string };
  GroupChat:    { groupId: string };
  GroupFeed:    { groupId: string };
};

export type ClubTicketsStackParamList = {
  MyTickets:    undefined;
  TicketDetail: { ticketId: string };
};

// ── Journal stack (existing — keep compatible) ────────────────────────────────
export type JournalStackParamList = {
  Journal:      undefined;
  WriteEntry:   { entryId?: string };
  EntryDetail:  { entryId: string };
  Scribble:     { entryId?: string };
  Stats:        undefined;
};

export type PrivateStackParamList = {
  PrivateVault:      undefined;
  SecurityQuestion:  undefined;
  PINSetup:          undefined;
  ChangePIN:         undefined;
  ForgotPIN:         undefined;
  PrivateJournal:    undefined;
};

// ── Fits stack ────────────────────────────────────────────────────────────────
export type FitsHomeStackParamList = {
  FitsHome:         undefined;
  AISuggestions:    undefined;
};

export type FitsPlannerStackParamList = {
  WeeklyPlanner:    undefined;
  CalendarPlanner:  undefined;
};

export type FitsOutfitsStackParamList = {
  OutfitsList:      undefined;
  OutfitDetail:     { outfitId: string };
  OutfitBuilder:    { outfitId?: string };
};

export type FitsWardrobeStackParamList = {
  WardrobeHome:     undefined;
  AddClothing:      { itemId?: string };
  ClothingDetail:   { itemId: string };
  AvatarBuilder:    undefined;
};

// ── Trackers stack ────────────────────────────────────────────────────────────
export type TrackersHomeStackParamList = {
  TrackersHome:     undefined;
  MoodTracker:      undefined;
  SleepTracker:     undefined;
  HabitTracker:     undefined;
  PeriodTracker:    undefined;
  HealthTracker:    undefined;
  ExpenseTracker:   undefined;
};

export type TrackersInsightsStackParamList = {
  InsightsDashboard: undefined;
  AIInsights:        undefined;
};

export type TrackersProgressStackParamList = {
  Progress:          undefined;
};

export type TrackersMilestonesStackParamList = {
  Milestones:        undefined;
  BadgeDetail:       { milestoneId: string };
};

// ── Profile / Boards stack ────────────────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileMain:        undefined;
  EditProfile:        undefined;
  Notifications:      undefined;
  PrivacySettings:    undefined;
  Subscription:       undefined;
  HelpCenter:         undefined;
  BackupSettings:     undefined;
  Trash:              undefined;
  // Boards nested
  BoardsHome:         undefined;
  BoardDetail:        { boardId: string };
  CreateBoard:        undefined;
  BoardEditor:        { boardId: string };
};
