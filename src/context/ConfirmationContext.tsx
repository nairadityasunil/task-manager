import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import Modal from '../components/Modal';
import { Button, Field, Input } from '../components/ui';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

interface PromptOptions {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  /** Allow submitting an empty answer (default true). */
  optional?: boolean;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);
  const [promptState, setPromptState] = useState<{ options: PromptOptions; resolve: (value: string | null) => void } | null>(null);

  const prompt = useCallback(
    (promptOptions: PromptOptions): Promise<string | null> => new Promise((res) => setPromptState({ options: promptOptions, resolve: res })),
    []
  );
  const finishPrompt = useCallback(
    (value: string | null) => {
      promptState?.resolve(value);
      setPromptState(null);
    },
    [promptState]
  );

  const confirm = useCallback((confirmOptions: ConfirmOptions): Promise<boolean> => {
    setOptions(confirmOptions);
    setIsOpen(true);
    return new Promise((res) => {
      setResolve(() => res);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolve) resolve(true);
  }, [resolve]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolve) resolve(false);
  }, [resolve]);

  return (
    <ConfirmationContext.Provider value={{ confirm, prompt }}>
      {children}
      {promptState && <PromptModal options={promptState.options} onCancel={() => finishPrompt(null)} onSubmit={finishPrompt} />}
      {isOpen && (
        <ConfirmationModal
          title={options.title || (options.type === 'danger' ? 'Are you sure?' : 'Confirmation')}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          type={options.type}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmationContext.Provider>
  );
};

function PromptModal({ options, onCancel, onSubmit }: { options: PromptOptions; onCancel: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(options.defaultValue ?? '');
  const canSubmit = options.optional !== false || value.trim() !== '';
  return (
    <Modal
      description={options.message}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!canSubmit} form="prompt-dialog-form" type="submit" variant="primary">
            {options.confirmText ?? 'OK'}
          </Button>
        </>
      }
      maxWidth="max-w-[440px]"
      onClose={onCancel}
      title={options.title}
    >
      <form
        id="prompt-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit(value.trim());
        }}
      >
        <Field label={options.label ?? options.title}>
          <Input autoFocus onChange={(event) => setValue(event.target.value)} placeholder={options.placeholder} value={value} />
        </Field>
      </form>
    </Modal>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context.confirm;
};
/** Asks for a line of text in a styled dialog; resolves to the text, or null when cancelled. */
export const usePrompt = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('usePrompt must be used within a ConfirmationProvider');
  }
  return context.prompt;
};
