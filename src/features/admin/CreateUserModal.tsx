import { Copy } from 'lucide-react';
import { useState } from 'react';

import Modal from '@/components/Modal';
import { Button, Field, Input } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { adminApi } from './adminService';

/** Shows a password once, with a copy button. Used after creating a user and after resetting a password. */
export function TemporaryPassword({ email, password, onDone }: { email: string; password: string; onDone: () => void }): JSX.Element {
  const { showToast } = useToast();
  return (
    <Modal dismissOnBackdrop={false} onClose={onDone} title="Temporary password">
      <div className="grid gap-3" data-testid="temp-password">
        <p className="m-0 text-[13px] text-slate-600">
          Give this to <strong className="font-medium text-slate-900">{email}</strong>. It is shown only now and is not stored anywhere you can read it again. They should change it after signing in.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-[14px] text-slate-900" data-testid="temp-password-value">
            {password}
          </code>
          <Button
            icon={Copy}
            onClick={() => {
              void navigator.clipboard?.writeText(password).then(() => showToast({ variant: 'success', message: 'Copied' }));
            }}
            size="sm"
            variant="secondary"
          >
            Copy
          </Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={onDone} variant="primary">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (userId: string) => void }): JSX.Element {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; email: string; password: string } | null>(null);

  if (created) return <TemporaryPassword email={created.email} onDone={() => onCreated(created.id)} password={created.password} />;

  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await adminApi.createUser({ email: email.trim(), name: name.trim() || undefined });
      if (res.temporaryPassword) setCreated({ id: res.user.id, email: res.user.email, password: res.temporaryPassword });
      else onCreated(res.user.id);
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title="New user">
      <form
        className="grid gap-3"
        data-testid="create-user-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="m-0 text-[13px] text-slate-600">Creates an account with a temporary password that you hand over. To invite someone to a project instead, use the project&apos;s Team panel.</p>
        <Field label="Email">
          <Input autoFocus name="email" onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required type="email" value={email} />
        </Field>
        <Field label="Name (optional)">
          <Input name="name" onChange={(e) => setName(e.target.value)} placeholder="Full name" value={name} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={!email.trim()} loading={busy} type="submit" variant="primary">
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
