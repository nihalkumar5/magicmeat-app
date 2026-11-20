import { Redirect } from 'expo-router';

// Unknown addresses (old bookmarks, typos) go to the home screen instead of
// an error page.
export default function NotFound() {
  return <Redirect href="/" />;
}
