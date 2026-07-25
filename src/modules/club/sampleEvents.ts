/**
 * sampleEvents — template Hangouts events shown when no real events exist in
 * Firestore yet, so the whole browse → detail → book → ticket flow works out of
 * the box. Booking a sample event still creates a REAL ticket for the user
 * (purchaseTicket just records the ticket; it doesn't require the event doc to
 * exist server-side), so it shows up in "My Tickets" like any other.
 */
import { Event } from './types';

const now = Date.now();
const day = 86_400_000;
const at = (days: number, hour = 19) => {
  const d = new Date(now + days * day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const img = (seed: string) => `https://picsum.photos/seed/${seed}/900/600`;

export const SAMPLE_EVENTS: Event[] = [
  {
    id: 'evt-chefs-table',
    creatorId: 'host-kavya',
    title: "Chef's Table at Karavalli",
    description:
      'An elegant high-tea experience designed for meaningful connections. Meet like-minded women ' +
      'in a relaxed, sea-facing setting and enjoy curated conversations with entrepreneurs, artists ' +
      'and founders. Refreshments provided; the venue is wheelchair accessible.',
    coverUrl: img('chefstable'),
    location: 'Copper Chimney, Chennai',
    startDate: at(6, 20),
    endDate: at(6, 23),
    ticketTypes: [
      { id: 'tt-member',  name: 'Member Ticket',  price: 4000, capacity: 60, sold: 48, description: 'Dinner + welcome drink' },
      { id: 'tt-guest',   name: 'Guest Ticket',   price: 4500, capacity: 20, sold: 6,  description: 'Bring a +1' },
    ],
    attendeeCount: 48,
    createdAt: at(-12),
  },
  {
    id: 'evt-morning-flow',
    creatorId: 'host-baehive',
    title: 'Morning Mindfulness & Flow',
    description: 'Start your Saturday with guided breathwork and a gentle vinyasa flow, followed by chai and journaling.',
    coverUrl: img('mindfulflow'),
    location: 'The Baehive Studio, Sector 5',
    startDate: at(10, 8),
    endDate: at(10, 10),
    ticketTypes: [
      { id: 'tt-flow', name: 'Class Pass', price: 800, capacity: 30, sold: 22, description: 'Mat + chai included' },
    ],
    attendeeCount: 22,
    createdAt: at(-8),
  },
  {
    id: 'evt-floral-workshop',
    creatorId: 'host-bloom',
    title: 'Floral Arrangement Workshop',
    description: 'Hands-on workshop with a florist — build your own seasonal bouquet to take home.',
    coverUrl: img('floral'),
    location: 'Botanica Café & Garden',
    startDate: at(12, 17),
    endDate: at(12, 19),
    ticketTypes: [
      { id: 'tt-flower', name: 'Workshop Ticket', price: 1500, capacity: 18, sold: 9, description: 'All materials included' },
    ],
    attendeeCount: 9,
    createdAt: at(-6),
  },
  {
    id: 'evt-music-night',
    creatorId: 'host-musichive',
    title: 'Music Night',
    description: 'An intimate acoustic evening with indie artists, open mic slots and great company.',
    coverUrl: img('musicnight'),
    location: 'The Loft, Mumbai',
    startDate: at(3, 20),
    endDate: at(3, 23),
    ticketTypes: [
      { id: 'tt-ga',   name: 'General',  price: 600,  capacity: 120, sold: 84, description: 'Standing' },
      { id: 'tt-vip',  name: 'Front Row', price: 1200, capacity: 20,  sold: 15, description: 'Reserved seating' },
    ],
    attendeeCount: 99,
    createdAt: at(-5),
  },
  {
    id: 'evt-culinary-fest',
    creatorId: 'host-foodhive',
    title: 'Culinary Fest',
    description: 'A pop-up food festival with 20+ home chefs, tastings and a cook-off you can join.',
    coverUrl: img('culinary'),
    location: 'Jayamahal Grounds, Bangalore',
    startDate: at(18, 12),
    endDate: at(18, 22),
    ticketTypes: [
      { id: 'tt-entry',  name: 'Entry Pass',   price: 350,  capacity: 500, sold: 210, description: 'Entry only' },
      { id: 'tt-taste',  name: 'Tasting Pass', price: 999,  capacity: 200, sold: 88,  description: 'Entry + 10 tastings' },
    ],
    attendeeCount: 298,
    createdAt: at(-4),
  },
  {
    id: 'evt-yoga-session',
    creatorId: 'host-wellnesshive',
    title: 'Sunset Yoga Session',
    description: 'Beachside yoga as the sun goes down, led by a certified instructor. All levels welcome.',
    coverUrl: img('yoga'),
    location: 'Marina Sands, Chennai',
    startDate: at(8, 17),
    endDate: at(8, 19),
    ticketTypes: [
      { id: 'tt-yoga', name: 'Drop-in', price: 500, capacity: 40, sold: 12, description: 'Mat provided' },
    ],
    attendeeCount: 12,
    createdAt: at(-3),
  },
];
