import React from 'react';
import { Presentation } from '../types';

interface SlideEditorProps {
  presentation: Presentation;
  onBack: () => void;
  onSave: () => void;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ presentation, onBack, onSave }) => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Slide Editor: {presentation.title}</h1>
      <button onClick={onBack} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Back to Welcome</button>
      <button onClick={onSave} className="bg-green-500 text-white px-4 py-2 rounded">Save Presentation</button>
      <div className="mt-4 p-4 border rounded">
        <h2 className="text-xl">Current Slide: {presentation.slides[0]?.title || 'No slides'}</h2>
        {/* TODO: Implement actual slide editing UI here */}
      </div>
    </div>
  );
};