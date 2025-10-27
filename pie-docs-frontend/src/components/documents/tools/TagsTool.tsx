/**
 * TagsTool - Document Tags management
 */

import React, { useState } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';

export const TagsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  const [tags, setTags] = useState<string[]>(document?.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <ToolPageLayout title="Document Tags" icon="🏷️" onBack={onBack} className={className}>
      <div className="glass-panel p-6 rounded-lg space-y-4">
        <div>
          <label className="text-sm text-white/80 mb-2 block">Current Tags</label>
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
            {tags.length === 0 ? (
              <p className="text-white/40 text-sm">No tags assigned</p>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm flex items-center gap-2 hover:bg-indigo-500/30 transition-colors"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/80 mb-2 block">Add New Tag</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter tag name..."
              className="flex-1 bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="btn-glass px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/80 mb-3">Suggested Tags</h4>
          <div className="flex flex-wrap gap-2">
            {['important', 'review', 'draft', 'archived', 'confidential'].map((suggestedTag) => (
              <button
                key={suggestedTag}
                onClick={() => {
                  if (!tags.includes(suggestedTag)) {
                    setTags([...tags, suggestedTag]);
                  }
                }}
                disabled={tags.includes(suggestedTag)}
                className="px-3 py-1 bg-white/5 text-white/70 rounded-full text-sm hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + {suggestedTag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default TagsTool;
