import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg) => addToast(msg, 'warning'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts, success, error, info, warning }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded shadow-lg flex items-center justify-between text-sm font-medium min-w-[250px] animate-fade-in-down border backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500 text-emerald-100' : ''}
              ${toast.type === 'error' ? 'bg-red-900/80 border-red-500 text-red-100' : ''}
              ${toast.type === 'info' ? 'bg-blue-900/80 border-blue-500 text-blue-100' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-900/80 border-yellow-500 text-yellow-100' : ''}
            `}
          >
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-4 opacity-70 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
