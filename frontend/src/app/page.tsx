"use client"
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [transcript, setTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up function for SSE connection
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setTranscript(''); // Clear previous transcript

      // Set up SSE first
      eventSourceRef.current = new EventSource('/api/streamTranscription');
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received transcript:', data);
          if (data.transcript) {
            setTranscript(prev => {
              // Add newline for final transcripts
              const newText = data.final ? `${data.transcript}\n` : data.transcript;
              return prev + newText;
            });
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsRecording(false);
      };

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

      // Load and create AudioWorklet
      await audioContextRef.current.audioWorklet.addModule('/audioProcessor.js');
      processorRef.current = new AudioWorkletNode(audioContextRef.current, 'audioProcessor');

      // Handle audio data from processor
      processorRef.current.port.onmessage = async (event) => {
        // Convert ArrayBuffer to base64
        const audioData = btoa(
          String.fromCharCode(...new Uint8Array(event.data))
        );
        
        // Send to our API
        try {
          const response = await fetch('/api/streamTranscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioContent: audioData
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          console.error('Error sending audio data:', error);
        }
      };

      // Connect nodes
      sourceNodeRef.current.connect(processorRef.current);

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
        <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">
          {transcript}
        </pre>
      </div>
    </div>
  );
}
