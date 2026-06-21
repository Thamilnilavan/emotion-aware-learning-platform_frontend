'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lightbulb, Download } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { toast } from 'sonner';
import { sessionAPI } from '@/services/api/sessions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { formatDate, formatDuration, getScoreColor, getEmotionEmoji } from '@/lib/utils';
import { EMOTION_COLORS } from '@/lib/constants';
import type { LearningSession } from '@/types';

interface SessionReportProps {
  sessionId: string;
}

export function SessionReport({ sessionId }: SessionReportProps) {
  const [session, setSession] = useState<LearningSession | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionAPI.getReport(sessionId)
      .then((res) => {
        setSession(res.data.session);
        setInsights(res.data.insights || []);
      })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-body">Session not found</div>;
  }

  const windows = session.windows || [];
  const summary = session.summary;

  const timelineData = {
    labels: windows.map((_, i) => `${(i * 0.5).toFixed(1)}m`),
    datasets: [{
      label: 'Engagement',
      data: windows.map((w) => w.score),
      borderColor: '#a556f0',
      backgroundColor: 'rgba(165, 86, 240, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: windows.map((w) => getScoreColor(w.score)),
    }],
  };

  const valenceData = {
    labels: windows.map((_, i) => `${(i * 0.5).toFixed(1)}m`),
    datasets: [{
      label: 'Valence',
      data: windows.map((w) => w.emotionValence),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      fill: true,
    }],
  };

  const emotionDist = summary.emotionDistribution
    ? Object.entries(typeof summary.emotionDistribution === 'object' ? summary.emotionDistribution : {})
    : [];

  const pieData = {
    labels: emotionDist.map(([e]) => e),
    datasets: [{
      data: emotionDist.map(([, v]) => v as number),
      backgroundColor: emotionDist.map(([e]) => EMOTION_COLORS[e] || '#a556f0'),
    }],
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 space-y-6 p-4 md:p-8">
          <div className="glass-card p-6 md:p-8">
            <p className="text-sm text-body">{session.endTime ? formatDate(session.endTime) : ''}</p>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <span className="rounded-2xl px-6 py-3 text-3xl font-bold text-white" style={{ backgroundColor: getScoreColor(summary.averageScore) }}>
                {summary.averageScore}%
              </span>
              <div className="flex flex-wrap gap-6 text-sm">
                <div><span className="text-body">Duration</span><p className="font-bold text-heading">{formatDuration(session.durationSeconds)}</p></div>
                <div><span className="text-body">Focus</span><p className="font-bold text-heading">{summary.focusPercentage}%</p></div>
                <div><span className="text-body">Distractions</span><p className="font-bold text-heading">{summary.totalDistractions}</p></div>
                <div><span className="text-body">Interventions</span><p className="font-bold text-heading">{summary.totalInterventions}</p></div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="mb-4 font-bold text-heading">Engagement Timeline</h3>
            <div className="h-[250px]">
              <Line data={timelineData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="mb-4 font-bold text-heading">Emotion Journey</h3>
              <div className="h-[200px]">
                <Line data={valenceData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1 } } }} />
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="mb-4 font-bold text-heading">Attention Heatmap</h3>
              <div className="flex h-8 gap-0.5 overflow-hidden rounded-xl">
                {windows.map((w, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      backgroundColor: w.attentionScore > 0.7 ? '#00838F' : w.attentionScore > 0.4 ? '#4DB6AC' : '#ef4444',
                    }}
                    title={`${(i * 0.5).toFixed(1)} min`}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-body">
                <span>Focused</span>
                <span>Distracted</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              { label: 'Peak Focus', value: summary.peakFocusMinute },
              { label: 'Dominant Emotion', value: `${getEmotionEmoji(summary.dominantEmotion)} ${summary.dominantEmotion}` },
              { label: 'Peak Score', value: `${summary.peakScore}%` },
              { label: 'Lowest Score', value: `${summary.lowestScore}%` },
              { label: 'Focus %', value: `${summary.focusPercentage}%` },
              { label: 'Interventions', value: summary.totalInterventions },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4">
                <p className="text-xs text-body">{stat.label}</p>
                <p className="font-bold text-heading">{stat.value}</p>
              </div>
            ))}
          </div>

          {emotionDist.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="mb-4 font-bold text-heading">Emotion Distribution</h3>
              <div className="mx-auto h-[200px] max-w-[300px]">
                <Doughnut data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {insights.map((insight, i) => (
              <div key={i} className="glass-card flex gap-3 p-5">
                <Lightbulb className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-heading">{insight}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <button onClick={() => toast.info('Coming soon')} className="flex items-center gap-2 rounded-2xl border px-6 py-3 text-sm font-semibold hover:bg-white/50">
              <Download className="h-4 w-4" /> Download Report
            </button>
            <Link href="/student/reports" className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover">View All Sessions</Link>
            <Link href="/student/dashboard" className="rounded-2xl border border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5">Start New Session</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
