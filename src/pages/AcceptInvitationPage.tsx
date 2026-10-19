import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import logoImg from '@/assets/logo.png';
import { Badge, buttonClass } from '@/components/ui';

const primaryBtn = buttonClass('primary', 'md', 'w-full').replace('h-9', 'h-10');
const secondaryBtn = buttonClass('secondary', 'md', 'w-full').replace('h-9', 'h-10');

interface InvitationDetails {
  token: string;
  email: string;
  projectName: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isRegistered: boolean;
}

function AcceptInvitationPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check your link.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get<{ data: InvitationDetails }>(
          `/invitations/verify?token=${token}`
        );
        const data = response.data.data;
        setDetails(data);

        // If user is logged in, and the invitation is already accepted, redirect them
        if (data.status === 'ACCEPTED') {
          setSuccess(true);
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
        }
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { error?: string } } };
        const msg = errorObj.response?.data?.error || 'Invalid or expired invitation token.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void verifyToken();
  }, [token, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      await api.post('/invitations/accept', { token });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      const msg = errorObj.response?.data?.error || 'Failed to accept invitation.';
      setError(msg);
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = () => {
    logout();
    // After logging out, reload or redirect to force correct login state
    if (details) {
      navigate(`/login?token=${token}&email=${encodeURIComponent(details.email)}`, { replace: true });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 font-sans sm:px-6">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
          <img alt="Pristine Logo" className="h-full w-full object-contain" src={logoImg} />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900">Pristine</span>
      </div>

      <div className="w-full max-w-[440px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <p className="m-0 text-sm text-slate-500">Verifying your invitation...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={18} />
            </span>
            <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900">Verification failed</h1>
            <p className="m-0 max-w-[340px] text-sm leading-relaxed text-slate-500">{error}</p>
            <button className={buttonClass('secondary', 'md', 'mt-2')} onClick={() => navigate('/dashboard')} type="button">
              Go to Dashboard
            </button>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </span>
            <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900">Welcome aboard!</h1>
            <p className="m-0 text-sm text-slate-600">
              You are now a member of <strong className="font-medium text-slate-900">{details?.projectName}</strong>.
            </p>
            <p className="m-0 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="animate-spin" size={12} /> Redirecting you to dashboard...
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-1.5">
              <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Project invitation</h1>
              <p className="m-0 text-sm text-slate-500">You have been invited to join a collaborative space on Pristine.</p>
            </div>

            <dl className="m-0 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-0.5">
                <dt className="text-xs text-slate-500">Project</dt>
                <dd className="m-0 truncate text-[15px] font-semibold text-slate-900">{details?.projectName}</dd>
              </div>
              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
                <div className="grid gap-1">
                  <dt className="text-xs text-slate-500">Role</dt>
                  <dd className="m-0">
                    <Badge tone={details?.role === 'ADMIN' ? 'dark' : 'neutral'}>
                      {details?.role === 'ADMIN' ? 'Admin' : 'Member'}
                    </Badge>
                  </dd>
                </div>
                <div className="grid min-w-0 gap-1">
                  <dt className="text-xs text-slate-500">Invited email</dt>
                  <dd className="m-0 truncate text-sm font-medium text-slate-800">{details?.email}</dd>
                </div>
              </div>
            </dl>

            {/* Auth check logic */}
            {user ? (
              user.email.toLowerCase() === details?.email.toLowerCase() ? (
                /* Logged in as correct user */
                <button className={primaryBtn} disabled={accepting} onClick={handleAccept} type="button">
                  {accepting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Accepting...
                    </>
                  ) : (
                    <>
                      Accept & Join Project <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                /* Logged in as WRONG user */
                <div className="grid gap-4">
                  <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={16} />
                    <div className="min-w-0 break-words">
                      You are logged in as <strong className="font-medium">{user.email}</strong>, but this invitation was sent to{' '}
                      <strong className="font-medium">{details?.email}</strong>.
                    </div>
                  </div>
                  <button className={secondaryBtn} onClick={handleLogout} type="button">
                    <LogOut size={16} /> Logout & Switch Accounts
                  </button>
                </div>
              )
            ) : (
              /* NOT logged in */
              <div className="grid gap-3">
                {details?.isRegistered ? (
                  <>
                    <button
                      className={primaryBtn}
                      onClick={() => navigate(`/login?token=${token}&email=${encodeURIComponent(details?.email || '')}`)}
                      type="button"
                    >
                      Login to Accept <ArrowRight size={16} />
                    </button>
                    <p className="m-0 text-center text-xs text-slate-500">An account already exists for {details?.email}.</p>
                  </>
                ) : (
                  <>
                    <button
                      className={primaryBtn}
                      onClick={() => navigate(`/register?token=${token}&email=${encodeURIComponent(details?.email || '')}`)}
                      type="button"
                    >
                      Create Account to Join <ArrowRight size={16} />
                    </button>
                    <p className="m-0 text-center text-xs text-slate-500">
                      You will be automatically added to the project after registration.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default AcceptInvitationPage;
