import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage
import { authApi } from './api/authApi'
import authSlice from './slices/authSlice'
import uiSlice from './slices/uiSlice'
import dashboardSlice from './slices/dashboardSlice'
import documentsSlice from './slices/documentsSlice'
import workflowsSlice from './slices/workflowsSlice'
import tasksSlice from './slices/tasksSlice'
import approvalsSlice from './slices/approvalsSlice'
import physicalDocsSlice from './slices/physicalDocsSlice'
import locationSlice from './slices/locationSlice'
import analyticsSlice from './slices/analyticsSlice'
import dashboardBuilderSlice from './slices/dashboardBuilderSlice'
import searchSlice from './slices/searchSlice'
import { dashboardPersistenceMiddleware } from '@/utils/dashboardPersistence'

// Persist config for search slice (conversations)
const searchPersistConfig = {
  key: 'search',
  storage,
  whitelist: ['nlp'], // Only persist NLP state (conversations)
}

// Create persisted search reducer
const persistedSearchReducer = persistReducer(searchPersistConfig, searchSlice)

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    dashboard: dashboardSlice,
    documents: documentsSlice,
    workflows: workflowsSlice,
    tasks: tasksSlice,
    approvals: approvalsSlice,
    physicalDocs: physicalDocsSlice,
    location: locationSlice,
    analytics: analyticsSlice,
    dashboardBuilder: dashboardBuilderSlice,
    search: persistedSearchReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PURGE',
          'persist/REGISTER',
          'documents/addFilesToQueue'
        ],
        ignoredPaths: [
          'location.locations.hierarchy.flatMap',
          'documents.uploadQueue',
          'documents.uploadQueue.files',
          'analytics.dashboard.selectedTimeRange',
          'analytics.dashboard.selectedTimeRange.start',
          'analytics.dashboard.selectedTimeRange.end',
          'search._persist'
        ],
      },
    }).concat(authApi.middleware, dashboardPersistenceMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export persistor for PersistGate
export const persistor = persistStore(store)

// Export default for use with Provider
export default store