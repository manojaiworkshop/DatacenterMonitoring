import axios from 'axios'

const API_URL = '/api/auth'

export const authService = {
  async register(username, email, password) {
    const response = await axios.post(`${API_URL}/register`, {
      username,
      email,
      password
    })
    return response.data
  },

  async login(username, password) {
    const response = await axios.post(`${API_URL}/login`, {
      username,
      password
    })
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token)
    }
    return response.data
  },

  logout() {
    localStorage.removeItem('token')
  },

  getToken() {
    return localStorage.getItem('token')
  },

  isAuthenticated() {
    return this.getToken() !== null
  }
}
