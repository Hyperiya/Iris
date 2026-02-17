import React, { useEffect, useState } from 'react';
import './Styles/SongBackground.scss'; // We'll create this file for the animations

const SongBackground: React.FC<{ coverUrl: string }> = ({ coverUrl }) => {
  const [backgroundColors, setBackgroundColors] = useState<string[]>([]);
  
  // Previous color sampling code remains the same...
  useEffect(() => {
    const getColors = async () => {
      if (!coverUrl) return;
    
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
    
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
    
          const colors: string[] = [];
          const numSamples = 6;
    
          // Helper function to calculate color difference
          const colorDifference = (color1: string, color2: string) => {
            const r1 = parseInt(color1.slice(1, 3), 16);
            const g1 = parseInt(color1.slice(3, 5), 16);
            const b1 = parseInt(color1.slice(5, 7), 16);
            const r2 = parseInt(color2.slice(1, 3), 16);
            const g2 = parseInt(color2.slice(3, 5), 16);
            const b2 = parseInt(color2.slice(5, 7), 16);
            
            return Math.sqrt(
              Math.pow(r1 - r2, 2) + 
              Math.pow(g1 - g2, 2) + 
              Math.pow(b1 - b2, 2)
            );
          };
    
          // Function to check if a color is too similar to existing colors
          const isTooSimilar = (newColor: string, existingColors: string[]) => {
            const minDifference = 30; // Adjust this threshold as needed
            return existingColors.some(
              existingColor => colorDifference(newColor, existingColor) < minDifference
            );
          };
    
          // Get colors with similarity check
          let attempts = 0;
          const maxAttempts = 50;
    
          while (colors.length < numSamples && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * img.width);
            const y = Math.floor(Math.random() * img.height);
            
            const pixelData = ctx.getImageData(x, y, 1, 1).data;
            const color = `#${[...pixelData].slice(0, 3).map(x => x.toString(16).padStart(2, '0')).join('')}`;
            
            if (!isTooSimilar(color, colors)) {
              colors.push(color);
            }
            
            attempts++;
          }
    
          setBackgroundColors(colors);
        };
    
        img.src = coverUrl;
      } catch (error) {
        console.error('Error getting colors:', error);
      }
    };
    
    getColors();
  }, [coverUrl]);

  return (
    <div className="song-background-wrapper">
      <div 
        className="song-background animated-gradient"
        style={{
          '--color-1': backgroundColors[0] || '#1a1a1a',
          '--color-2': backgroundColors[1] || '#2c2c2c',
          '--color-3': backgroundColors[2] || '#3e3e3e',
          '--color-4': backgroundColors[3] || '#505050',
          '--color-5': backgroundColors[4] || '#626262',
          '--color-6': backgroundColors[5] || '#747474',
        } as React.CSSProperties}
      >
        <div className="background-overlay" />
      </div>
    </div>
  );
};

export default SongBackground;
