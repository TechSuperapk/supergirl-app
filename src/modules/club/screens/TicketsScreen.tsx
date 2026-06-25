import React from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
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

// ── MyTicketsScreen ───────────────────────────────────────────────────────────
type ListProps = NativeStackScreenProps<any, 'MyTickets'>;

export function MyTicketsScreen({ navigation }: ListProps) {
  const { myTickets, loading } = useMyTickets();

  const active = myTickets.filter(t => t.status === 'active');
  const used   = myTickets.filter(t => t.status !== 'active');

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      style={s.ticketRow}
      onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
      activeOpacity={0.85}
    >
      <View style={[s.statusStrip, {
        backgroundColor: item.status === 'active' ? Colors.success
          : item.status === 'used' ? Colors.textLight : Colors.error,
      }]} />
      <View style={s.ticketInfo}>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
          {item.eventTitle}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted}>{item.ticketTypeName}</AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {new Date(item.purchasedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </AppText>
      </View>
      <View style={[s.statusBadge, {
        backgroundColor: item.status === 'active' ? Colors.success + '15'
          : item.status === 'used' ? Colors.bgInput : Colors.error + '15',
      }]}>
        <AppText variant="caption" color={
          item.status === 'active' ? Colors.success
          : item.status === 'used' ? Colors.textMuted : Colors.error
        } style={{ fontFamily: 'DMSans-Bold' }}>
          {item.status === 'active' ? 'Valid' : item.status === 'used' ? 'Used' : 'Expired'}
        </AppText>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>My Tickets</AppText>
      </View>

      {loading ? (
        <AppLoadingSpinner fullscreen message="Loading tickets…" />
      ) : (
        <FlatList
          data={[...active, ...used]}
          keyExtractor={item => item.id}
          renderItem={renderTicket}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <AppEmptyState
              emoji="🎟️"
              title="No tickets yet"
              subtitle="Browse events and grab your first ticket!"
            />
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
  const { ticketId }  = route.params as { ticketId: string };
  const { myTickets } = useMyTickets();
  const ticket        = myTickets.find(t => t.id === ticketId);

  if (!ticket) return <AppLoadingSpinner fullscreen />;

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
        <QRTicket ticket={ticket} />
        <AppText
          variant="caption"
          color={Colors.textMuted}
          align="center"
          style={{ marginTop: Spacing.base }}
        >
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
  ticketRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    overflow: 'hidden', ...Shadows.sm,
  },
  statusStrip: { width: 5, alignSelf: 'stretch' },
  ticketInfo:  { flex: 1, padding: Spacing.base, gap: 4 },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    marginRight: Spacing.base,
  },
});
