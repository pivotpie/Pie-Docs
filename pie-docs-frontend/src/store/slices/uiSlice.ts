import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface LoadingState {
  [key: string]: boolean;
}

interface UIState {
  loading: LoadingState;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark';
}

const initialState: UIState = {
  loading: {},
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  theme: 'light'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<{ key: string; isLoading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.isLoading;
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loading[action.payload];
    },
    clearAllLoading: (state) => {
      state.loading = {};
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    }
  }
});

export const {
  setLoading,
  clearLoading,
  clearAllLoading,
  setSidebarCollapsed,
  setMobileMenuOpen,
  setTheme
} = uiSlice.actions;

// Selectors
export const selectLoading = (state: { ui: UIState }, key: string) => state.ui.loading[key] || false;
export const selectIsAnyLoading = (state: { ui: UIState }) => Object.values(state.ui.loading).some(Boolean);
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectMobileMenuOpen = (state: { ui: UIState }) => state.ui.mobileMenuOpen;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;

export default uiSlice.reducer;