import React, { useState } from 'react';
import {
  View, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useSelector }    from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }      from '../../../store';
import { useClubEvents }  from '../hooks/useClub';
import { EventCard }      from '../components/EventCard';
import { AppText }        from '../../../shared/components/AppText';
import { AppButton }      from '../../../shared/components/AppButton';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { AppEmptyState }  from '../../../shared/components/AppEmptyState';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Event }          from '../types';

// ── EventsListScreen ──────────────────────────────────────────────────────────
type ListProps = NativeStackScreenProps<any, 'EventsList'>;

export function EventsListScreen({ navigation }: ListProps) {
  const { events, loading } = useClubEvents();
  const upcoming = events.filter(e => new Date(e.endDate) >= new Date());
  const past     = events.filter(e => new Date(e.endDate) < new Date());

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>Events</AppText>
      </View>

      {loading ? (
        <AppLoadingSpinner fullscreen message="Loading events…" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {upcoming.length > 0 && (
            <>
              <AppText variant="label" color={Colors.textMuted} style={s.sectionLabel}>
                UPCOMING
              </AppText>
              {upcoming.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  onTicket={() => navigation.navigate('EventDetail', { eventId: event.id })}
                />
              ))}
            </>
          )}

          {past.length > 0 && (
            <>
              <AppText variant="label" color={Colors.textMuted} style={s.sectionLabel}>
                PAST EVENTS
              </AppText>
              {past.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  onTicket={() => {}}
                />
              ))}
            </>
          )}

          {events.length === 0 && (
            <AppEmptyState
              emoji="🎟️"
              title="No events yet"
              subtitle="Check back soon for upcoming events and gatherings!"
            />
          )}
          <View style={{ height: Spacing['3xl'] }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── EventDetailScreen ─────────────────────────────────────────────────────────
type DetailProps = NativeStackScreenProps<any, 'EventDetail'>;

export function EventDetailScreen({ route, navigation }: DetailProps) {
  const { eventId }     = route.params as { eventId: string };
  const { events, buyTicket } = useClubEvents();
  const user            = useSelector((s: RootState) => s.auth.user);
  const event           = events.find(e => e.id === eventId);
  const [buying, setBuying] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!event) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <AppLoadingSpinner fullscreen />
      </SafeAreaView>
    );
  }

  const isPast = new Date(event.endDate) < new Date();

  const handleBuy = async (typeId: string, typeName: string) => {
    if (!user) return;
    setShowModal(false);
    setBuying(true);
    try {
      const ticket = await buyTicket(event, typeId, typeName, user.id);
      Alert.alert('🎟️ Ticket confirmed!', 'Your ticket is ready. Find it in My Tickets.', [
        { text: 'View ticket', onPress: () => navigation.navigate('MyTickets') },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not complete purchase.');
    } finally {
      setBuying(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={s.cover}>
          {event.coverUrl
            ? <Image source={{ uri: event.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <View style={[StyleSheet.absoluteFill, s.coverPlaceholder]}>
                <AppText style={{ fontSize: 56 }}>🎉</AppText>
              </View>
          }
          <TouchableOpacity style={s.backBtnCover} onPress={() => navigation.goBack()}>
            <AppText style={{ fontSize: 22, color: Colors.white }}>‹</AppText>
          </TouchableOpacity>
        </View>

        <View style={s.detailBody}>
          <AppText variant="displayMedium" color={Colors.textPrimary}>{event.title}</AppText>

          <View style={s.infoRow}><AppText style={s.infoIcon}>📅</AppText>
            <AppText variant="body" color={Colors.textSecondary}>
              {fmt(event.startDate)}{'\n'}{fmtTime(event.startDate)} – {fmtTime(event.endDate)}
            </AppText>
          </View>
          <View style={s.infoRow}><AppText style={s.infoIcon}>📍</AppText>
            <AppText variant="body" color={Colors.textSecondary}>{event.location}</AppText>
          </View>
          <View style={s.infoRow}><AppText style={s.infoIcon}>👥</AppText>
            <AppText variant="body" color={Colors.textSecondary}>{event.attendeeCount} attending</AppText>
          </View>

          <View style={s.divider} />

          <AppText variant="headingSmall" color={Colors.textPrimary}>About</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 24 }}>
            {event.description}
          </AppText>

          {!isPast && event.ticketTypes.length > 0 && (
            <>
              <View style={s.divider} />
              <AppText variant="headingSmall" color={Colors.textPrimary}>Tickets</AppText>
              {event.ticketTypes.map(tt => (
                <View key={tt.id} style={s.ticketTypeRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="headingSmall" color={Colors.textPrimary}>{tt.name}</AppText>
                    {tt.description && (
                      <AppText variant="caption" color={Colors.textMuted}>{tt.description}</AppText>
                    )}
                    <AppText variant="caption" color={Colors.textMuted}>
                      {tt.capacity - tt.sold} left
                    </AppText>
                  </View>
                  <AppText variant="headingMedium" color={Colors.club}>
                    {tt.price === 0 ? 'Free' : `₹${tt.price}`}
                  </AppText>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      {!isPast && (
        <View style={s.ctaBar}>
          <AppButton
            label={buying ? 'Processing…' : 'Get Tickets'}
            onPress={() => setShowModal(true)}
            loading={buying}
            variant="primary"
            size="lg"
            fullWidth
            style={{ backgroundColor: Colors.club }}
          />
        </View>
      )}

      {/* Ticket type selector modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity
          style={s.modalBackdrop}
          onPress={() => setShowModal(false)}
          activeOpacity={1}
        >
          <View style={s.modalSheet}>
            <AppText variant="headingMedium" color={Colors.textPrimary} style={s.modalTitle}>
              Choose ticket type
            </AppText>
            {event.ticketTypes.map(tt => (
              <TouchableOpacity
                key={tt.id}
                style={s.modalOption}
                onPress={() => handleBuy(tt.id, tt.name)}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="headingSmall" color={Colors.textPrimary}>{tt.name}</AppText>
                  <AppText variant="caption" color={Colors.textMuted}>{tt.capacity - tt.sold} remaining</AppText>
                </View>
                <AppText variant="headingSmall" color={Colors.club}>
                  {tt.price === 0 ? 'Free' : `₹${tt.price}`}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard, borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  scroll:         { paddingBottom: 40 },
  sectionLabel:   { paddingHorizontal: Spacing.base, marginTop: Spacing.base, marginBottom: 4 },
  cover:          { height: 240, backgroundColor: Colors.bgInput, justifyContent: 'flex-end' },
  coverPlaceholder:{ alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.club + '15' },
  backBtnCover: {
    position: 'absolute', top: 12, left: 12,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailBody:     { padding: Spacing.base, gap: Spacing.md },
  infoRow:        { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  infoIcon:       { fontSize: 18, width: 28 },
  divider:        { height: 1, backgroundColor: Colors.divider },
  ticketTypeRow:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.md,
  },
  ctaBar: {
    padding: Spacing.base,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
  },
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, gap: Spacing.md,
  },
  modalTitle:     { marginBottom: Spacing.sm },
  modalOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    padding: Spacing.base, gap: Spacing.md,
  },
});
