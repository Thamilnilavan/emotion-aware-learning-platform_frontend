'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, Camera, CameraOff, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { coursesAPI } from '@/services/api/dashboard';
import { sessionAPI } from '@/services/api/sessions';
import { useWebcam } from '@/hooks/useWebcam';
import { useEngagement } from '@/hooks/useEngagement';
import { useAdaptive } from '@/hooks/useAdaptive';
import { useAuth } from '@/contexts/AuthContext';
import { EngagementOverlay } from './EngagementOverlay';
import { InterventionAlert } from './InterventionAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEmotionEmoji } from '@/lib/utils';
import type { Course, FrameResult } from '@/types';

interface SessionPlayerProps {
  courseId: string;
}

export function SessionPlayer({ courseId }: SessionPlayerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('Neutral');
  const [isAttentive, setIsAttentive] = useState(true);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>(
    user?.preferences?.notificationSensitivity || 'medium'
  );
  const [contentIndex, setContentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { videoRef: webcamRef, canvasRef, cameraEnabled, error: camError, startCapture, stopCapture, toggleCamera } = useWebcam();
  const { currentScore, currentState, addFrame, countdown, windowHistory } = useEngagement(sessionId, sessionStarted);
  const { currentIntervention, dismissIntervention } = useAdaptive(currentState, currentScore, sensitivity);

  const currentContent = course?.content?.sort((a, b) => a.order - b.order)[contentIndex];

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  useEffect(() => {
    if (currentIntervention?.pauseVideo) setVideoPaused(true);
  }, [currentIntervention]);

  useEffect(() => {
    if (videoRef.current) {
      if (videoPaused) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    }
  }, [videoPaused]);

  useEffect(() => {
    async function init() {
      try {
        if (!user?.consent?.given) {
          router.push('/consent');
          return;
        }

        const courseRes = await coursesAPI.getMy();
        const found = courseRes.data.courses.find((c) => c._id === courseId);
        if (!found) {
          const allRes = await coursesAPI.getAll();
          const pub = allRes.data.courses.find((c) => c._id === courseId);
          setCourse(pub || null);
        } else {
          setCourse(found);
        }

        const sessionRes = await sessionAPI.start(courseId);
        setSessionId(sessionRes.data.sessionId);
        setSessionStarted(true);
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(message || 'Failed to start session');
        router.push('/student/dashboard');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [courseId, router, user]);

  const handleFrame = useCallback((result: FrameResult) => {
    setCurrentEmotion(result.emotion);
    setIsAttentive(result.attention !== false);
    addFrame(result);
  }, [addFrame]);

  useEffect(() => {
    if (sessionStarted) {
      startCapture(handleFrame);
    }
    return () => stopCapture();
  }, [sessionStarted, startCapture, stopCapture, handleFrame]);

  const endSession = async () => {
    stopCapture();
    if (sessionId) {
      try {
        const res = await sessionAPI.end(sessionId);
        router.push(`/student/reports/${res.data.session._id}`);
      } catch {
        router.push('/student/dashboard');
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
    setVideoPaused(!videoPaused);
    dismissIntervention();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex h-12 items-center justify-between bg-[#0B3D6B] px-4 text-white">
        <div className="flex items-center gap-3">
          <button onClick={endSession} className="rounded-lg p-1 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold">{course?.title || 'Learning Session'}</span>
        </div>
        <EngagementOverlay score={currentScore} state={currentState} compact />
      </div>

      {!cameraEnabled && (
        <div className="flex items-center justify-between bg-warning/20 px-4 py-2 text-sm">
          <span>AI monitoring paused — camera is off</span>
          <button onClick={toggleCamera} className="font-semibold text-primary">Turn camera back on</button>
        </div>
      )}

      {camError && (
        <div className="bg-danger/10 px-4 py-2 text-sm text-danger">{camError}</div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative flex flex-[7] flex-col">
          <div className="relative flex-1 bg-black">
            {currentContent?.contentType === 'youtube' ? (
              <iframe
                src={getYouTubeEmbedUrl(currentContent.url) || currentContent.url}
                className="h-full w-full"
                title={currentContent.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : currentContent?.contentType === 'video' ? (
              <video
                ref={videoRef}
                src={currentContent.url}
                className="h-full w-full object-contain"
                controls={false}
                onEnded={endSession}
              />
            ) : currentContent ? (
              <iframe src={currentContent.url} className="h-full w-full" title={currentContent.title} />
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                <p>No content available for this course</p>
              </div>
            )}
            <InterventionAlert
              intervention={currentIntervention}
              onDismiss={() => { dismissIntervention(); if (currentIntervention?.pauseVideo) setVideoPaused(false); }}
              onReplay={() => { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); } dismissIntervention(); setVideoPaused(false); }}
            />
          </div>
        </div>

        <div className="hidden w-[30%] flex-col border-l bg-white p-4 md:flex">
          <EngagementOverlay score={currentScore} state={currentState} emotion={currentEmotion} isAttentive={isAttentive} />
          <div className="mt-4 text-center">
            <p className="text-3xl">{getEmotionEmoji(currentEmotion)}</p>
            <p className="text-sm text-body">{currentEmotion}</p>
          </div>
          <div className="mt-4 rounded-2xl bg-background p-4 text-center">
            <p className="text-sm text-body">Next window in</p>
            <p className="text-2xl font-bold text-primary">{countdown}s</p>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">
            <p className="mb-2 text-xs font-semibold text-body">Recent Windows</p>
            {windowHistory.slice(-5).reverse().map((w, i) => (
              <div key={i} className="mb-2 rounded-xl bg-background px-3 py-2 text-xs">
                <span className="font-bold">{w.score}%</span> — {w.state}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-16 items-center justify-between border-t bg-white px-4 shadow-lg">
        <button onClick={togglePlay} className="rounded-full p-3 hover:bg-background">
          {videoPaused ? <Play className="h-6 w-6 text-primary" /> : <Pause className="h-6 w-6 text-primary" />}
        </button>
        <div className="flex items-center gap-3">
          <select
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value as 'low' | 'medium' | 'high')}
            className="rounded-xl border px-3 py-1.5 text-sm"
          >
            <option value="low">Low sensitivity</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={toggleCamera} className="rounded-full p-3 hover:bg-background">
            {cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5 text-danger" />}
          </button>
          <button onClick={endSession} className="flex items-center gap-1 rounded-xl bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">
            <LogOut className="h-4 w-4" /> Exit
          </button>
        </div>
      </div>

      <video ref={webcamRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
