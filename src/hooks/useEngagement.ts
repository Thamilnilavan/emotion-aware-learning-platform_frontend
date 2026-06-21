'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { sessionAPI } from '@/services/api/sessions';
import aiService from '@/services/api/ai';
import type { FrameResult } from '@/types';

const WINDOW_SECONDS = parseInt(process.env.NEXT_PUBLIC_WINDOW_SECONDS || '30', 10);

interface WindowHistoryItem {
  score: number;
  state: string;
  timestamp: number;
}

export function useEngagement(sessionId: string | null, enabled = true) {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentState, setCurrentState] = useState('ENGAGED');
  const [windowHistory, setWindowHistory] = useState<WindowHistoryItem[]>([]);
  const [countdown, setCountdown] = useState(WINDOW_SECONDS);

  const frameBuffer = useRef<FrameResult[]>([]);
  const negativeCount = useRef(0);
  const windowInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const addFrame = useCallback((frameResult: FrameResult) => {
    frameBuffer.current.push(frameResult);
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? WINDOW_SECONDS : prev - 1));
    }, 1000);

    windowInterval.current = setInterval(async () => {
      if (frameBuffer.current.length === 0) return;

      const buffer = [...frameBuffer.current];
      frameBuffer.current = [];
      setCountdown(WINDOW_SECONDS);

      try {
        // Use new AI service for engagement calculation
        const sessionData = {
          attention_scores: buffer.map(f => f.attention ? 1 : 0),
          emotions: buffer.map(f => f.emotion || 'Neutral'),
          emotion_confidences: buffer.map(f => f.confidence || 0.5),
          timestamps: buffer.map(f => f.timestamp || Date.now())
        };

        const engagementResult = await aiService.calculateEngagement(
          { session_data: sessionData },
          WINDOW_SECONDS
        );

        const score = engagementResult.engagement_score || 0;
        const state = engagementResult.recommendation || 'ENGAGED';
        const dominant_emotion = engagementResult.breakdown?.emotion_contribution ? 'Neutral' : 'Neutral';
        const avg_attention = engagementResult.breakdown?.attention_contribution || 0.5;
        const avg_valence = 0.6; // Would come from emotion valence
        const avg_interaction = 0.5; // Would come from interaction data

        if (state === 'disengaged' || state === 'very_low_attention') {
          negativeCount.current += 1;
        } else {
          negativeCount.current = 0;
        }

        const avgAtt = avg_attention;
        const avgVal = avg_valence;
        const avgInt = avg_interaction;

        try {
          await sessionAPI.sendWindow(sessionId, {
            score,
            state,
            dominantEmotion: dominant_emotion,
            attentionScore: avgAtt,
            emotionValence: avgVal,
            interactionScore: avgInt,
          });
        } catch {
          // silently continue
        }

        setCurrentScore(score);
        setCurrentState(state);
        setWindowHistory((prev) => [...prev, { score, state, timestamp: Date.now() }]);
      } catch {
        // use last known score
      }
    }, WINDOW_SECONDS * 1000);

    return () => {
      if (windowInterval.current) clearInterval(windowInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [sessionId, enabled]);

  return { currentScore, currentState, windowHistory, addFrame, countdown };
}
