/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { Link } from '../services/geminiService';

interface ContentDisplayProps {
  content: string;
  isLoading: boolean;
  onWordClick: (word: string) => void;
  links: Link[];
  usedLinks: Set<string>;
  onLinkUsed: (url: string) => void;
}

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 
  'how', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 
  'to', 'was', 'what', 'when', 'where', 'who', 'will', 'with'
]);

/**
 * Renders text with interactive words, turning each non-stop-word into a clickable button.
 */
const renderInteractiveWords = (
  text: string,
  baseKey: string,
  onWordClick: (word: string) => void
): React.ReactNode[] => {
  const parts = text.split(/(\s+)/); // Split on whitespace, keeping it.
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (part.trim() === '') {
      elements.push(<React.Fragment key={`${baseKey}-space-${index}`}>{part}</React.Fragment>);
      return;
    }
    
    const punctuationRegex = /[.,!?;:]+$/;
    const punctuationMatch = part.match(punctuationRegex);
    const punctuation = punctuationMatch ? punctuationMatch[0] : '';
    const word = punctuation ? part.slice(0, -punctuation.length) : part;

    if (STOP_WORDS.has(word.toLowerCase()) || word === '') {
      elements.push(<React.Fragment key={`${baseKey}-word-${index}`}>{part}</React.Fragment>);
    } else {
      elements.push(
        <React.Fragment key={`${baseKey}-word-${index}`}>
          <button
            onClick={() => onWordClick(word)}
            className="interactive-word"
            aria-label={`Learn more about ${word}`}
          >
            {word}
          </button>
          {punctuation}
        </React.Fragment>
      );
    }
  });

  return elements;
};

/**
 * Processes content to embed resource links and make other words interactive.
 */
const InteractiveContent: React.FC<{
  content: string;
  onWordClick: (word: string) => void;
  links: Link[];
  usedLinks: Set<string>;
  onLinkUsed: (url: string) => void;
}> = ({ content, onWordClick, links, usedLinks, onLinkUsed }) => {
  const elements = React.useMemo(() => {
    // Sort links by title length (desc) to match longest phrases first.
    const sortedLinks = [...links].sort((a, b) => b.title.length - a.title.length);
    
    // Start with the full content as a single string part.
    let contentParts: (string | React.ReactElement)[] = [content];

    // First Pass: Embed external resource links.
    for (const link of sortedLinks) {
      if (usedLinks.has(link.url)) continue;
      
      let linkPlaced = false;
      contentParts = contentParts.flatMap(part => {
        if (typeof part !== 'string' || linkPlaced) return part;
        
        const index = part.indexOf(link.title);
        if (index === -1) return part;
        
        linkPlaced = true;
        onLinkUsed(link.url);
        
        const before = part.substring(0, index);
        const after = part.substring(index + link.title.length);
        
        const result: (string | React.ReactElement)[] = [];
        if (before) result.push(before);
        result.push(
          <a href={link.url} key={link.url} target="_blank" rel="noopener noreferrer" className="interactive-word">
            {link.title}
          </a>
        );
        if (after) result.push(after);
        
        return result;
      });
    }

    // Second Pass: Process remaining string parts into interactive words.
    return contentParts.flatMap((part, index) => {
      if (typeof part === 'string') {
        return renderInteractiveWords(part, `part-${index}`, onWordClick);
      }
      return part; // It's already a React element (our <a> tag).
    });
    
  }, [content, links, usedLinks, onLinkUsed, onWordClick]);

  return <p style={{ margin: 0 }}>{elements}</p>;
};


const StreamingContent: React.FC<{ content: string }> = ({ content }) => (
  <p style={{ margin: 0 }}>
    {content}
    <span className="blinking-cursor">|</span>
  </p>
);

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, isLoading, onWordClick, links, usedLinks, onLinkUsed }) => {
  if (isLoading) {
    return <StreamingContent content={content} />;
  }
  
  if (content && links) {
    return <InteractiveContent content={content} onWordClick={onWordClick} links={links} usedLinks={usedLinks} onLinkUsed={onLinkUsed} />;
  }

  // Fallback for when content is present but links might not be (e.g. error states)
  if(content) {
    return <p style={{margin: 0}}>{renderInteractiveWords(content, 'fallback', onWordClick)}</p>;
  }

  return null;
};

export default ContentDisplay;