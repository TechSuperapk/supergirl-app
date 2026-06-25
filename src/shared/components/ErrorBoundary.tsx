import React, { Component, ErrorInfo } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native';
import { AppText }   from './AppText';
import { AppButton } from './AppButton';
import { Colors }    from '../theme/colors';
import { Spacing }   from '../theme/spacing';

interface Props   { children: React.ReactNode; fallback?: React.ReactNode }
interface State   { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    // In production: send to Sentry / Crashlytics here
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={s.container}>
          <AppText style={{ fontSize: 52 }}>😵</AppText>
          <AppText variant="headingLarge" color={Colors.textPrimary} align="center">
            Something went wrong
          </AppText>
          <AppText variant="body" color={Colors.textMuted} align="center" style={s.message}>
            The app hit an unexpected error. Your data is safe.
          </AppText>
          {__DEV__ && this.state.error && (
            <View style={s.errorBox}>
              <AppText variant="caption" color={Colors.error} style={s.errorText}>
                {this.state.error.message}
              </AppText>
            </View>
          )}
          <AppButton
            label="Try again"
            onPress={this.reset}
            variant="primary"
            size="lg"
            style={s.btn}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.xl,
    gap:             Spacing.md,
    backgroundColor: Colors.bgApp,
  },
  message:  { lineHeight: 24, maxWidth: 280 },
  errorBox: {
    backgroundColor: Colors.error + '12',
    borderRadius:    8,
    padding:         Spacing.md,
    width:           '100%',
  },
  errorText:{ lineHeight: 16 },
  btn:      { marginTop: Spacing.sm },
});
