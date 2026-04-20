'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AVATAR_OPTIONS = ['👤', '🧙', '🧝', '🧛', '🧚', '🦸', '🦹', '🤖', '👸', '🤴', '🧙‍♀️', '🧝‍♂️'];

export default function CreateCharacterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [quickBackstory, setQuickBackstory] = useState('');
  const [qualities, setQualities] = useState<string[]>([]);
  const [qualityInput, setQualityInput] = useState('');

  // AI-generated fields
  const [backstory, setBackstory] = useState('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [traits, setTraits] = useState<string[]>([]);
  const [appearance, setAppearance] = useState('');
  const [voice, setVoice] = useState('');

  const addQuality = () => {
    if (qualityInput.trim() && qualities.length < 10) {
      setQualities([...qualities, qualityInput.trim()]);
      setQualityInput('');
    }
  };

  const removeQuality = (index: number) => {
    setQualities(qualities.filter((_, i) => i !== index));
  };

  const generateWithAI = async () => {
    if (!name || !quickBackstory || qualities.length === 0) {
      alert('Please fill in name, quick backstory, and at least one quality');
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch('/api/roleplay/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quickBackstory,
          qualities,
          avatar,
          useAI: true,
        }),
      });

      const data = await res.json();
      if (data.character) {
        // Populate AI-generated fields
        setBackstory(data.character.backstory);
        setPersonality(data.character.personality);
        setTraits(data.character.traits);
        setAppearance(data.character.appearance);
        setVoice(data.character.voice);
        setStep(3); // Move to review step
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('AI generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const createCharacter = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roleplay/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          avatar,
          quickBackstory: backstory || quickBackstory,
          qualities,
          useAI: false,
        }),
      });

      const data = await res.json();
      if (data.character) {
        router.push('/roleplay');
      }
    } catch (error) {
      console.error('Character creation failed:', error);
      alert('Failed to create character');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-white">Create Character</h1>
            <p className="text-white/60">Step {step} of 3</p>
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>

            <div className="space-y-6">
              {/* Avatar Selection */}
              <div>
                <label className="block text-white mb-3 font-medium">Choose Avatar</label>
                <div className="grid grid-cols-6 gap-3">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setAvatar(emoji)}
                      className={`w-16 h-16 rounded-xl text-3xl flex items-center justify-center transition-all ${
                        avatar === emoji
                          ? 'bg-purple-500 scale-110'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-white mb-2 font-medium">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter character name..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Quick Backstory */}
              <div>
                <label className="block text-white mb-2 font-medium">Quick Backstory</label>
                <textarea
                  value={quickBackstory}
                  onChange={(e) => setQuickBackstory(e.target.value)}
                  placeholder="A brief description of who they are and their background..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              {/* Qualities */}
              <div>
                <label className="block text-white mb-2 font-medium">Key Qualities</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={qualityInput}
                    onChange={(e) => setQualityInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addQuality()}
                    placeholder="Add a quality (brave, cunning, kind...)"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
                  />
                  <Button
                    onClick={addQuality}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {qualities.map((quality, i) => (
                    <span
                      key={i}
                      onClick={() => removeQuality(i)}
                      className="px-3 py-1 bg-purple-500/30 rounded-full text-white text-sm cursor-pointer hover:bg-red-500/30"
                    >
                      {quality} ×
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={() => setStep(2)}
                disabled={!name || !quickBackstory || qualities.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Continue Manually
              </Button>
              <Button
                onClick={generateWithAI}
                disabled={!name || !quickBackstory || qualities.length === 0 || aiGenerating}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {aiGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Manual Details (skipped if AI generated) */}
        {step === 2 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Character Details</h2>
            <p className="text-white/60 mb-6">Fill in the details manually or go back to use AI generation</p>

            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-medium">Full Backstory</label>
                <textarea
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  placeholder="Detailed character backstory..."
                  rows={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Physical Appearance</label>
                <textarea
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Describe their physical appearance..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Voice & Speech</label>
                <textarea
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  placeholder="How do they speak? Accent, tone, mannerisms..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                onClick={createCharacter}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {loading ? 'Creating...' : 'Create Character'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: AI Review */}
        {step === 3 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">AI Generated Profile</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">Backstory</h3>
                <p className="text-white/80">{backstory}</p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Personality Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {personality.map((trait, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-500/30 rounded-full text-white text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Character Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait, i) => (
                    <span key={i} className="px-3 py-1 bg-pink-500/30 rounded-full text-white text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Appearance</h3>
                <p className="text-white/80">{appearance}</p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Voice & Speech</h3>
                <p className="text-white/80">{voice}</p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Start Over
              </Button>
              <Button
                onClick={createCharacter}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {loading ? 'Creating...' : 'Create Character'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
