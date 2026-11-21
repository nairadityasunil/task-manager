import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/features/workspaces/context/WorkspaceContext';
import { Button, buttonClass } from '@/components/ui';
import logoImg from '@/assets/logo.png';
import {
  getProjectTransferDetails,
  acceptProjectTransfer,
  rejectProjectTransfer,
} from '@/services/projects';
import type { ProjectTransferRequest } from '@/types/project';

const primaryBtn = buttonClass('primary', 'md', 'w-full').replace('h-9', 'h-10');
const secondaryBtn = buttonClass('secondary', 'md', 'w-full').replace('h-9', 'h-10');

export default function ProjectTransferPage(): JSX.Element {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const defaultAction = searchParams.get('action');

  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ProjectTransferRequest | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No transfer token provided.');
      setLoading(false);
      return;
    }

    getProjectTransferDetails(token)
      .then((data) => {
        setDetails(data);
        if (data.status === 'ACCEPTED') {
          setSuccess('This project ownership transfer has already been accepted.');
        } else if (data.status === 'REJECTED') {
          setError('This project ownership transfer was rejected.');
        } else if (data.status === 'CANCELLED') {
          setError('This project ownership transfer request was cancelled by the owner.');
        }
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Invalid or expired transfer token.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setActioning(true);
    setError(null);
    try {
      await acceptProjectTransfer(token);
      await refreshWorkspaces();
      setSuccess('Project ownership transferred successfully! Redirecting...');
      setTimeout(() => {
        navigate(details?.projectId ? `/projects/${details.projectId}` : '/dashboard', {
          replace: true,
        });
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Failed to accept project transfer.';
      setError(msg);
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    setActioning(true);
    setError(null);
    try {
      await rejectProjectTransfer(token);
      setSuccess('Project ownership transfer request declined.');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Failed to decline transfer.';
      setError(msg);
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <img alt="Pristine" className="h-10 w-auto" src={logoImg} />
        </div>

        <h1 className="mb-2 text-center text-xl font-bold tracking-tight text-slate-900">
          Project Ownership Transfer
        </h1>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>{error}</div>
            </div>
            <Button className={secondaryBtn} onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        ) : success ? (
          <div className="space-y-4 text-center">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>{success}</div>
            </div>
            <Button className={primaryBtn} onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        ) : details ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-1 font-medium text-slate-900">
                {details.currentOwnerName} wants to transfer ownership of:
              </p>
              <p className="text-base font-semibold text-brand-600">{details.projectName}</p>
              {details.projectDescription ? (
                <p className="mt-1 text-xs text-slate-500">{details.projectDescription}</p>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              By accepting, this project will become part of your default workspace. All tasks,
              epics, time entries, and members will be moved with it.
            </p>

            {!user ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Please log in with <strong>{details.targetEmail}</strong> to accept this transfer.
                </div>
                <Button
                  className={primaryBtn}
                  onClick={() =>
                    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
                  }
                >
                  Log in to Accept
                </Button>
              </div>
            ) : user.email.toLowerCase() !== details.targetEmail.toLowerCase() ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  You are logged in as <strong>{user.email}</strong>, but this transfer was sent to{' '}
                  <strong>{details.targetEmail}</strong>.
                </div>
                <Button className={secondaryBtn} onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className={primaryBtn}
                  disabled={actioning}
                  icon={ArrowRight}
                  loading={actioning && defaultAction !== 'reject'}
                  onClick={handleAccept}
                >
                  Accept Ownership
                </Button>
                <Button
                  className={secondaryBtn}
                  disabled={actioning}
                  loading={actioning && defaultAction === 'reject'}
                  onClick={handleReject}
                >
                  Decline
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
