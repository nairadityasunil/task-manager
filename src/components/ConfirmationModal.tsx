import { AlertTriangle, HelpCircle } from 'lucide-react';

import { Button, cn } from '@/components/ui';
import Modal from './Modal';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const isDanger = type === 'danger';

  return (
    <Modal
      footer={
        <>
          <Button disabled={isLoading} onClick={onCancel} variant="secondary">
            {cancelText}
          </Button>
          <Button
            className={isDanger ? '!border-transparent !bg-red-600 !text-white hover:!bg-red-700' : undefined}
            loading={isLoading}
            onClick={onConfirm}
            variant={isDanger ? 'danger' : 'primary'}
          >
            {confirmText}
          </Button>
        </>
      }
      maxWidth="max-w-[440px]"
      onClose={onCancel}
      title={title}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            isDanger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
          )}
        >
          {isDanger ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
        </div>
        <p className="m-0 pt-2 text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
