/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface ImageDisplayProps {
  imageUrl: string | null;
  topic: string;
  isLoading: boolean;
}

const ImageSkeleton: React.FC = () => (
  <div className="image-skeleton" aria-label="Loading image..." role="progressbar"></div>
);

const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, topic, isLoading }) => {
  if (isLoading) {
    return (
      <div className="image-container">
        <ImageSkeleton />
      </div>
    );
  }

  if (!imageUrl) {
    return null; // Don't render anything if loading is finished and there's no image
  }

  return (
    <div className="image-container">
      <img
        src={imageUrl}
        alt={`Artistic representation of ${topic}`}
        className="topic-image"
      />
    </div>
  );
};

export default ImageDisplay;
