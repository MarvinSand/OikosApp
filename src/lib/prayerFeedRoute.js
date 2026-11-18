// Gebete (/prayers) und Feed (/friends bzw. /friends?tab=feed) teilen sich eine
// Seite mit Wisch-Pager (siehe FriendsView → PrayerFeedPager).
export function isPrayerFeedRoute(pathname, search) {
  if (pathname === '/prayers') return true
  if (pathname !== '/friends') return false
  const tab = new URLSearchParams(search).get('tab')
  return !['chats', 'friends', 'communities'].includes(tab)
}
