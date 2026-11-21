import React from "react";
import "./Toast.css";
import { IconCheckCircle, IconAlertCircle, IconInfo, IconAlertTriangle, IconX } from "./Icons";

export function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map((toast) => {
        const type = toast.type || "info";

        return (
          <div key={toast.id} className={`toast-card toast-${type}`}>
            <div className="toast-icon">
              {type === "success" && <IconCheckCircle size={20} />}
              {type === "error" && <IconAlertCircle size={20} />}
              {type === "warning" && <IconAlertTriangle size={20} />}
              {type === "info" && <IconInfo size={20} />}
            </div>

            <div className="toast-body">
              {toast.title && <h4 className="toast-title">{toast.title}</h4>}
              <p className="toast-message">{toast.message}</p>
            </div>

            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <IconX size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;

