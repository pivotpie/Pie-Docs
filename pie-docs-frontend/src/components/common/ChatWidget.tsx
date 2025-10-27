import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function ChatWidget() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleOpenChat = () => {
    // Navigate to search page
    navigate('/search')
  }

  // Don't show widget on search page
  if (location.pathname === '/search' || location.pathname.startsWith('/search/')) {
    return null
  }

  return (
    <>
      {/* Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpenChat}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative flex items-center space-x-4 bg-gradient-to-r from-stone-600 to-red-900 hover:from-stone-700 hover:to-red-950 text-white px-8 py-6 rounded-2xl shadow-2xl hover:shadow-red-800/70 transition-all duration-300 transform hover:scale-105 border-2 border-white/30"
          aria-label="Chat with your Docs"
        >
          {/* Chat Icon */}
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>

          {/* Text Label */}
          <span className="font-bold text-base whitespace-nowrap">
            Chat with your Docs
          </span>

          {/* Pulse Animation */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-300 border-2 border-white"></span>
          </span>
        </button>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-black/90 text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
            AI-powered document search
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
          </div>
        )}
      </div>
    </>
  )
}
