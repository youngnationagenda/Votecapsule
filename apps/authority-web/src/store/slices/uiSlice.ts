import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  activeElectionId: string | null;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  activeElectionId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setActiveElection(state, action: PayloadAction<string | null>) {
      state.activeElectionId = action.payload;
    },
  },
});

export const { toggleSidebar, setActiveElection } = uiSlice.actions;
export default uiSlice.reducer;
