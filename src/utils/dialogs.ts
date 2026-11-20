import { Alert, Platform } from 'react-native';

// Every alert/confirm in the app goes through here.
// Native: the system alert. Web: an in-app dialog (DialogHost), because
// react-native-web's Alert is a no-op and the browser's own
// window.alert/confirm are blocked in some contexts (embedded views, some
// installed web apps), where confirm() silently returns false.

export type DialogRequest = {
  id: number;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void;
};

type Listener = (queue: DialogRequest[]) => void;
let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function push(req: Omit<DialogRequest, 'id'>) {
  queue = [...queue, { ...req, id: nextId++ }];
  listeners.forEach((l) => l(queue));
}

/** Used by DialogHost. */
export function subscribeDialogs(l: Listener): () => void {
  listeners.add(l);
  l(queue);
  return () => {
    listeners.delete(l);
  };
}

/** Used by DialogHost when a dialog closes. */
export function dismissDialog(id: number) {
  queue = queue.filter((d) => d.id !== id);
  listeners.forEach((l) => l(queue));
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    push({ title, message, confirmText: 'OK' });
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  cancelText = 'Cancel'
) {
  if (Platform.OS === 'web') {
    push({ title, message, confirmText, cancelText, destructive: true, onConfirm });
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}
