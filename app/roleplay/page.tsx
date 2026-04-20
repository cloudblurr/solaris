'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkles, Users, BookOpen, Settings, Image, Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Character {
  id: string;
  name: string;
  avatar: string;
  backstory: string;
  personality: string[];
  traits: string[];
  appearance: string;
  memory_summary: string;
}

interface Session {
  id: string;
  character_id: string;
  mood: string;
  updated_at: string;
  character: Character;
  messages: any[];
}

export default function RoleplayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [view, setView] = useState<'characters' | 'chat' | 'lore' | 'gallery' | 'settings'>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadCharacters();
    }
  }, [status]);

  const loadCharacters = async () => {
    try {
      const res = await fetch('/api/roleplay/characters');
      const data = await res.json();
      setCharacters(data.characters || []);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (characterId: string) => {
    try {
      const res = await fetch(`/api/roleplay/sessions?characterId=${characterId}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async (characterId: string) => {
    try {
      const res = await fetch('/api/roleplay/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json();
      setSelectedSession(data.session);
      setView('chat');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const selectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    loadSessions(character.id);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-purple-300 animate-pulse mx-auto mb-4" />
          <p className="text-white text-xl">Loading Nimbus Roleplay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Sidebar */}
      <div className="w-20 bg-black/30 backdrop-blur-sm border-r border-white/10 flex flex-col items-center py-6 gap-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('characters')}
            className={`w-12 h-12 rounded-xl ${
              view === 'characters' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('chat')}
            disabled={!selectedSession}
            className={`w-12 h-12 rounded-xl ${
              view === 'chat' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('lore')}
            className={`w-12 h-12 rounded-xl ${
              view === 'lore' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('gallery')}
            className={`w-12 h-12 rounded-xl ${
              view === 'gallery' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Image className="w-5 h-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('settings')}
          className={`w-12 h-12 rounded-xl ${
            view === 'settings' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'characters' && (
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Characters</h1>
                  <p className="text-white/60">Create and manage your roleplay characters</p>
                </div>
                <Button
                  onClick={() => router.push('/roleplay/create-character')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Character
                </Button>
              </div>

              {characters.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-20 h-20 text-white/20 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">No characters yet</h3>
                  <p className="text-white/60 mb-6">Create your first character to start roleplaying</p>
                  <Button
                    onClick={() => router.push('/roleplay/create-character')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Character
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => selectCharacter(char)}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-purple-400 cursor-pointer transition-all hover:scale-105"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 mb-4 flex items-center justify-center text-3xl">
                        {char.avatar || '👤'}
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{char.name}</h3>
                      <p className="text-white/60 text-sm line-clamp-3 mb-4">{char.backstory}</p>
                      <div className="flex flex-wrap gap-2">
                        {char.personality.slice(0, 3).map((trait, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-500/30 rounded-full text-xs text-white">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'chat' && selectedSession && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/60">Chat interface coming soon...</p>
          </div>
        )}

        {view === 'lore' && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/60">Lore builder coming soon...</p>
          </div>
        )}

        {view === 'gallery' && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/60">Gallery coming soon...</p>
          </div>
        )}

        {view === 'settings' && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/60">Settings coming soon...</p>
          </div>
        )}
      </div>

      {/* Character Sessions Panel */}
      {selectedCharacter && view === 'characters' && (
        <div className="w-96 bg-black/30 backdrop-blur-sm border-l border-white/10 p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{selectedCharacter.name}</h2>
            <p className="text-white/60 text-sm mb-4">{selectedCharacter.appearance}</p>
            <Button
              onClick={() => createNewSession(selectedCharacter.id)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/60 uppercase">Recent Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-white/40 text-sm">No sessions yet</p>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => {
                    setSelectedSession(sess);
                    setView('chat');
                  }}
                  className="bg-white/5 rounded-lg p-3 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">Session</span>
                    <span className="text-white/40 text-xs">
                      {new Date(sess.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs">Mood: {sess.mood}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
