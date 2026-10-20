import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronRight, Compass, LayoutDashboard, BrainCircuit, Cable, BookOpen, Settings, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { emitEngagementEvent } from '@/lib/guide-runtime/GuideRuntimeProvider';

export function EngagementFab(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const tours = [
    {
      id: '6a568e52e1cd8bd8164aa601',
      title: 'Welcome & Dashboard',
      description: 'Navigate workspace & manage priorities',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa602',
      title: 'Semantic Intelligence',
      description: 'See how AI auto-prioritizes work',
      path: '/intelligence',
      icon: <BrainCircuit className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa603',
      title: 'SDK Integrations',
      description: 'Connect Zaikara SDK connections',
      path: '/sdk-integrations',
      icon: <Cable className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa604',
      title: 'SDK Documentation',
      description: 'Read setup guides & API schemas',
      path: '/sdk-docs',
      icon: <BookOpen className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa605',
      title: 'Portal Settings',
      description: 'Manage MFA & global AI keys',
      path: '/settings',
      icon: <Settings className="w-4 h-4 text-slate-600" />
    }
  ];

  const handleStartTour = (tourId: string, path: string) => {
    setIsOpen(false);
    if (location.pathname !== path) {
      navigate(path);
      setTimeout(() => {
        emitEngagementEvent('manual_tour', { tourId });
      }, 400);
    } else {
      emitEngagementEvent('manual_tour', { tourId });
    }
  };

  const handleStartSurvey = () => {
    setIsOpen(false);
    const surveyId = 'survey:6a4f8f67d9bd44b5e714b42b';
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
      setTimeout(() => {
        emitEngagementEvent('sync:analytics-event', { eventName: 'survey_triggered', surveyId });
      }, 400);
    } else {
      emitEngagementEvent('sync:analytics-event', { eventName: 'survey_triggered', surveyId });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-slate-950/20"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute bottom-16 right-0 z-[9999] w-[calc(100vw-32px)] max-w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                    <Sparkles className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="m-0 text-sm font-semibold leading-none text-slate-900">Pristine Guide</h3>
                    <p className="m-0 mt-1 text-xs text-slate-500">Manual triggers & tours</p>
                  </div>
                </div>
                <button
                  aria-label="Close"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 max-h-[350px] overflow-y-auto">
                <div className="px-3 py-1.5 text-xs font-medium text-slate-500">
                  Page Tours
                </div>
                <div className="space-y-1">
                  {tours.map((tour) => (
                    <button
                      key={tour.id}
                      onClick={() => handleStartTour(tour.id, tour.path)}
                      className="group flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        {tour.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900">
                          {tour.title}
                          {location.pathname === tour.path && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="m-0 mt-0.5 truncate text-xs text-slate-500">{tour.description}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                    </button>
                  ))}
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="px-3 py-1.5 text-xs font-medium text-slate-500">
                  User Surveys
                </div>
                <button
                  onClick={handleStartSurvey}
                  className="group flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <Smile className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-900">
                      NPS Pulse Survey
                    </div>
                    <p className="m-0 mt-0.5 truncate text-xs text-slate-500">Share your feedback about the portal</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
        title="View Product Tours"
        id="btn-trigger-guides-manual"
      >
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        <Compass className="h-5 w-5" />
      </button>
    </div>
  );
}