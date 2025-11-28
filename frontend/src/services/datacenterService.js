import axios from 'axios'

const API_URL = '/api'

const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

export const datacenterService = {
  async getDatacenters() {
    const response = await axios.get(`${API_URL}/datacenters/`, {
      headers: getAuthHeader(),
    })
    return response.data
  },

  async getDatacenter(id) {
    const response = await axios.get(`${API_URL}/datacenters/${id}`, {
      headers: getAuthHeader(),
    })
    return response.data
  },

  async createDatacenter(data) {
    try {
      console.log('Creating datacenter:', data)
      const response = await axios.post(`${API_URL}/datacenters/`, data, {
        headers: getAuthHeader(),
      })
      console.log('Datacenter created successfully:', response.data)
      return response.data
    } catch (error) {
      console.error('Error creating datacenter:', error.response?.data || error.message)
      throw error
    }
  },

  async deleteDatacenter(id) {
    const response = await axios.delete(`${API_URL}/datacenters/${id}`, {
      headers: getAuthHeader(),
    })
    return response.data
  },

  async addDevice(datacenterId, deviceData) {
    const response = await axios.post(
      `${API_URL}/datacenters/${datacenterId}/devices`,
      deviceData,
      {
        headers: getAuthHeader(),
      }
    )
    return response.data
  },

  async updateDevice(datacenterId, deviceId, deviceData) {
    const response = await axios.put(
      `${API_URL}/datacenters/${datacenterId}/devices/${deviceId}`,
      deviceData,
      {
        headers: getAuthHeader(),
      }
    )
    return response.data
  },

  async deleteDevice(datacenterId, deviceId) {
    const response = await axios.delete(
      `${API_URL}/datacenters/${datacenterId}/devices/${deviceId}`,
      {
        headers: getAuthHeader(),
      }
    )
    return response.data
  },
}
