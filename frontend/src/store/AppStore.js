import React, { createContext, useContext, useReducer, useMemo } from 'react';

// 初始状态
const initialState = {
  ui: {
    selectedMenuKey: '1',
    isLoading: false,
    hasAnyModal: false
  },
  chat: {
    messages: [],
    inputValue: '',
    isConnected: false
  },
  data: {
    resumes: [],
    positions: [],
    companies: []
  }
};

// Action类型
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_MENU_KEY: 'SET_MENU_KEY',
  SET_MODAL_STATE: 'SET_MODAL_STATE',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  SET_INPUT_VALUE: 'SET_INPUT_VALUE',
  SET_CONNECTION_STATE: 'SET_CONNECTION_STATE',
  SET_RESUMES: 'SET_RESUMES',
  SET_POSITIONS: 'SET_POSITIONS',
  SET_COMPANIES: 'SET_COMPANIES'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload }
      };
      
    case ActionTypes.SET_MENU_KEY:
      return {
        ...state,
        ui: { ...state.ui, selectedMenuKey: action.payload }
      };
      
    case ActionTypes.SET_MODAL_STATE:
      return {
        ...state,
        ui: { ...state.ui, hasAnyModal: action.payload }
      };
      
    case ActionTypes.ADD_MESSAGE:
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, action.payload]
        }
      };
      
    case ActionTypes.UPDATE_MESSAGE:
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: state.chat.messages.map(msg => 
            msg.id === action.payload.id 
              ? { ...msg, ...action.payload.updates }
              : msg
          )
        }
      };
      
    case ActionTypes.SET_INPUT_VALUE:
      return {
        ...state,
        chat: { ...state.chat, inputValue: action.payload }
      };
      
    case ActionTypes.SET_CONNECTION_STATE:
      return {
        ...state,
        chat: { ...state.chat, isConnected: action.payload }
      };
      
    case ActionTypes.SET_RESUMES:
      return {
        ...state,
        data: { ...state.data, resumes: action.payload }
      };
      
    case ActionTypes.SET_POSITIONS:
      return {
        ...state,
        data: { ...state.data, positions: action.payload }
      };
      
    case ActionTypes.SET_COMPANIES:
      return {
        ...state,
        data: { ...state.data, companies: action.payload }
      };
      
    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider组件
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // 优化的actions
  const actions = useMemo(() => ({
    setLoading: (loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
    setMenuKey: (key) => dispatch({ type: ActionTypes.SET_MENU_KEY, payload: key }),
    setModalState: (hasModal) => dispatch({ type: ActionTypes.SET_MODAL_STATE, payload: hasModal }),
    addMessage: (message) => dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message }),
    updateMessage: (id, updates) => dispatch({ type: ActionTypes.UPDATE_MESSAGE, payload: { id, updates } }),
    setInputValue: (value) => dispatch({ type: ActionTypes.SET_INPUT_VALUE, payload: value }),
    setConnectionState: (connected) => dispatch({ type: ActionTypes.SET_CONNECTION_STATE, payload: connected }),
    setResumes: (resumes) => dispatch({ type: ActionTypes.SET_RESUMES, payload: resumes }),
    setPositions: (positions) => dispatch({ type: ActionTypes.SET_POSITIONS, payload: positions }),
    setCompanies: (companies) => dispatch({ type: ActionTypes.SET_COMPANIES, payload: companies })
  }), []);
  
  const value = useMemo(() => ({ state, actions }), [state, actions]);
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
};

export { ActionTypes };
