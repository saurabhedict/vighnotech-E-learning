import api from './axiosClient'

// Discovery & personalization: search, favorites, progress, recommendations.
export const discoverApi = {
  search(params) {
    return api.get('/search', { params }).then((r) => r.data)
  },
  // Type-ahead keyword suggestions (course names / titles / tags) for the search bar.
  suggest(q) {
    return api.get('/search/suggest', { params: { q } }).then((r) => r.data.suggestions)
  },
  // Favorites
  favoriteIds() {
    return api.get('/favorites/ids').then((r) => r.data.ids)
  },
  myFavorites() {
    return api.get('/favorites/mine').then((r) => r.data.items)
  },
  addFavorite(contentId) {
    return api.post(`/favorites/${contentId}`).then((r) => r.data)
  },
  removeFavorite(contentId) {
    return api.delete(`/favorites/${contentId}`).then((r) => r.data)
  },
  // Progress (recently viewed / continue watching)
  saveProgress(contentId, body) {
    return api.post(`/progress/${contentId}`, body).then((r) => r.data)
  },
  myProgress(limit = 12) {
    return api.get('/progress/mine', { params: { limit } }).then((r) => r.data.items)
  },
  // Mark a lesson as complete/incomplete
  markComplete(contentId, completed) {
    return api.post(`/progress/${contentId}`, { completed }).then((r) => r.data)
  },
  // Recommended
  recommended() {
    return api.get('/recommended').then((r) => r.data.items)
  },
  // Standalone resources
  standaloneResources() {
    return api.get('/resources/standalone').then((r) => r.data.items)
  },
}
