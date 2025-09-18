/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Import `Link` type and `RelevantLinks` component.
import React, { useState, useEffect, useCallback } from 'react';
import { getStructuredAnswer, AsciiArtData, generateAsciiArt, type Link } from './services/geminiService';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import AsciiArtDisplay from './components/AsciiArtDisplay';
import ContentDisplay from './components/ContentDisplay';
import ResourceLinks from './components/RelevantLinks';

// A curated list of "banger" words and phrases for the random button.
const PREDEFINED_WORDS = [
  // List 1
  'Balance', 'Harmony', 'Discord', 'Unity', 'Fragmentation', 'Clarity', 'Ambiguity', 'Presence', 'Absence', 'Creation', 'Destruction', 'Light', 'Shadow', 'Beginning', 'Ending', 'Rising', 'Falling', 'Connection', 'Isolation', 'Hope', 'Despair',
  // Complex phrases from List 1
  'Order and chaos', 'Light and shadow', 'Sound and silence', 'Form and formlessness', 'Being and nonbeing', 'Presence and absence', 'Motion and stillness', 'Unity and multiplicity', 'Finite and infinite', 'Sacred and profane', 'Memory and forgetting', 'Question and answer', 'Search and discovery', 'Journey and destination', 'Dream and reality', 'Time and eternity', 'Self and other', 'Known and unknown', 'Spoken and unspoken', 'Visible and invisible',
  // List 2
  'Zigzag', 'Waves', 'Spiral', 'Bounce', 'Slant', 'Drip', 'Stretch', 'Squeeze', 'Float', 'Fall', 'Spin', 'Melt', 'Rise', 'Twist', 'Explode', 'Stack', 'Mirror', 'Echo', 'Vibrate',
  // List 3
  'Gravity', 'Friction', 'Momentum', 'Inertia', 'Turbulence', 'Pressure', 'Tension', 'Oscillate', 'Fractal', 'Quantum', 'Entropy', 'Vortex', 'Resonance', 'Equilibrium', 'Centrifuge', 'Elastic', 'Viscous', 'Refract', 'Diffuse', 'Cascade', 'Levitate', 'Magnetize', 'Polarize', 'Accelerate', 'Compress', 'Undulate',
  // List 4
  'Liminal', 'Ephemeral', 'Paradox', 'Zeitgeist', 'Metamorphosis', 'Synesthesia', 'Recursion', 'Emergence', 'Dialectic', 'Apophenia', 'Limbo', 'Flux', 'Sublime', 'Uncanny', 'Palimpsest', 'Chimera', 'Void', 'Transcend', 'Ineffable', 'Qualia', 'Gestalt', 'Simulacra', 'Abyssal',
  // List 5
  'Existential', 'Nihilism', 'Solipsism', 'Phenomenology', 'Hermeneutics', 'Deconstruction', 'Postmodern', 'Absurdism', 'Catharsis', 'Epiphany', 'Melancholy', 'Nostalgia', 'Longing', 'Reverie', 'Pathos', 'Ethos', 'Logos', 'Mythos', 'Anamnesis', 'Intertextuality', 'Metafiction', 'Stream', 'Lacuna', 'Caesura', 'Enjambment'
];
const UNIQUE_WORDS = [...new Set(PREDEFINED_WORDS)];


/**
 * Creates a simple ASCII art bounding box as a fallback.
 * @param topic The text to display inside the box.
 * @returns An AsciiArtData object with the generated art.
 */
const createFallbackArt = (topic: string): AsciiArtData => {
  const displayableTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  const paddedTopic = ` ${displayableTopic} `;
  const topBorder = `┌${'─'.repeat(paddedTopic.length)}┐`;
  const middle = `│${paddedTopic}│`;
  const bottomBorder = `└${'─'.repeat(paddedTopic.length)}┘`;
  return {
    art: `${topBorder}\n${middle}\n${bottomBorder}`
  };
};

const App: React.FC = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [suggestion, setSuggestion] = useState<string>('');
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<AsciiArtData | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [usedLinks, setUsedLinks] = useState<Set<string>>(new Set());


  useEffect(() => {
    if (!currentTopic) return;

    let isCancelled = false;

    const fetchContentAndArt = async () => {
      // Set initial state for a clean page load
      setIsLoading(true);
      setError(null);
      setExplanation('');
      setSuggestion('');
      setLinks([]);
      setAsciiArt(null);
      setGenerationTime(null);
      setUsedLinks(new Set()); // Reset used links for new topic
      const startTime = performance.now();

      // Kick off ASCII art generation, but don't wait for it.
      generateAsciiArt(currentTopic)
        .then(art => {
          if (!isCancelled) {
            setAsciiArt(art);
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.error("Failed to generate ASCII art:", err);
            const fallbackArt = createFallbackArt(currentTopic);
            setAsciiArt(fallbackArt);
          }
        });

      try {
        const result = await getStructuredAnswer(currentTopic);
        if (!isCancelled) {
          setExplanation(result.explanation);
          setSuggestion(result.suggestion);
          setLinks(result.links);
        }
      } catch (e: unknown) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
          setError(errorMessage);
          setExplanation('');
          setSuggestion('');
          setLinks([]);
          console.error(e);
        }
      } finally {
        if (!isCancelled) {
          const endTime = performance.now();
          setGenerationTime(endTime - startTime);
          setIsLoading(false);
        }
      }
    };

    fetchContentAndArt();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTopic]);

  const changeTopic = useCallback((newTopic: string) => {
    const trimmedTopic = newTopic.trim();
    if (trimmedTopic && trimmedTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(trimmedTopic);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentTopic(trimmedTopic);
    }
  }, [currentTopic, history, historyIndex]);

  const handlePrevious = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentTopic(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleNext = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentTopic(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleSearch = useCallback((topic: string) => {
    changeTopic(topic);
  }, [changeTopic]);

  const handleRandom = useCallback(() => {
    setIsLoading(true); // Disable UI immediately
    setError(null);
    setExplanation('');
    setSuggestion('');
    setLinks([]);
    setAsciiArt(null);

    let randomWord = UNIQUE_WORDS[Math.floor(Math.random() * UNIQUE_WORDS.length)];

    // Prevent picking the same word twice in a row
    if (randomWord.toLowerCase() === currentTopic.toLowerCase()) {
      const currentIndex = UNIQUE_WORDS.findIndex(w => w.toLowerCase() === randomWord.toLowerCase());
      const nextIndex = (currentIndex + 1) % UNIQUE_WORDS.length;
      randomWord = UNIQUE_WORDS[nextIndex];
    }
    changeTopic(randomWord);
  }, [currentTopic, changeTopic]);
  
  const handleLinkUsed = useCallback((url: string) => {
    setUsedLinks(prev => {
      // Create a new Set to ensure React detects the state change.
      const newSet = new Set(prev);
      newSet.add(url);
      return newSet;
    });
  }, []);


  return (
    <div>
      <SearchBar onSearch={handleSearch} onRandom={handleRandom} isLoading={isLoading} />
      
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          INFINITE INFORMATION Page
        </h1>
        <AsciiArtDisplay artData={asciiArt} topic={currentTopic} />
      </header>
      
      <main>
        <div>
          {currentTopic && (
            <h2 style={{ marginBottom: '2rem', textTransform: 'capitalize' }}>
              {currentTopic}
            </h2>
          )}

          {error && (
            <div style={{ border: '1px solid #cc0000', padding: '1rem', color: '#cc0000' }}>
              <p style={{ margin: 0 }}>An Error Occurred</p>
              <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
            </div>
          )}
          
          {isLoading && !error && (
            <LoadingSkeleton />
          )}

          {!isLoading && !error && explanation && (
            <>
              <ContentDisplay 
                  content={explanation} 
                  isLoading={false}
                  onWordClick={changeTopic} 
                  links={links}
                  usedLinks={usedLinks}
                  onLinkUsed={handleLinkUsed}
              />
              {suggestion && (
                <div style={{ marginTop: '1.6rem' }}>
                  <ContentDisplay 
                    content={suggestion} 
                    isLoading={false}
                    onWordClick={changeTopic} 
                    links={links}
                    usedLinks={usedLinks}
                    onLinkUsed={handleLinkUsed}
                  />
                </div>
              )}
              <ResourceLinks links={links} />
            </>
          )}

          {!isLoading && !error && !explanation && history.length > 0 && (
            <div style={{ color: '#888', padding: '2rem 0' }}>
              <p>Content could not be generated.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="sticky-footer">
        <div className="footer-nav">
          <button onClick={handlePrevious} disabled={historyIndex <= 0}>
            ← Previous
          </button>
          <button onClick={handleNext} disabled={historyIndex >= history.length - 1}>
            Next →
          </button>
        </div>
        <p className="footer-text" style={{ margin: 0 }}>
          ∞ Page by <a href="https://x.com/dev_valladares" target="_blank" rel="noopener noreferrer">Dev Valladares</a> · Updated by <a href="https://github.com/keremsah2" target="_blank" rel="noopener noreferrer">CSI</a> · Generated by Gemini 2.5 Flash
          {generationTime && ` · ${Math.round(generationTime)}ms`}
        </p>
      </footer>
    </div>
  );
};

export default App;