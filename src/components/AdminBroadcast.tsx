import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Image } from 'react-native';
import { countPushAudience, sendBroadcast, subscribeBroadcasts, type Broadcast } from '../services/backend';
import { confirmAction, notify } from '../utils/dialogs';
import { haptic } from '../utils/haptics';
import { PressableScale } from './motion';
import { withEmoji } from '../utils/notifyEmoji';
import { AppIcon, Megaphone01Icon, SentIcon } from './HugeIcon';

const C = {
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  tertiary: '#9CA3AF',
  hairline: '#E8E8ED',
  fill: '#F2F2F7',
  red: '#DC2626',
  redSoft: '#FEF2F2',
};

const TITLE_MAX = 65;
const BODY_MAX = 240;
const ICON = require('../../assets/icon.png');

// Ready-made starts the store owner can tweak.
const TEMPLATES = [
  { label: 'Fresh stock', title: 'Fresh cuts just in', body: 'Today’s chicken and mutton are cut and ready. Order now, at your door in 15–20 mins.' },
  { label: 'Weekend', title: 'Weekend special', body: 'Planning a Sunday feast? Order your curry cuts today and skip the queue.' },
  { label: 'Free delivery', title: 'Free delivery today', body: 'Free delivery on every order above ₹499. Fresh jhatka meat, delivered fast.' },
];

function ago(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Admin: write a short push message and send it to every customer who
// allowed notifications. Shows a live lock-screen preview and the last few
// sends.
export function AdminBroadcast() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [audience, setAudience] = useState<number | null>(null);
  const [history, setHistory] = useState<Broadcast[]>([]);

  useEffect(() => subscribeBroadcasts(setHistory), []);
  useEffect(() => {
    countPushAudience().then(setAudience);
  }, [history.length]);

  const ready = title.trim().length > 0 && body.trim().length > 0 && !sending;
  const who = audience == null ? 'all customers with notifications on' : `${audience} customer${audience === 1 ? '' : 's'}`;

  const send = () => {
    if (!ready) {
      notify('Add a title and message', 'Both show on the customer’s lock screen.');
      return;
    }
    confirmAction(`Send to ${who}?`, `“${withEmoji(title)}” goes out right away. It can’t be taken back.`, 'Send', async () => {
      setSending(true);
      try {
        const r = await sendBroadcast(title.trim(), body.trim());
        haptic.success();
        setTitle('');
        setBody('');
        notify('Sent', r.audience ? `Delivered to ${r.sent} of ${r.audience} phones.` : 'No customer has notifications on yet.');
      } catch (e) {
        haptic.warn();
        notify('Not sent', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setSending(false);
      }
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <AppIcon icon={Megaphone01Icon} size={18} color={C.red} strokeWidth={2.1} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Send a notification</Text>
          <Text style={styles.sub}>Reaches {who}</Text>
        </View>
      </View>

      {/* lock-screen preview */}
      <View style={styles.preview} accessibilityLabel="Preview">
        <Image source={ICON} style={styles.previewIcon} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.previewTop}>
            <Text style={styles.previewApp}>MAGICMEAT</Text>
            <Text style={styles.previewNow}>now</Text>
          </View>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {title.trim() ? withEmoji(title) : 'Your title'}
          </Text>
          <Text style={styles.previewBody} numberOfLines={3}>
            {body.trim() || 'Your message shows here, just like on the customer’s phone.'}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {TEMPLATES.map((t) => (
          <PressableScale
            key={t.label}
            style={styles.chip}
            haptics="select"
            onPress={() => {
              setTitle(t.title);
              setBody(t.body);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Use ${t.label} template`}
          >
            <Text style={styles.chipText}>{t.label}</Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.label}>Title</Text>
        <Text style={styles.count}>
          {title.length}/{TITLE_MAX}
        </Text>
      </View>
      <TextInput
        value={title}
        onChangeText={(v) => setTitle(v.slice(0, TITLE_MAX))}
        placeholder="Fresh cuts just in"
        placeholderTextColor={C.tertiary}
        style={styles.field}
        maxLength={TITLE_MAX}
        accessibilityLabel="Notification title"
      />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Message</Text>
        <Text style={styles.count}>
          {body.length}/{BODY_MAX}
        </Text>
      </View>
      <TextInput
        value={body}
        onChangeText={(v) => setBody(v.slice(0, BODY_MAX))}
        placeholder="What should customers know?"
        placeholderTextColor={C.tertiary}
        style={[styles.field, styles.fieldMulti]}
        multiline
        maxLength={BODY_MAX}
        accessibilityLabel="Notification message"
      />

      <PressableScale
        style={[styles.send, !ready && styles.sendOff]}
        onPress={send}
        disabled={sending}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel="Send notification"
      >
        {sending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <AppIcon icon={SentIcon} size={17} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.sendText}>Send to customers</Text>
          </>
        )}
      </PressableScale>

      {history.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyHead}>Recently sent</Text>
          {history.map((h, i) => (
            <View key={h.id} style={[styles.hRow, i > 0 && styles.hBorder]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.hTitle} numberOfLines={1}>
                  {h.title}
                </Text>
                <Text style={styles.hBody} numberOfLines={1}>
                  {h.body}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.hMeta}>{ago(h.sentAt)}</Text>
                <Text style={styles.hMeta}>
                  {h.sent}/{h.audience} phones
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.card,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  headIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  sub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 1,
  },
  preview: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#EEF0F3',
    marginBottom: 12,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewApp: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: C.secondary,
  },
  previewNow: {
    fontSize: 11,
    color: C.tertiary,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginTop: 2,
  },
  previewBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
    marginTop: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.fill,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.secondary,
  },
  count: {
    fontSize: 12,
    color: C.tertiary,
    fontVariant: ['tabular-nums'],
  },
  field: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.fill,
    fontSize: 16,
    color: C.text,
  },
  fieldMulti: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  send: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendOff: {
    opacity: 0.45,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  history: {
    marginTop: 18,
  },
  historyHead: {
    fontSize: 13,
    fontWeight: '700',
    color: C.secondary,
    marginBottom: 4,
  },
  hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  hBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  hTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  hBody: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 1,
  },
  hMeta: {
    fontSize: 12,
    color: C.tertiary,
  },
});
