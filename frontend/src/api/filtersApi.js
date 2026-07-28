import api from './axiosClient'

// Public catalog filters — the dynamic categories admins define to classify courses.
export const filtersApi = {
  async list() {
    const { data } = await api.get('/filters')
    return data.categories // [{ id, name, slug, order, options: [{ id, label, slug }] }]
  },
}
