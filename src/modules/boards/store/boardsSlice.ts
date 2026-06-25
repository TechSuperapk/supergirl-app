import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';
import { Board, BoardElement } from '../types';

interface BoardsState {
  boards:       Board[];
  activeBoard:  Board | null;
  elements:     BoardElement[];  // elements of activeBoard in editor
  loading:      LoadingState;
  error:        string | null;
}

const initialState: BoardsState = {
  boards:      [],
  activeBoard: null,
  elements:    [],
  loading:     'idle',
  error:       null,
};

const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    setLoading(state, a: PayloadAction<LoadingState>) { state.loading = a.payload; },
    setError(state, a: PayloadAction<string | null>)  { state.error = a.payload; },

    setBoards(state, a: PayloadAction<Board[]>)       { state.boards = a.payload; },
    addBoard(state, a: PayloadAction<Board>)           { state.boards.unshift(a.payload); },
    updateBoard(state, a: PayloadAction<Board>) {
      const i = state.boards.findIndex(b => b.id === a.payload.id);
      if (i !== -1) state.boards[i] = a.payload;
    },
    deleteBoard(state, a: PayloadAction<string>) {
      state.boards = state.boards.filter(b => b.id !== a.payload);
    },

    setActiveBoard(state, a: PayloadAction<Board | null>) {
      state.activeBoard = a.payload;
      state.elements    = a.payload?.elements ?? [];
    },
    setElements(state, a: PayloadAction<BoardElement[]>) { state.elements = a.payload; },
    addElement(state, a: PayloadAction<BoardElement>)    { state.elements.push(a.payload); },
    updateElement(state, a: PayloadAction<BoardElement>) {
      const i = state.elements.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.elements[i] = a.payload;
    },
    removeElement(state, a: PayloadAction<string>) {
      state.elements = state.elements.filter(e => e.id !== a.payload);
    },
    reorderElements(state, a: PayloadAction<BoardElement[]>) {
      state.elements = a.payload;
    },
  },
});

export const {
  setLoading, setError,
  setBoards, addBoard, updateBoard, deleteBoard,
  setActiveBoard, setElements, addElement, updateElement, removeElement, reorderElements,
} = boardsSlice.actions;

export default boardsSlice.reducer;
