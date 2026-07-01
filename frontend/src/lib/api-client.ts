import axios from "axios"

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.error ?? error.message ?? "Request failed"
    return Promise.reject(new Error(message))
  }
)
