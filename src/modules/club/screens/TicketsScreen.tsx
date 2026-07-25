import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMyTickets }  from '../hooks/useClub';
import { QRTicket }      from '../components/QRTicket';
import { AppText }       from '../../../shared/components/AppText';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Ticket }        from '../types';

// The grouping key for a booking: tickets bought together share bookingId;
// older tickets fall back to their own id (so they stay one-per-row).
const bookingKeyOf = (t: Ticket) => t.bookingId ?? t.id;

interface Booking { key: string; tickets: Ticket[]; head: Ticket; }

function groupBookings(tickets: Ticket[]): Booking[] {
  const map = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const k = bookingKeyOf(t);
    (map.get(k) ?? map.set(k, []).get(k)!).push(t);
  }
  return [...map.entries()].map(([key, ts]) => ({ key, tickets: ts, head: ts[0] }));
}

// ── MyTicketsScreen ───────────────────────────────────────────────────────────
type ListProps = NativeStackScreenProps<any, 'MyTickets'>;

export function MyTicketsScreen({ navigation }: ListProps) {
  const { myTickets, loading } = useMyTickets();

  // Group by booking, then order active bookings first.
  const bookings = useMemo(() => {
    const groups = groupBookings(myTickets);
    const isActive = (b: Booking) => b.tickets.some(t => t.status === 'active');
    return groups.sort((a, b) => Number(isActive(b)) - Number(isActive(a)));
  }, [myTickets]);

  const renderBooking = ({ item }: { item: Booking }) => {
    const t = item.head;
    const count = item.tickets.length;
    const active = item.tickets.some(x => x.status === 'active');
    return (
      <View style={s.ticketRowShadowWrap}>
        <TouchableOpacity
          style={s.ticketRow}
          onPress={() => navigation.navigate('TicketDetail', { bookingKey: item.key })}
          activeOpacity={0.85}
        >
          <View style={[s.statusStrip, { backgroundColor: active ? Colors.success : Colors.textLight }]} />
          <View style={s.ticketInfo}>
            <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>{t.eventTitle}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {t.ticketTypeName}{count > 1 ? ` · ${count} Tickets` : ''}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {new Date(t.purchasedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </AppText>
          </View>
          <View style={[s.statusBadge, { backgroundColor: active ? Colors.success + '15' : Colors.bgInput }]}>
            <AppText variant="caption" color={active ? Colors.success : Colors.textMuted} style={{ fontFamily: 'DMSans-Bold' }}>
              {active ? 'Valid' : 'Used'}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>My Tickets</AppText>
      </View>

      {loading ? (
        <AppLoadingSpinner fullscreen message="Loading tickets…" />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => b.key}
          renderItem={renderBooking}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <AppEmptyState emoji="🎟️" title="No tickets yet" subtitle="Browse events and grab your first ticket!" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── TicketDetailScreen ────────────────────────────────────────────────────────
type DetailProps = NativeStackScreenProps<any, 'TicketDetail'>;

export function TicketDetailScreen({ route, navigation }: DetailProps) {
  // Accepts a booking group (bookingKey) — or a single ticketId for back-compat.
  const params = route.params as { bookingKey?: string; ticketId?: string };
  const { myTickets } = useMyTickets();

  const tickets = useMemo(() => {
    if (params.bookingKey) return myTickets.filter(t => bookingKeyOf(t) === params.bookingKey);
    const one = myTickets.find(t => t.id === params.ticketId);
    return one ? myTickets.filter(t => bookingKeyOf(t) === bookingKeyOf(one)) : [];
  }, [myTickets, params.bookingKey, params.ticketId]);

  const [index, setIndex] = useState(0);

  if (!tickets.length) return <AppLoadingSpinner fullscreen />;
  const i = Math.min(index, tickets.length - 1);
  const ticket = tickets[i];
  const count = tickets.length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AppText variant="body" color={Colors.primary}>‹ Back</AppText>
        </TouchableOpacity>
        <AppText variant="headingSmall" color={Colors.textPrimary}>Ticket</AppText>
        <View style={{ width: 64 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
          <AppText variant="caption" color={Colors.textMuted}>
            {count > 1 ? `${count} Tickets` : '1 Ticket'} · Booking id: {ticket.bookingId ?? ticket.id.slice(0, 10)}
          </AppText>
        </View>

        <QRTicket ticket={ticket} />

        {count > 1 && (
          <View style={s.pager}>
            <TouchableOpacity
              style={[s.pagerBtn, i === 0 && s.pagerBtnDisabled]}
              disabled={i === 0}
              onPress={() => setIndex(i - 1)}
            >
              <Text style={s.pagerArrow}>‹</Text>
            </TouchableOpacity>
            <AppText variant="headingSmall" color={Colors.textPrimary}>Ticket {i + 1}/{count}</AppText>
            <TouchableOpacity
              style={[s.pagerBtn, i === count - 1 && s.pagerBtnDisabled]}
              disabled={i === count - 1}
              onPress={() => setIndex(i + 1)}
            >
              <Text style={s.pagerArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        <AppText variant="caption" color={Colors.textMuted} align="center" style={{ marginTop: Spacing.base }}>
          Show this QR code at the venue entrance
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  backBtn: { width: 64 },
  list:    { padding: Spacing.base, gap: Spacing.sm },
  // Shadow-casting wrapper — no overflow/clipping of its own so the shadow
  // renders fully on both iOS (shadow* props) and Android (elevation).
  ticketRowShadowWrap: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgCard,
    ...Shadows.sm,
  },
  ticketRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  statusStrip: { width: 5, alignSelf: 'stretch' },
  ticketInfo:  { flex: 1, padding: Spacing.base, gap: 4 },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    marginRight: Spacing.base,
  },
  pager: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xl, marginTop: Spacing.lg,
  },
  pagerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerArrow: { fontSize: 22, color: Colors.textSecondary, lineHeight: 24 },
});
