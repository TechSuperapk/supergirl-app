export type PostType = 'text' | 'image' | 'video';
export type TicketStatus = 'active' | 'used' | 'expired';

export interface Post {
  id:        string;
  authorId:  string;
  authorName: string;
  authorAvatar?: string;
  content:   string;
  mediaUrls: string[];
  type:      PostType;
  hashtags:  string[];
  mentions:  string[];
  likes:     string[];     // userIds
  saves:     string[];
  commentCount: number;
  groupId?:  string;       // set when from a group
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id:        string;
  postId:    string;
  authorId:  string;
  authorName: string;
  authorAvatar?: string;
  content:   string;
  likes:     string[];
  replies:   Reply[];
  createdAt: string;
}

export interface Reply {
  id:        string;
  commentId: string;
  authorId:  string;
  authorName: string;
  content:   string;
  likes:     string[];
  createdAt: string;
}

export interface TicketType {
  id:          string;
  name:        string;
  price:       number;
  capacity:    number;
  sold:        number;
  description?: string;
}

export interface Event {
  id:           string;
  creatorId:    string;
  title:        string;
  description:  string;
  coverUrl?:    string;
  location:     string;
  startDate:    string;
  endDate:      string;
  ticketTypes:  TicketType[];
  attendeeCount: number;
  createdAt:    string;
}

export interface Ticket {
  id:           string;
  userId:       string;
  eventId:      string;
  eventTitle:   string;
  ticketTypeId: string;
  ticketTypeName: string;
  qrToken:      string;
  status:       TicketStatus;
  purchasedAt:  string;
}

export interface Group {
  id:          string;
  name:        string;
  description: string;
  coverUrl?:   string;
  creatorId:   string;
  memberCount: number;
  isPrivate:   boolean;
  createdAt:   string;
}

export interface GroupMessage {
  id:        string;
  groupId:   string;
  senderId:  string;
  senderName: string;
  senderAvatar?: string;
  content:   string;
  mediaUrl?: string;
  createdAt: string;
}
