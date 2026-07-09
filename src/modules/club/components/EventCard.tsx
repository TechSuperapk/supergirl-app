import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { AppButton } from '../../../shared/components/AppButton';
import { Colors }    from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Event }     from '../types';

interface Props {
  event:    Event;
  onPress:  () => void;
  onTicket: () => void;
}

function formatEventDate(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  if (s.toDateString() === e.toDateString()) {
    return `${s.toLocaleDateString('en-IN', opts)} · ${s.toLocaleTimeString('en-IN', time)} – ${e.toLocaleTimeString('en-IN', time)}`;
  }
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

function minTicketPrice(event: Event): string {
  if (!event.ticketTypes.length) return 'Free';
  const prices = event.ticketTypes.map(t => t.price);
  const min = Math.min(...prices);
  return min === 0 ? 'Free' : `₹${min}+`;
}

export function EventCard({ event, onPress, onTicket }: Props) {
  const isPast = new Date(event.endDate) < new Date();

  return (
    // Shadow lives on this outer wrapper (no overflow:'hidden' here) — the
    // inner TouchableOpacity clips the cover image to its rounded corners.
    // overflow:'hidden' on the SAME view as a shadow suppresses it on Android.
    <View style={s.cardShadowWrap}>
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      {/* Cover image */}
      <View style={s.cover}>
        {event.coverUrl
          ? <Image source={{ uri: event.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, s.coverPlaceholder]}>
              <AppText style={{ fontSize: 40 }}>🎉</AppText>
            </View>
        }
        {/* Date badge */}
        <View style={s.dateBadge}>
          <AppText variant="caption" color={Colors.white} style={{ fontFamily: 'DMSans-Bold' }}>
            {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()}
          </AppText>
        </View>
        {isPast && (
          <View style={s.pastOverlay}>
            <AppText variant="caption" color={Colors.white}>Event ended</AppText>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.body}>
        <View style={s.titleRow}>
          <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={2} style={{ flex: 1 }}>
            {event.title}
          </AppText>
          <AppText variant="headingSmall" color={Colors.club} style={s.price}>
            {minTicketPrice(event)}
          </AppText>
        </View>

        <View style={s.metaRow}>
          <AppText variant="caption" color={Colors.textMuted}>📅 {formatEventDate(event.startDate, event.endDate)}</AppText>
        </View>
        <View style={s.metaRow}>
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>📍 {event.location}</AppText>
        </View>
        <View style={s.metaRow}>
          <AppText variant="caption" color={Colors.textMuted}>👥 {event.attendeeCount} attending</AppText>
        </View>

        {!isPast && (
          <AppButton
            label="Get Tickets"
            onPress={onTicket}
            variant="secondary"
            size="sm"
            style={s.ticketBtn}
          />
        )}
      </View>
    </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  // Shadow-casting wrapper — no overflow/clipping of its own so the shadow
  // renders fully on both iOS (shadow* props) and Android (elevation).
  cardShadowWrap: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cover: { height: 160, backgroundColor: Colors.bgInput, justifyContent: 'flex-end' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.club + '20' },
  dateBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.club,
    borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  body:     { padding: Spacing.base, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  price:    { flexShrink: 0 },
  metaRow:  {},
  ticketBtn:{ marginTop: Spacing.sm, alignSelf: 'flex-end' },
});
