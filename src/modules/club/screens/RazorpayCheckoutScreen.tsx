/**
 * RazorpayCheckoutScreen — opens Razorpay Standard Checkout inside a WebView
 * (react-native-webview, already a dependency — no native module / rebuild).
 *
 * Flow: the order was already created server-side (ReviewBooking). This screen
 * loads checkout.js with that order, the user pays, and on the success callback
 * we VERIFY the signature on the server and only THEN create the tickets. On
 * dismiss/failure we go back to the review screen without creating anything.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useClubEvents } from '../hooks/useClub';
import { verifyPayment } from '../services/paymentService';
import { AppText }       from '../../../shared/components/AppText';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';

type Props = NativeStackScreenProps<any, 'RazorpayCheckout'>;

interface Params {
  orderId: string;
  keyId: string;
  amount: number;        // paise
  eventId: string;
  ticketTypeId: string;
  quantity: number;
}

function checkoutHtml(p: { keyId: string; orderId: string; amount: number; name: string; description: string; prefill: { name: string; email: string; contact: string } }): string {
  const esc = (s: string) => String(s).replace(/'/g, "\\'");
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html,body{margin:0;height:100%;background:#fff;font-family:sans-serif}</style></head>
<body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var options = {
    key: '${esc(p.keyId)}',
    order_id: '${esc(p.orderId)}',
    amount: ${p.amount},
    currency: 'INR',
    name: '${esc(p.name)}',
    description: '${esc(p.description)}',
    prefill: { name: '${esc(p.prefill.name)}', email: '${esc(p.prefill.email)}', contact: '${esc(p.prefill.contact)}' },
    theme: { color: '#141414' },
    handler: function (r) { post({ type: 'success', razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }); },
    modal: { ondismiss: function () { post({ type: 'dismiss' }); }, escape: true }
  };
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function (resp) { post({ type: 'failed', description: (resp && resp.error && resp.error.description) || 'Payment failed' }); });
  document.addEventListener('DOMContentLoaded', function(){ rzp.open(); });
  rzp.open();
</script>
</body></html>`;
}

export function RazorpayCheckoutScreen({ route, navigation }: Props) {
  const { orderId, keyId, amount, eventId, ticketTypeId, quantity } = route.params as Params;
  const user = useSelector((s: RootState) => s.auth.user);
  const { events, buyTicket } = useClubEvents();
  const event = events.find(e => e.id === eventId);
  const ticket = event?.ticketTypes.find(t => t.id === ticketTypeId) ?? event?.ticketTypes[0];
  const [processing, setProcessing] = useState(false);

  if (!event || !ticket) {
    return <SafeAreaView style={s.safe}><AppLoadingSpinner fullscreen /></SafeAreaView>;
  }

  const testMode = !keyId;

  // Shared post-payment step: create the N tickets (grouped) and finish.
  const finishBooking = async () => {
    const bookingId = `BH${Math.floor(100_000_000 + Math.random() * 899_999_999)}`;
    for (let i = 0; i < quantity; i++) {
      await buyTicket(event, ticket.id, ticket.name, user!.id, bookingId);
    }
    navigation.replace('BookingCompleted', { eventId, ticketTypeId, quantity });
  };

  // ── Test mode: no Razorpay configured → simulate a successful payment ──────
  if (testMode) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.testWrap}>
          <View style={s.testBadge}><AppText variant="caption" color={Colors.warning}>TEST MODE</AppText></View>
          <AppText variant="headingLarge" color={Colors.textPrimary} style={{ marginTop: Spacing.base }}>Test Payment</AppText>
          <AppText variant="body" color={Colors.textMuted} align="center" style={{ marginTop: 6 }}>
            {event.title}{'\n'}{quantity} × {ticket.name} · ₹{(amount / 100).toLocaleString('en-IN')}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted} align="center" style={{ marginTop: Spacing.md }}>
            Razorpay isn’t configured on the server, so this simulates a successful payment.
          </AppText>

          <TouchableOpacity
            style={[s.payBtn, processing && { opacity: 0.6 }]}
            disabled={processing}
            activeOpacity={0.85}
            onPress={async () => {
              setProcessing(true);
              try { await finishBooking(); }
              catch (err: any) { setProcessing(false); Alert.alert('Booking failed', err?.message ?? 'Could not create tickets.'); }
            }}
          >
            <AppText variant="button" color={Colors.white}>{processing ? 'Booking…' : `Simulate Payment · ₹${(amount / 100).toLocaleString('en-IN')}`}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} disabled={processing}>
            <AppText variant="button" color={Colors.textMuted}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const html = checkoutHtml({
    keyId, orderId, amount,
    name: event.title,
    description: `${quantity} × ${ticket.name}`,
    prefill: { name: user?.name ?? '', email: '', contact: '' },
  });

  const onMessage = async (e: { nativeEvent: { data: string } }) => {
    let msg: any;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }

    if (msg.type === 'dismiss') { navigation.goBack(); return; }
    if (msg.type === 'failed') {
      Alert.alert('Payment failed', msg.description ?? 'Please try again.');
      navigation.goBack();
      return;
    }
    if (msg.type === 'success') {
      setProcessing(true);
      try {
        // 1) Verify the signature on the server (never trust the client alone).
        await verifyPayment({ orderId: msg.razorpay_order_id, paymentId: msg.razorpay_payment_id, signature: msg.razorpay_signature });
        // 2) Only after verification, create the tickets.
        await finishBooking();
      } catch (err: any) {
        setProcessing(false);
        Alert.alert('Payment verification failed', err?.message ?? 'Your payment could not be verified. If money was deducted it will be refunded.');
        navigation.goBack();
      }
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={s.loading}><ActivityIndicator size="large" color={Colors.club} /></View>
        )}
      />
      {processing && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <AppText variant="body" color={Colors.white} style={{ marginTop: 12 }}>Confirming your booking…</AppText>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgApp },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  testWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  testBadge: { backgroundColor: Colors.warning + '22', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  payBtn: { marginTop: Spacing.xl, backgroundColor: '#141414', borderRadius: Radius.md, paddingVertical: Spacing.base, paddingHorizontal: Spacing.xl, alignSelf: 'stretch', alignItems: 'center' },
  cancelBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center' },
});
