import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector }                  from 'react-redux';
import { RootState }                                 from '../../../store';
import {
  setBoards, addBoard, updateBoard, deleteBoard as deleteBoardAction,
  setActiveBoard, setElements, addElement,
  updateElement, removeElement, reorderElements,
} from '../store/boardsSlice';
import {
  fetchBoards, createBoard, updateBoardElements,
  updateBoardMeta, deleteBoard as deleteBoardDb,
  uploadBoardImage,
} from '../services/boardsFirestoreService';
import { Board, BoardElement, BoardType, ElementType } from '../types';

// ── nanoid-lite ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Boards list hook ──────────────────────────────────────────────────────────
export function useBoards() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const boards   = useSelector((s: RootState) => s.boards.boards);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bs = await fetchBoards(user.id);
      dispatch(setBoards(bs));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const create = async (
    title:    string,
    type:     BoardType,
    bgColor:  string,
    isPublic: boolean,
  ): Promise<Board> => {
    if (!user) throw new Error('Not authenticated');
    const board = await createBoard({ userId: user.id, title, type, bgColor, isPublic });
    dispatch(addBoard(board));
    return board;
  };

  const remove = async (boardId: string) => {
    await deleteBoardDb(boardId);
    dispatch(deleteBoardAction(boardId));
  };

  const updateMeta = async (
    boardId: string,
    meta: Partial<Pick<Board, 'title' | 'bgColor' | 'isPublic' | 'thumbnail'>>,
  ) => {
    await updateBoardMeta(boardId, meta);
    const existing = boards.find(b => b.id === boardId);
    if (existing) dispatch(updateBoard({ ...existing, ...meta }));
  };

  return { boards, loading, create, remove, updateMeta, refresh: load };
}

// ── Board editor hook ─────────────────────────────────────────────────────────
export function useBoardEditor(boardId: string) {
  const dispatch   = useDispatch();
  const user       = useSelector((s: RootState) => s.auth.user);
  const boards     = useSelector((s: RootState) => s.boards.boards);
  const elements   = useSelector((s: RootState) => s.boards.elements);
  const activeBoard = useSelector((s: RootState) => s.boards.activeBoard);

  const [saving,   setSaving]   = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load board into editor
  useEffect(() => {
    const board = boards.find(b => b.id === boardId);
    if (board) dispatch(setActiveBoard(board));
    return () => { dispatch(setActiveBoard(null)); };
  }, [boardId]);

  // Auto-save with debounce
  const scheduleAutoSave = useCallback((els: BoardElement[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!boardId) return;
      setSaving(true);
      try {
        await updateBoardElements(boardId, els);
        const board = boards.find(b => b.id === boardId);
        if (board) dispatch(updateBoard({ ...board, elements: els }));
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [boardId, boards]);

  // ── Element CRUD ─────────────────────────────────────────────────────────────
  const addImageElement = async (localUri: string) => {
    if (!user || !boardId) return;
    const remoteUrl = localUri.startsWith('http')
      ? localUri
      : await uploadBoardImage(user.id, boardId, localUri);

    const el: BoardElement = {
      id:       uid(),
      type:     'image',
      x:        40,
      y:        40,
      width:    220,
      height:   220,
      rotation: 0,
      zIndex:   elements.length,
      imageUri: remoteUrl,
      opacity:  1,
    };
    const updated = [...elements, el];
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
    setSelected(el.id);
  };

  const addTextElement = (text = 'Your text here') => {
    const el: BoardElement = {
      id:         uid(),
      type:       'text',
      x:          60,
      y:          60,
      width:      200,
      height:     60,
      rotation:   0,
      zIndex:     elements.length,
      text,
      fontSize:   24,
      fontFamily: 'DMSans-Bold',
      color:      '#111111',
      bgColor:    'transparent',
      opacity:    1,
    };
    const updated = [...elements, el];
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
    setSelected(el.id);
  };

  const addStickerElement = (emoji: string) => {
    const el: BoardElement = {
      id:       uid(),
      type:     'sticker',
      x:        80,
      y:        80,
      width:    72,
      height:   72,
      rotation: 0,
      zIndex:   elements.length,
      emoji,
      opacity:  1,
    };
    const updated = [...elements, el];
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
    setSelected(el.id);
  };

  const moveElement = (id: string, x: number, y: number) => {
    const updated = elements.map(e => e.id === id ? { ...e, x, y } : e);
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
  };

  const resizeElement = (id: string, width: number, height: number) => {
    const updated = elements.map(e => e.id === id ? { ...e, width, height } : e);
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
  };

  const rotateElement = (id: string, rotation: number) => {
    const updated = elements.map(e => e.id === id ? { ...e, rotation } : e);
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
  };

  const updateElementProp = (id: string, patch: Partial<BoardElement>) => {
    const updated = elements.map(e => e.id === id ? { ...e, ...patch } : e);
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
  };

  const deleteElement = (id: string) => {
    const updated = elements.filter(e => e.id !== id);
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
    if (selected === id) setSelected(null);
  };

  const bringForward = (id: string) => {
    const el  = elements.find(e => e.id === id);
    if (!el) return;
    const updated = elements.map(e =>
      e.id === id ? { ...e, zIndex: e.zIndex + 1 } : e,
    );
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
  };

  const sendBackward = (id: string) => {
    const el  = elements.find(e => e.id === id);
    if (!el) return;
    const updated = elements.map(e =>
      e.id === id ? { ...e, zIndex: Math.max(0, e.zIndex - 1) } : e,
    );
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
  };

  const duplicateElement = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const copy: BoardElement = { ...el, id: uid(), x: el.x + 20, y: el.y + 20, zIndex: elements.length };
    const updated = [...elements, copy];
    dispatch(setElements(updated));
    scheduleAutoSave(updated);
    setSelected(copy.id);
  };

  const saveNow = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    try {
      await updateBoardElements(boardId, elements);
      const board = boards.find(b => b.id === boardId);
      if (board) dispatch(updateBoard({ ...board, elements }));
    } finally {
      setSaving(false);
    }
  };

  const selectedElement = elements.find(e => e.id === selected) ?? null;
  const sortedElements  = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return {
    board: activeBoard,
    elements,
    sortedElements,
    selected,
    selectedElement,
    saving,
    setSelected,
    addImageElement,
    addTextElement,
    addStickerElement,
    moveElement,
    resizeElement,
    rotateElement,
    updateElementProp,
    deleteElement,
    bringForward,
    sendBackward,
    duplicateElement,
    saveNow,
  };
}
