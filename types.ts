export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export interface Reminder {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export interface Note {
  id: string;
  content: string;
  createdAt: number;
  audioData?: string; // Base64 audio string
}

export interface MoodEntry {
  id: string;
  timestamp: number;
  score: number; // 1-5
  notes: string;
}

export interface MediaContent {
  type: 'image' | 'video' | 'text' | 'music';
  url?: string;
  content?: string;
  title?: string;
}

export interface GalleryItem {
  id: string;
  data: string; // Base64 string
  timestamp: number;
}

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'text' | 'image';
    timestamp: number;
    read: boolean;
}

export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'rose';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type CardStyle = 'glass' | 'solid' | 'minimal';

export interface ThemePreferences {
  primaryColor: ThemeColor;
  fontFamily: FontFamily;
  cardStyle: CardStyle;
  backgroundImage?: string; // URL of the background image
}

export interface WidgetPreferences {
  showVisualizer: boolean;
  showMood: boolean; // Kept for legacy compatibility, though moved to separate tab
  showSources: boolean;
  showGreeting: boolean;
}

export interface SpotifyAuth {
  accessToken: string;
  expirationTime: number; // Date.now() + expires_in * 1000
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  isAdultMode: boolean; // Toggle for "no filter"
  isHandsFree: boolean; // Toggle for "Hey Rio" wake word
  setupComplete: boolean;
  theme: ThemePreferences;
  widgets: WidgetPreferences;
  spotify?: SpotifyAuth;
  spotifyClientId?: string; // Custom Client ID
}

export interface AppData {
    tasks: Task[];
    reminders: Reminder[];
    notes: Note[];
    moods: MoodEntry[];
    gallery: GalleryItem[];
    friends: string[]; // List of User IDs
}

export type AppView = 'onboarding' | 'dashboard' | 'session';

export enum LiveStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}