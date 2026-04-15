'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/features/auth';
import SubjectDropdown, { Subject } from '@/features/browse/SubjectDropdown';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Step = 'education' | 'experience' | 'subjects' | 'review';
const STEPS: Step[] = ['education', 'experience', 'subjects', 'review'];

const STEP_LABELS: Record<Step, string> = {
  education:  'Education',
  experience: 'Experience',
  subjects:   'Subjects',
  review:     'Review & Submit',
};

interface FormData {
  educationBackground: string;
  teachingExperience:  string;
  whyTutor:            string;
  qualifications:      string;
  subjects:            Subject[];
}

export default function ApplyFormPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>('education');
  const [form, setForm]               = useState<FormData>({
    educationBackground: '',
    teachingExperience:  '',
    whyTutor:            '',
    qualifications:      '',
    subjects:            [],
  });
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hydrating,  setHydrating]  = useState(true);

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!user)                           { router.replace('/signin');       return; }
    if (user.role === 'student')         { router.replace('/apply');        return; }
    if (user.role === 'tutor')           { router.replace('/dashboard/tutor'); return; }
    if (user.role === 'admin')           { router.replace('/admin');        return; }
  }, [user, isLoading, router]);

  // Load existing draft
  const loadDraft = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/tutor-applications/my-application`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success && data.application) {
        const app = data.application;

        // If already submitted/approved/rejected — redirect to status
        if (['seen', 'under_review', 'approved', 'rejected'].includes(app.status)) {
          router.replace('/apply/status');
          return;
        }

        setForm(prev => ({
          ...prev,
          educationBackground: app.educationBackground ?? '',
          teachingExperience:  app.teachingExperience  ?? '',
          whyTutor:            app.whyTutor            ?? '',
          qualifications:      app.qualifications      ?? '',
          subjects:            (app.subjects ?? []).map((s: any) => ({
            id:         s.id,
            name:       s.name,
            category:   s.category,
            tutorCount: 0,
          })),
        }));
      }
    } catch { /* silent — form starts empty */ }
    finally { setHydrating(false); }
  }, [router]);

  useEffect(() => {
    if (!isLoading && user?.role === 'tutor_applicant') {
      loadDraft();
    }
  }, [isLoading, user, loadDraft]);

  // Save draft to backend (PATCH)
  async function saveDraft(data: Partial<FormData>) {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/tutor-applications/my-application`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          educationBackground: data.educationBackground,
          teachingExperience:  data.teachingExperience,
          whyTutor:            data.whyTutor,
          qualifications:      data.qualifications,
          subjectIds:          data.subjects?.map(s => s.id),
        }),
      });
    } catch { /* silent — draft save is best-effort */ }
    finally { setSaving(false); }
  }

  function stepIndex(step: Step) { return STEPS.indexOf(step); }

  async function handleNext() {
    setError(null);

    // Validate current step
    if (currentStep === 'education' && !form.educationBackground.trim()) {
      setError('Please describe your educational background.'); return;
    }
    if (currentStep === 'experience' && !form.teachingExperience.trim()) {
      setError('Please describe your teaching experience.'); return;
    }
    if (currentStep === 'experience' && !form.whyTutor.trim()) {
      setError('Please tell us why you want to tutor.'); return;
    }
    if (currentStep === 'subjects' && form.subjects.length === 0) {
      setError('Please select at least one subject.'); return;
    }

    // Save draft on each step transition
    await saveDraft(form);

    const next = STEPS[stepIndex(currentStep) + 1];
    if (next) setCurrentStep(next);
  }

  function handleBack() {
    setError(null);
    const prev = STEPS[stepIndex(currentStep) - 1];
    if (prev) setCurrentStep(prev);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      // Save final draft first
      await saveDraft(form);

      // Then formally submit
      const res  = await fetch(`${API_URL}/api/tutor-applications/submit`, {
        method:      'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const missing = data.missing?.join(', ');
        throw new Error(missing
          ? `Please complete: ${missing}`
          : data.error || 'Submission failed'
        );
      }

      router.push('/apply/status');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  const stepIdx  = stepIndex(currentStep);
  const isFirst  = stepIdx === 0;
  const isLast   = currentStep === 'review';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-xs uppercase tracking-widest">
            Step {stepIdx + 1} of {STEPS.length}
          </p>
          {saving && (
            <span className="flex items-center gap-1.5 text-white/25 text-xs">
              <Loader2 size={11} className="animate-spin" /> Saving…
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= stepIdx ? 'bg-orange-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <p className="text-white font-semibold text-lg">{STEP_LABELS[currentStep]}</p>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="panel rounded-3xl p-6 space-y-5"
        >

          {/* ── Step: Education ── */}
          {currentStep === 'education' && (
            <>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Educational Background <span className="text-orange-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={form.educationBackground}
                  onChange={e => setForm(f => ({ ...f, educationBackground: e.target.value }))}
                  placeholder="Describe your academic background — degrees, certifications, CSEC/CAPE results, etc."
                  className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none outline-none focus:ring-1 focus:ring-orange-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Qualifications <span className="text-white/30 text-xs">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.qualifications}
                  onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))}
                  placeholder="Any additional certifications, awards, or relevant qualifications"
                  className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none outline-none focus:ring-1 focus:ring-white/20 transition"
                />
              </div>
            </>
          )}

          {/* ── Step: Experience ── */}
          {currentStep === 'experience' && (
            <>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Teaching Experience <span className="text-orange-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={form.teachingExperience}
                  onChange={e => setForm(f => ({ ...f, teachingExperience: e.target.value }))}
                  placeholder="Have you tutored, taught, or helped others before? Describe your experience — formal or informal."
                  className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none outline-none focus:ring-1 focus:ring-orange-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Why do you want to tutor? <span className="text-orange-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.whyTutor}
                  onChange={e => setForm(f => ({ ...f, whyTutor: e.target.value }))}
                  placeholder="What motivates you to help students? What makes you a good fit for ASSI?"
                  className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none outline-none focus:ring-1 focus:ring-orange-500/50 transition"
                />
              </div>
            </>
          )}

          {/* ── Step: Subjects ── */}
          {currentStep === 'subjects' && (
            <div className="space-y-4">
              <p className="text-white/55 text-sm">
                Select the subjects you're confident teaching. You can always add more after approval.
              </p>
              <SubjectDropdown
                selected={form.subjects[0] ?? null}
                onSelect={subject => {
                  setForm(f => {
                    const already = f.subjects.some(s => s.id === subject.id);
                    if (already) return f;
                    return { ...f, subjects: [...f.subjects, subject] };
                  });
                }}
              />
              {form.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.subjects.map(s => (
                    <span
                      key={s.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        bg-orange-500/15 border border-orange-500/25 text-orange-300"
                    >
                      <BookOpen size={10} />
                      {s.name}
                      {s.category && <span className="text-orange-400/60">· {s.category}</span>}
                      <button
                        onClick={() => setForm(f => ({ ...f, subjects: f.subjects.filter(x => x.id !== s.id) }))}
                        className="ml-1 text-orange-400/50 hover:text-orange-400 transition text-sm leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {form.subjects.length === 0 && (
                <p className="text-white/25 text-xs">No subjects selected yet</p>
              )}
            </div>
          )}

          {/* ── Step: Review ── */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <p className="text-white/55 text-sm">
                Review your application before submitting. Once submitted, our team will review it within 24–48 hours.
              </p>

              {[
                { label: 'Educational Background', value: form.educationBackground },
                { label: 'Teaching Experience',    value: form.teachingExperience },
                { label: 'Why I want to tutor',    value: form.whyTutor },
                ...(form.qualifications ? [{ label: 'Qualifications', value: form.qualifications }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="glass-soft rounded-xl p-4 space-y-1">
                  <p className="text-white/35 text-xs font-semibold uppercase tracking-widest">{label}</p>
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
                </div>
              ))}

              <div className="glass-soft rounded-xl p-4 space-y-2">
                <p className="text-white/35 text-xs font-semibold uppercase tracking-widest">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {form.subjects.map(s => (
                    <span key={s.id} className="px-2.5 py-1 rounded-full text-xs bg-orange-500/15 border border-orange-500/25 text-orange-300">
                      {s.name} {s.category && `· ${s.category}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/45 text-xs leading-relaxed">
                  By submitting, you confirm that all information provided is accurate. Submitting false information may result in disqualification.
                </p>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-red-400 text-sm px-1"
        >
          {error}
        </motion.p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleBack}
          disabled={isFirst || submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass-soft text-white/60 hover:text-white/90 disabled:opacity-30 transition text-sm"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition"
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
              : <><CheckCircle size={15} /> Submit Application</>
            }
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <>Next <ChevronRight size={16} /></>
            }
          </button>
        )}
      </div>
    </div>
  );
}