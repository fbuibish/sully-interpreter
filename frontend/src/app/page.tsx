"use client"
import sendTextThrouhgPipeline from '@/utils/pipeline';
import { useState, useRef } from 'react';

export default function Home() {
  const [transcript, setTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startRecording = async () => {
    try {
      setIsRecording(true);

      // Create AudioContext with 16kHz sample rate
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000
        }
      });

      // Create source node
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Load and create AudioWorklet with matching name
      await audioContextRef.current.audioWorklet.addModule('/audioProcessor.js');
      processorRef.current = new AudioWorkletNode(audioContextRef.current, 'audioProcessor');

      // Handle audio data from processor
      processorRef.current.port.onmessage = async (event) => {
        // Convert ArrayBuffer to base64
        const audioData = btoa(
          String.fromCharCode(...new Uint8Array(event.data))
        );
        
        // Send to our API
        await fetch('/api/streamTranscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioContent: audioData
          }),
        });
      };

      // Connect nodes
      sourceNodeRef.current.connect(processorRef.current);
      
      // Set up SSE for receiving transcripts
      eventSourceRef.current = new EventSource('/api/streamTranscription');
      eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('data', data);
        if (data.transcript) {
          const pipelineResult = sendTextThrouhgPipeline(data.transcript, 'en');
          console.log('pipelineResult', pipelineResult);
          setTranscript(prev => prev + ' ' + data.transcript);
        }
      };

    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-bold mb-2">Transcript:</h2>
        <p className="whitespace-pre-wrap">{transcript}</p>
      </div>
    </div>
  );
}
