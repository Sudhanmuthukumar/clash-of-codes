import React from 'react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="card-fortress border-amber-800/60 bg-stone-900/95 rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        <h3 className="text-xl font-bold font-fantasy text-amber-100 mb-2">{title}</h3>
        <p className="text-stone-300 text-sm mb-6 font-sans leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-xs">
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`${confirmStyle === 'danger' ? 'btn-danger' : 'btn-primary'} text-xs font-bold uppercase tracking-wider`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
