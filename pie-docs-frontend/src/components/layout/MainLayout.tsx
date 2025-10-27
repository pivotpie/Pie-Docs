import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import ChatWidget from '@/components/common/ChatWidget'
import { selectLanguage } from '@/store/slices/authSlice'
import { useTheme } from '@/contexts/ThemeContext'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const language = useSelector(selectLanguage)
  const { theme } = useTheme()

  // Apply RTL/LTR direction based on language
  useEffect(() => {
    const direction = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dir = direction
    document.documentElement.lang = language
  }, [language])

  return (
    <div className="min-h-screen relative">
      {/* Background with gradient overlay - theme-aware */}
      <div className={`fixed inset-0 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
          : 'bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900'
      }`}>
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/40' : 'bg-black/20'}`}></div>
        {/* Animated background elements - theme-aware */}
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${
          theme === 'dark' ? 'bg-gray-600/10' : 'bg-blue-500/10'
        }`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 ${
          theme === 'dark' ? 'bg-gray-500/10' : 'bg-purple-500/10'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse delay-2000 ${
          theme === 'dark' ? 'bg-gray-700/10' : 'bg-indigo-500/10'
        }`}></div>
      </div>

      {/* Header with centered navigation */}
      <Header />

      {/* Main Content Area - Full Screen */}
      <main className="relative z-10 pt-16 min-h-screen">
        <div className="h-full">
          {/* Breadcrumb Navigation with glassmorphism */}
          <div className="glass border-b border-white/10 px-6 py-4">
            <Breadcrumb />
          </div>

          {/* Page Content with full screen utilization */}
          <div className="p-6 lg:p-8">
            <div className="max-w-none">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Chat Widget - Fixed bottom right */}
      <ChatWidget />
    </div>
  )
}