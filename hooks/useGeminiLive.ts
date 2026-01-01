import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio';
import { tools } from '../services/geminiTools';
import { UserProfile, Task, Reminder, Note, MediaContent } from '../types';
import { SpotifyService } from '../services/spotifyService';

interface UseGeminiLiveProps {
  userProfile: UserProfile;
  tasks: Task[];
  reminders: Reminder[];
  notes: Note[];
  onTaskAction: (action: string, title?: string, searchTerm?: string) => Promise<string>;
  onReminderAction: (action: string, title?: string, searchTerm?: string) => Promise<string>;
  onNoteAction: (action: string, content?: string) => Promise<string>;
  onMoodAction: (score: number, notes?: string) => Promise<string>;
  onSpotifyAction: (result: any) => void; // Callback to update UI with Spotify info
}

export const useGeminiLive = ({ 
  userProfile, 
  tasks, 
  reminders, 
  notes, 
  onTaskAction, 
  onReminderAction, 
  onNoteAction, 
  onMoodAction,
  onSpotifyAction
}: UseGeminiLiveProps) => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0); 
  const [outputVolume, setOutputVolume] = useState(1.0); 
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [mediaContent, setMediaContent] = useState<MediaContent | null>(null);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const sessionRef = useRef<any>(null);
  const aiClientRef = useRef<GoogleGenAI | null>(null);

  const tasksRef = useRef(tasks);
  const remindersRef = useRef(reminders);
  const notesRef = useRef(notes);
  const userProfileRef = useRef(userProfile);
  
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { remindersRef.current = reminders; }, [reminders]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = outputVolume;
    }
  }, [outputVolume]);

  const disconnect = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputContextRef.current) {
      await inputContextRef.current.close();
      inputContextRef.current = null;
    }
    audioQueueRef.current.forEach(source => source.stop());
    audioQueueRef.current.clear();
    
    if (outputContextRef.current) {
      await outputContextRef.current.close();
      outputContextRef.current = null;
      outputGainRef.current = null;
    }

    setStatus('disconnected');
    setIsSpeaking(false);
    setVolume(0);
    setSources([]);
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found in environment");
      
      aiClientRef.current = new GoogleGenAI({ apiKey });

      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (outputContextRef.current) {
          const gainNode = outputContextRef.current.createGain();
          gainNode.gain.value = outputVolume;
          gainNode.connect(outputContextRef.current.destination);
          outputGainRef.current = gainNode;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const hour = new Date().getHours();
      const timeOfDay = hour < 5 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
      
      const isAdult = userProfileRef.current.isAdultMode;
      const hasSpotify = !!userProfileRef.current.spotify?.accessToken;

      const baseTone = isAdult 
        ? "casual, unfiltered, raw, and highly expressive. You are a real friend, not a robot. Use profanity naturally if context warrants it." 
        : "supportive, energetic, teen-friendly, encouraging big sibling vibe. Strictly no profanity, but maintain high emotional energy.";
      
      const taskSummary = tasksRef.current.map(t => `- [Task] ${t.title} (${t.completed ? 'Done' : 'Pending'})`).join('\n');
      const reminderSummary = remindersRef.current.map(r => `- [Reminder] ${r.title}`).join('\n');
      const notesSummary = notesRef.current.map(n => `- [Note] ${n.content}`).join('\n');

      const systemInstruction = `
        You are Rio, a hyper-adaptive, emotionally intelligent voice assistant for ${userProfileRef.current.name}.
        
        VOICE GUIDELINES:
        - Be highly expressive. Do not speak in a monotone.
        - Vary your pitch, speed, and volume to match the emotional content. 
        - Show excitement for wins, empathy for struggles, and curiosity for new topics.
        - Actively listen and reflect feelings back to the user.
        
        CURRENT CONTEXT:
        - Time: ${timeOfDay} (Adjust your energy: High in morning, chill/warm in evening).
        - Persona: ${baseTone}
        - Spotify Linked: ${hasSpotify ? 'YES' : 'NO'}.
        
        CAPABILITIES:
        1. MUSIC (SPOTIFY):
           - If asked to play music, use 'spotifyControl' with action='search'.
           - If asked for top tracks, use 'spotifyControl' with action='get_top_tracks'.
           - Fallback to 'updateDisplay' (type='music') if Spotify fails or isn't linked.
        
        2. VISUALS & WEB SEARCH:
           - To GENERATE an image, use 'updateDisplay' with type='image' and pollinations.ai URL.
           - To SEARCH videos/images, use Google Search tool. If you find a video/image URL, use 'updateDisplay'.
        
        3. PRODUCTIVITY:
           - manageTasks, manageReminders, manageNotes.
        
        INTERACTION:
        Start by sensing the vibe. If unsure, ask "What's the vibe right now?"
        Keep responses concise (1-3 sentences max) unless explaining a concept.
        
        DATA:
        ${taskSummary}
        ${reminderSummary}
        ${notesSummary}
      `;

      const sessionPromise = aiClientRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: systemInstruction,
          tools: tools,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setStatus('connected');
            if (!inputContextRef.current) return;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            processor.onaudioprocess = (e) => {
              // User is speaking, clear old sources
              setSources([]); 

              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Check for grounding metadata (Search Results)
            if (message.serverContent?.groundingMetadata?.groundingChunks) {
              const chunks = message.serverContent.groundingMetadata.groundingChunks;
              const newSources = chunks
                .map((c: any) => c.web)
                .filter((w: any) => w)
                .map((w: any) => ({ title: w.title, uri: w.uri }));
              
              if (newSources.length > 0) {
                setSources(prev => {
                    const unique = [...prev];
                    newSources.forEach((ns: any) => {
                        if (!unique.find(u => u.uri === ns.uri)) unique.push(ns);
                    });
                    return unique;
                });
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current && outputGainRef.current) {
              setIsSpeaking(true);
              const ctx = outputContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBytes = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputGainRef.current);
              source.addEventListener('ended', () => {
                audioQueueRef.current.delete(source);
                if (audioQueueRef.current.size === 0) setIsSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioQueueRef.current.add(source);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let result = "Action executed.";
                try {
                  const args = fc.args as any;
                  if (fc.name === 'manageTasks') {
                    result = await onTaskAction(args.action, args.taskTitle, args.taskSearchTerm);
                  } else if (fc.name === 'manageReminders') {
                    result = await onReminderAction(args.action, args.title, args.searchTerm);
                  } else if (fc.name === 'manageNotes') {
                    result = await onNoteAction(args.action, args.content);
                  } else if (fc.name === 'logMood') {
                    result = await onMoodAction(args.score, args.notes);
                  } else if (fc.name === 'updateDisplay') {
                    setMediaContent({
                        type: args.type,
                        url: args.url,
                        content: args.content,
                        title: args.title
                    });
                    result = "Display updated.";
                  } else if (fc.name === 'spotifyControl') {
                    const token = userProfileRef.current.spotify?.accessToken;
                    if (!token) {
                        result = "Spotify not connected. Please ask user to connect in settings.";
                    } else {
                        if (args.action === 'search') {
                            const res = await SpotifyService.searchAndPlay(args.query, token, args.type || 'track');
                            if (res.success) {
                                result = res.message;
                                onSpotifyAction(res); // Notify UI to show player/meta
                            } else {
                                result = "Could not find that track on Spotify.";
                            }
                        } else if (args.action === 'get_top_tracks') {
                            const tracks = await SpotifyService.getTopTracks(token);
                            if (tracks.length > 0) {
                                const trackNames = tracks.map((t: any) => `${t.name} by ${t.artists.map((a:any) => a.name).join(', ')}`).join('\n');
                                result = `Here are your top tracks:\n${trackNames}`;
                            } else {
                                result = "No top tracks found or couldn't fetch them.";
                            }
                        } else {
                            result = await SpotifyService.controlPlayback(args.action, token);
                        }
                    }
                  }
                } catch (e) {
                  console.error("Tool execution error", e);
                  result = "Error executing tool.";
                }
                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result },
                    }
                  });
                });
              }
            }
          },
          onclose: () => { setStatus('disconnected'); setSources([]); setMediaContent(null); },
          onerror: (e) => { setStatus('error'); }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Connection failed", err);
      setStatus('error');
    }
  }, [onTaskAction, onReminderAction, onNoteAction, onMoodAction, outputVolume, onSpotifyAction]);

  return { connect, disconnect, status, isSpeaking, volume, outputVolume, setOutputVolume, sources, mediaContent };
};