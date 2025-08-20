
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { XIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ message, type, onDismiss }: { message: string, type: ToastType, onDismiss: () => void }) => {
  const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
    error: <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />,
    info: <ExclamationTriangleIcon className="w-6 h-6 text-blue-500" />,
  };

  const typeClasses = {
    success: 'bg-green-900/80 border-green-700',
    error: 'bg-red-900/80 border-red-700',
    info: 'bg-blue-900/80 border-blue-700',
  };

  return (
    <div className={`flex items-start p-4 mb-4 rounded-lg shadow-lg backdrop-blur-md border ${typeClasses[type]} animate-fade-in-right`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-100">{message}</p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button onClick={onDismiss} className="inline-flex text-gray-400 hover:text-gray-100">
          <span className="sr-only">Close</span>
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};


export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nanoid();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 5000); // Auto-dismiss after 5 seconds
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
       <style>{`
        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
};
