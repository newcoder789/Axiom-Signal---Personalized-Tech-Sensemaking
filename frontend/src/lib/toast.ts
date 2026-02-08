import toast, { Toaster } from 'react-hot-toast';

// Success toast
export const successToast = (message: string) => {
    toast.success(message, {
        duration: 3000,
        position: 'top-right',
        style: {
            background: '#151821',
            color: '#4ade80',
            border: '1px solid #4ade80',
        },
    });
};

// Error toast
export const errorToast = (message: string) => {
    toast.error(message, {
        duration: 4000,
        position: 'top-right',
        style: {
            background: '#151821',
            color: '#f87171',
            border: '1px solid #f87171',
        },
    });
};

// Loading toast
export const loadingToast = (message: string) => {
    return toast.loading(message, {
        position: 'top-right',
        style: {
            background: '#151821',
            color: '#fbbf24',
            border: '1px solid #fbbf24',
        },
    });
};

// Dismiss specific toast
export const dismissToast = (toastId: string) => {
    toast.dismiss(toastId);
};

export { Toaster };
