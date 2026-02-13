import React from 'react';
import { Coins } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

interface FinanceModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function FinanceModal({ open, onClose, title, children, footer }: FinanceModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="bg-brand-100/50 p-2 rounded-xl text-primary">
            <Coins className="w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold text-primary">{title}</span>
        </div>
      }
      footer={footer}
      maxWidth="md"
    >
      {children}
    </Modal>
  );
}
