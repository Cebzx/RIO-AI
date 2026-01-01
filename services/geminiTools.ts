import { FunctionDeclaration, Type } from '@google/genai';

export const manageTasksTool: FunctionDeclaration = {
  name: 'manageTasks',
  description: 'Create, update, or remove a task in the user\'s todo list.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['create', 'complete', 'delete'],
        description: 'The action to perform on the task.'
      },
      taskTitle: {
        type: Type.STRING,
        description: 'The content/title of the task. Required for creation.'
      },
      taskSearchTerm: {
        type: Type.STRING,
        description: 'A search term to find a task to complete or delete.'
      }
    },
    required: ['action']
  }
};

export const manageRemindersTool: FunctionDeclaration = {
  name: 'manageReminders',
  description: 'Create, complete, or delete reminders.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['create', 'complete', 'delete'],
        description: 'Action to perform.'
      },
      title: {
        type: Type.STRING,
        description: 'The reminder content.'
      },
      searchTerm: {
        type: Type.STRING,
        description: 'Search term to find reminder.'
      }
    },
    required: ['action']
  }
};

export const manageNotesTool: FunctionDeclaration = {
  name: 'manageNotes',
  description: 'Create or delete personal notes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['create', 'delete'],
        description: 'Action to perform.'
      },
      content: {
        type: Type.STRING,
        description: 'The content of the note.'
      }
    },
    required: ['action']
  }
};

export const logMoodTool: FunctionDeclaration = {
  name: 'logMood',
  description: 'Log the user\'s current mood and energy level.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      score: {
        type: Type.NUMBER,
        description: 'Mood score from 1 (terrible) to 5 (amazing).'
      },
      notes: {
        type: Type.STRING,
        description: 'Brief description of why they feel this way.'
      }
    },
    required: ['score']
  }
};

export const updateDisplayTool: FunctionDeclaration = {
  name: 'updateDisplay',
  description: 'Update the visual display on the user\'s dashboard with an image, video, music player, or text.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['image', 'video', 'text', 'music'], description: 'Type of media to display.' },
      url: { type: Type.STRING, description: 'URL for media (e.g. YouTube, Spotify, TikTok, Apple Music).' },
      content: { type: Type.STRING, description: 'Text content if type is text.' },
      title: { type: Type.STRING, description: 'Short title for the display.' }
    },
    required: ['type']
  }
};

export const spotifyControlTool: FunctionDeclaration = {
  name: 'spotifyControl',
  description: 'Control Spotify playback, search for music, or get user\'s top tracks.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { 
        type: Type.STRING, 
        enum: ['play', 'pause', 'next', 'previous', 'search', 'get_top_tracks'], 
        description: 'The action to perform.' 
      },
      query: { 
        type: Type.STRING, 
        description: 'Search query for the song, artist, or playlist (only for "search" action).' 
      },
      type: {
        type: Type.STRING,
        enum: ['track', 'album', 'playlist'],
        description: 'Type of content to search for (default: track).'
      }
    },
    required: ['action']
  }
};

export const tools = [
    { 
      functionDeclarations: [manageTasksTool, manageRemindersTool, manageNotesTool, logMoodTool, updateDisplayTool, spotifyControlTool],
      googleSearch: {} 
    }
];