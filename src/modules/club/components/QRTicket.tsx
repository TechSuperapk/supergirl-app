import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode             from 'react-native-qrcode-svg';
import { AppText }        from '../../../shared/components/AppText';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Ticket }         from '../types';

interface Props { ticket: Ticket }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function QRTicket({ ticket }: Props) {
  const isUsed    = ticket.status === 'used';
  const isExpired = ticket.status === 'expired';

  return (
    <View style={[s.card, isUsed && s.usedCard]}>
      {/* Event info */}
      <AppText variant="headingMedium" color={Colors.textPrimary} align="center">
        {ticket.eventTitle}
      </AppText>
      <AppText variant="bodySmall" color={Colors.textMuted} align="center">
        {ticket.ticketTypeName}
      </AppText>

      {/* Divider */}
      <View style={s.divider} />

      {/* QR Code */}
      <View style={s.qrWrap}>
        {isUsed || isExpired ? (
          <View style={s.usedOverlay}>
            <AppText style={{ fontSize: 48 }}>{isUsed ? '✅' : '❌'}</AppText>
            <AppText variant="headingSmall" color={isUsed ? Colors.success : Colors.error}>
              {isUsed ? 'Ticket Used' : 'Expired'}
            </AppText>
          </View>
        ) : (
          <QRCode
            value={ticket.qrToken}
            size={200}
            color={Colors.textPrimary}
            backgroundColor={Colors.white}
          />
        )}
      </View>

      {/* Ticket ID */}
      <View style={s.divider} />
      <AppText variant="caption" color={Colors.textMuted} align="center">
        Ticket ID: {ticket.id.slice(0, 8).toUpperCase()}
      </AppText>
      <AppText variant="caption" color={Colors.textMuted} align="center">
        Purchased: {formatDate(ticket.purchasedAt)}
      </AppText>

      {/* Status pill */}
      <View style={[s.statusPill, {
        backgroundColor: isUsed    ? Colors.success + '20'
                       : isExpired ? Colors.error + '20'
                       : Colors.primaryLight,
      }]}>
        <AppText variant="caption" color={
          isUsed    ? Colors.success
        : isExpired ? Colors.error
        :             Colors.primary
        } style={{ fontFamily: 'DMSans-Bold' }}>
          {isUsed ? '● Used' : isExpired ? '● Expired' : '● Valid'}
        </AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    gap:             Spacing.sm,
    marginHorizontal: Spacing.base,
    ...Shadows.lg,
  },
  usedCard: { opacity: 0.75 },
  divider:  { width: '100%', height: 1, backgroundColor: Colors.divider, borderStyle: 'dashed' },
  qrWrap: {
    padding:         Spacing.base,
    backgroundColor: Colors.white,
    borderRadius:    Radius.md,
    ...Shadows.sm,
  },
  usedOverlay: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: Spacing.sm,
  },
});
