import { previewerUrl } from './core/routes';

const current = new URL(window.location.href);
if (current.searchParams.has('dev')) {
  // Route before importing the game: no world, input listeners, or game ticker.
  window.location.replace(previewerUrl(current));
} else {
  void import('./main');
}
