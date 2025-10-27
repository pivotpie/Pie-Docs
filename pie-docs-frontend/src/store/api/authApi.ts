import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { RootState } from '../index'
import { logout, refreshTokenSuccess } from '../slices/authSlice'
import type { User } from '../slices/authSlice'

export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
  mfaRequired?: boolean
  mfaSession?: string
}

export interface MfaVerifyRequest {
  mfaSession: string
  code: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    // Try to refresh token
    const refreshToken = (api.getState() as RootState).auth.refreshToken
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      )

      if (refreshResult.data) {
        const { token, refreshToken: newRefreshToken } = refreshResult.data as { token: string; refreshToken: string }
        api.dispatch(refreshTokenSuccess({ token, refreshToken: newRefreshToken }))

        // Retry the original query
        result = await baseQuery(args, api, extraOptions)
      } else {
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    verifyMfa: builder.mutation<LoginResponse, MfaVerifyRequest>({
      query: (data) => ({
        url: '/auth/mfa/verify',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    resendMfaCode: builder.mutation<{ success: boolean }, { mfaSession: string }>({
      query: (data) => ({
        url: '/auth/mfa/resend',
        method: 'POST',
        body: data,
      }),
    }),
    forgotPassword: builder.mutation<{ success: boolean }, ForgotPasswordRequest>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<{ success: boolean }, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    refreshToken: builder.mutation<{ token: string; refreshToken: string }, RefreshTokenRequest>({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    me: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
})