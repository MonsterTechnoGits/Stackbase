import { createSlice } from '@reduxjs/toolkit';

interface UIState {
  // Add global UI state here as the app grows.
  // Examples: open modal IDs, active sidebar panel, banner visibility.
}

const initialState: UIState = {};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {},
});

// export const { } = uiSlice.actions;
export default uiSlice.reducer;
