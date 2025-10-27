/**
 * CommentsTool - Document Comments
 */

import React, { useState } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';

export const CommentsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  const [newComment, setNewComment] = useState('');
  const [comments] = useState([
    { id: 1, user: 'John Doe', time: '2 hours ago', text: 'Please review the liability clause on page 7' },
    { id: 2, user: 'Jane Smith', time: '1 day ago', text: 'Approved pending legal review' },
  ]);

  const handlePostComment = () => {
    if (newComment.trim()) {
      console.log('Posting comment:', newComment);
      // TODO: API call to post comment
      setNewComment('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handlePostComment();
    }
  };

  return (
    <ToolPageLayout title="Comments" icon="💬" onBack={onBack} className={className}>
      <div className="space-y-4">
        {/* New Comment Input */}
        <div className="glass-panel p-4 rounded-lg">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a comment... (Ctrl+Enter to post)"
            className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white placeholder-white/40 h-24 resize-none focus:outline-none focus:border-indigo-400"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-white/40">Press Ctrl+Enter to post</span>
            <button
              onClick={handlePostComment}
              disabled={!newComment.trim()}
              className="btn-glass px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Comment
            </button>
          </div>
        </div>

        {/* Comments List */}
        {comments.map((comment) => (
          <div key={comment.id} className="glass-panel p-4 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-500/30 rounded-full flex items-center justify-center text-sm">
                {comment.user[0]}
              </div>
              <div>
                <div className="text-white font-medium text-sm">{comment.user}</div>
                <div className="text-white/50 text-xs">{comment.time}</div>
              </div>
            </div>
            <div className="text-white/80 text-sm ml-10">{comment.text}</div>
          </div>
        ))}
      </div>
    </ToolPageLayout>
  );
};

export default CommentsTool;
