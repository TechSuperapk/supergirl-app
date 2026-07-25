// BookingScreens — the two steps that complete the Hangouts ticket flow:
//   ReviewBookingScreen   — event summary + quantity stepper + order summary
//                           (amount + ₹50 booking fee = total) + Confirm.
//   BookingCompletedScreen — success confirmation → View Ticket / Discover more.
//
// Confirming books `quantity` real tickets (buyTicket per unit), so they land
// in My Tickets exactly like a single purchase.
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useClubEvents } from '../hooks/useClub';
import { createOrder }   from '../services/paymentService';
import { AppText }       from '../../../shared/components/AppText';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { FontFamily }    from '../../../shared/theme/typography';

const BOOKING_FEE = 50;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// ── Review Booking Details ────────────────────────────────────────────────────
type ReviewProps = NativeStackScreenProps<any, 'ReviewBooking'>;

export function ReviewBookingScreen({ route, navigation }: ReviewProps) {
  const { eventId, ticketTypeId } = route.params as { eventId: string; ticketTypeId: string };
  const user = useSelector((s: RootState) => s.auth.user);
  const { events } = useClubEvents();
  const event = events.find(e => e.id === eventId);
  const ticket = event?.ticketTypes.find(t => t.id === ticketTypeId) ?? event?.ticketTypes[0];

  const [qty, setQty] = useState(1);
  const [confirming, setConfirming] = useState(false);

  if (!event || !ticket) {
    return <SafeAreaView style={s.safe}><AppLoadingSpinner fullscreen /></SafeAreaView>;
  }

  const amount = ticket.price * qty;
  const toPay  = amount + BOOKING_FEE;
  const maxQty = Math.max(1, ticket.capacity - ticket.sold);

  // Confirm → create a Razorpay order server-side, then open the checkout.
  // Tickets are ONLY created after the payment is verified (RazorpayCheckout).
  const confirm = async () => {
    if (!user) { Alert.alert('Sign in required', 'Please log in to book.'); return; }
    setConfirming(true);
    try {
      const order = await createOrder(toPay, `evt_${event.id}`.slice(0, 40));
      setConfirming(false);
      navigation.navigate('RazorpayCheckout', {
        orderId: order.orderId,
        keyId: order.keyId,
        amount: order.amount,          // paise
        eventId: event.id,
        ticketTypeId: ticket.id,
        quantity: qty,
      });
    } catch (err: any) {
      setConfirming(false);
      Alert.alert('Payment error', err?.message ?? 'Could not start the payment. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={hit}><AppText style={s.back}>‹</AppText></TouchableOpacity>
        <AppText variant="headingMedium" color={Colors.textPrimary}>Review Booking Details</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base }} showsVerticalScrollIndicator={false}>
        {/* Event card */}
        <View style={s.eventCard}>
          <View style={s.eventCover}>
            {event.coverUrl
              ? <Image source={{ uri: event.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFill, s.coverPh]}><AppText style={{ fontSize: 40 }}>🎉</AppText></View>}
          </View>
          <View style={s.eventMetaRow}>
            <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>{event.title}</AppText>
            <View style={s.pill}><AppText variant="caption" color={Colors.textSecondary}>Private</AppText></View>
          </View>
          <View style={s.eventSubRow}>
            <AppText variant="caption" color={Colors.textMuted}>🕐 {fmtDate(event.startDate)}, {fmtTime(event.startDate)}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>👤 {event.attendeeCount.toLocaleString('en-IN')} Members</AppText>
          </View>
        </View>

        <AppText variant="headingSmall" color={Colors.textPrimary}>About this event</AppText>

        {/* Ticket + quantity */}
        <View style={s.card}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color={Colors.textPrimary}>{ticket.name}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {ticket.price === 0 ? 'Free' : `₹${ticket.price}`} per ticket
            </AppText>
          </View>
          <View style={s.stepper}>
            <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} hitSlop={hit}><AppText style={s.stepBtn}>–</AppText></TouchableOpacity>
            <AppText variant="label" color={Colors.textPrimary} style={{ minWidth: 20, textAlign: 'center' }}>{qty}</AppText>
            <TouchableOpacity onPress={() => setQty(q => Math.min(maxQty, q + 1))} hitSlop={hit}><AppText style={s.stepBtn}>+</AppText></TouchableOpacity>
          </View>
        </View>

        {/* Order summary */}
        <View style={s.summaryCard}>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>Order Summary</AppText>
          <Row label="Order amount" value={`₹${amount}`} />
          <Row label="Booking fee" value={`₹${BOOKING_FEE}`} />
          <View style={s.summaryDivider} />
          <Row label="To Pay" value={`₹${toPay}`} bold />
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View>
          <AppText variant="caption" color={Colors.textMuted}>Total</AppText>
          <AppText variant="headingMedium" color={Colors.textPrimary}>₹{toPay.toLocaleString('en-IN')}</AppText>
        </View>
        <TouchableOpacity style={[s.primaryBtn, confirming && { opacity: 0.6 }]} onPress={confirm} disabled={confirming} activeOpacity={0.85}>
          <AppText variant="button" color={Colors.white}>{confirming ? 'Booking…' : 'Confirm Booking'}</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <AppText variant={bold ? 'label' : 'body'} color={bold ? Colors.textPrimary : Colors.textMuted}>{label}</AppText>
      <AppText variant={bold ? 'headingSmall' : 'body'} color={Colors.textPrimary}>{value}</AppText>
    </View>
  );
}

// ── Booking Completed ─────────────────────────────────────────────────────────
type DoneProps = NativeStackScreenProps<any, 'BookingCompleted'>;

export function BookingCompletedScreen({ route, navigation }: DoneProps) {
  const { eventId, quantity } = route.params as { eventId: string; ticketTypeId: string; quantity: number };
  const { events } = useClubEvents();
  const event = events.find(e => e.id === eventId);

  const goTickets  = () => navigation.navigate('MyTickets');
  const goDiscover = () => navigation.navigate('EventsList');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={goDiscover} hitSlop={hit} style={s.closeBtn}><AppText style={s.close}>✕</AppText></TouchableOpacity>

      <View style={s.doneWrap}>
        <View style={s.check}><AppText style={{ fontSize: 44, color: Colors.white }}>✓</AppText></View>
        <AppText variant="headingLarge" color={Colors.textPrimary} style={{ marginTop: Spacing.lg }}>Booking Completed</AppText>
        <AppText variant="body" color={Colors.textMuted} align="center" style={{ marginTop: 6 }}>
          Your booking was successful.{'\n'}See you at the event
        </AppText>

        {!!event && (
          <View style={[s.card, { marginTop: Spacing.xl, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.sm }]}>
            <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
              <View style={s.doneCover}>
                {event.coverUrl
                  ? <Image source={{ uri: event.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <View style={[StyleSheet.absoluteFill, s.coverPh]}><AppText>🎉</AppText></View>}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={Colors.textMuted}>UPCOMING EVENT</AppText>
                <AppText variant="label" color={Colors.textPrimary} numberOfLines={2}>{event.title}</AppText>
              </View>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.eventSubRow}>
              <AppText variant="caption" color={Colors.textMuted}>🎟️ {quantity} Ticket{quantity > 1 ? 's' : ''}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>📍 {event.location}</AppText>
            </View>
            <View style={s.eventSubRow}>
              <AppText variant="caption" color={Colors.textMuted}>📅 {fmtDate(event.startDate)}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>🕐 {fmtTime(event.startDate)}</AppText>
            </View>
          </View>
        )}
      </View>

      <View style={{ padding: Spacing.base, gap: Spacing.sm }}>
        <TouchableOpacity style={s.primaryBtnWide} onPress={goTickets} activeOpacity={0.85}>
          <AppText variant="button" color={Colors.white}>View Ticket</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={goDiscover} activeOpacity={0.85}>
          <AppText variant="button" color={Colors.textMuted}>Discover more events</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const hit = { top: 10, bottom: 10, left: 10, right: 10 };

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  back: { fontSize: 30, color: Colors.textPrimary },

  eventCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, ...Shadows.sm, overflow: 'hidden', paddingBottom: Spacing.md },
  eventCover: { width: '100%', height: 190, backgroundColor: Colors.bgInput },
  coverPh: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.club + '15' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  eventSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginTop: 6 },
  pill: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, ...Shadows.sm, padding: Spacing.base, flexDirection: 'row', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  stepBtn: { fontSize: 20, color: Colors.textPrimary, width: 18, textAlign: 'center' },

  summaryCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, ...Shadows.sm, padding: Spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.divider, marginVertical: Spacing.sm },

  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.base, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.divider, backgroundColor: Colors.bgCard },
  primaryBtn: { backgroundColor: '#141414', borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  primaryBtnWide: { backgroundColor: '#141414', borderRadius: Radius.md, paddingVertical: Spacing.base, alignItems: 'center' },
  secondaryBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.base, alignItems: 'center' },

  closeBtn: { padding: Spacing.base },
  close: { fontSize: 22, color: Colors.textPrimary },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.base },
  check: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#2ecc55', alignItems: 'center', justifyContent: 'center' },
  doneCover: { width: 52, height: 52, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.bgInput },
});
