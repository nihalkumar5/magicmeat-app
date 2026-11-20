import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { dismissDialog, subscribeDialogs, type DialogRequest } from '../utils/dialogs';

// In-app replacement for window.alert / window.confirm on web, styled like
// an iOS alert: title, message, then Cancel and the action side by side
// (destructive actions in red). Shows one dialog at a time, in order.
export function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  useEffect(() => subscribeDialogs(setQueue), []);
  if (Platform.OS !== 'web') return null;
  const current = queue[0];
  if (!current) return null;
  return <Dialog key={current.id} req={current} />;
}

function Dialog({ req }: { req: DialogRequest }) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
  }, [p]);

  const close = (confirmed: boolean) => {
    dismissDialog(req.id);
    if (confirmed) req.onConfirm?.();
  };

  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] });
  const twoButtons = !!req.cancelText;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => close(false)}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.box, { opacity: p, transform: [{ scale }] }]} accessibilityRole="alert">
          <View style={styles.body}>
            <Text style={styles.title}>{req.title}</Text>
            {!!req.message && <Text style={styles.message}>{req.message}</Text>}
          </View>
          <View style={styles.actions}>
            {twoButtons && (
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnBorder, pressed && styles.pressed]}
                onPress={() => close(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancel}>{req.cancelText}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
              onPress={() => close(true)}
              accessibilityRole="button"
            >
              <Text style={[styles.confirm, req.destructive && styles.destructive]}>{req.confirmText || 'OK'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  box: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 18,
    backgroundColor: 'rgba(250,250,252,0.98)',
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    color: '#3C3C43',
    textAlign: 'center',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60,60,67,0.29)',
  },
  btn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(60,60,67,0.29)',
  },
  pressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  destructive: {
    color: '#DC2626',
  },
});
