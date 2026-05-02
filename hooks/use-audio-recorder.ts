"use client";

import { useEffect, useRef, useState } from "react";
import {
  AUDIO_MAX_DURATION_MS,
  AUDIO_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";

type AudioDraft = {
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
  fileSize: number;
};

type RecorderState = {
  isRecording: boolean;
  durationMs: number;
  audioDraft: AudioDraft | null;
  error: string | null;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearDraft: () => void;
};

function pickMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

export function useAudioRecorder(): RecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [audioDraft, setAudioDraft] = useState<AudioDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    typeof MediaRecorder !== "undefined";

  function stopTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function clearTimer() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function clearDraft() {
    setAudioDraft((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      stopTracks();
      clearTimer();
      setIsRecording(false);
    }
  }

  async function startRecording() {
    if (!isSupported || isRecording) {
      return;
    }

    setError(null);
    clearDraft();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setDurationMs(0);
      setIsRecording(true);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const recordedDuration = Math.max(Date.now() - startTimeRef.current, 0);
        clearTimer();
        stopTracks();
        setIsRecording(false);
        setDurationMs(recordedDuration);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        chunksRef.current = [];

        if (blob.size === 0) {
          setError("Kayıt alınamadı. Lütfen tekrar dene.");
          return;
        }

        if (blob.size > AUDIO_MAX_FILE_SIZE_BYTES) {
          setError("Sesli mesaj fazla büyük. Lütfen daha kısa bir kayıt al.");
          return;
        }

        const url = URL.createObjectURL(blob);
        setAudioDraft({
          blob,
          url,
          durationMs: recordedDuration,
          mimeType: recorder.mimeType || "audio/webm",
          fileSize: blob.size,
        });
      });

      recorder.start();
      mediaRecorderRef.current = recorder;

      tickRef.current = window.setInterval(() => {
        const nextDuration = Date.now() - startTimeRef.current;
        setDurationMs(nextDuration);

        if (nextDuration >= AUDIO_MAX_DURATION_MS) {
          stopRecording();
        }
      }, 150);
    } catch {
      setError("Mikrofona erişilemedi. Tarayıcı iznini kontrol et.");
      stopTracks();
      clearTimer();
      setIsRecording(false);
    }
  }

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      clearTimer();
      stopTracks();
      if (audioDraft) {
        URL.revokeObjectURL(audioDraft.url);
      }
    };
  }, [audioDraft]);

  return {
    isRecording,
    durationMs,
    audioDraft,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearDraft,
  };
}
