/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { Link } from '../services/geminiService';

interface ResourceLinksProps {
  links: Link[];
}

const ResourceLinks: React.FC<ResourceLinksProps> = ({ links }) => {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="relevant-links">
      <h3>Resource Links:</h3>
      <ul>
        {links.map((link, index) => (
          <li key={index}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResourceLinks;