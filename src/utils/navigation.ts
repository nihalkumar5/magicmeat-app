import { router, type Href } from 'expo-router';

// Back button that also works when the screen was opened directly (a
// refresh, a deep link or a shared URL) and there is nothing to go back to.
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
