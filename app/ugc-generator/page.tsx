'use client'

import { useState } from 'react'
import Link from 'next/link'
import SimpleUGCGenerator from '@/components/SimpleUGCGenerator'
import { 
  Home, 
  Folder, 
  FileText, 
  Scissors, 
  Search, 
} from 'lucide-react'

export default function UGCGeneratorPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <main style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative',
    }}>
      {/* Sidebar - Fixed */}
      <aside style={{
        width: '80px',
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 10,
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '20px',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: 'white',
            cursor: 'pointer',
          }}>
            C
          </div>
        </Link>

        {/* Nav Icons */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center',
        }}>
          {[
            { icon: Home, active: false, href: '/' },
            { icon: Folder, active: false, href: '#' },
            { icon: FileText, active: false, href: '#' },
            { icon: Scissors, active: true, href: '/ugc-generator' },
          ].map((item, i) => {
            const IconComponent = item.icon
            return (
              <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: item.active ? '#111827' : '#6b7280',
                    padding: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#111827'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = item.active ? '#111827' : '#6b7280'
                  }}
                >
                  <IconComponent size={22} strokeWidth={item.active ? 2.5 : 2} />
                </button>
              </Link>
            )
          })}
        </div>

        {/* Search */}
        <div style={{
          marginTop: 'auto',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111827'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <Search size={20} strokeWidth={2} />
          </button>
          <div style={{
            fontSize: '10px',
            color: '#9ca3af',
            fontWeight: '500',
          }}>
            ⌘K
          </div>
        </div>
      </aside>

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              margin: '0 1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                fontSize: '1rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                color: '#111827',
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content - Simplified UGC Generator */}
      <div style={{ 
        flex: 1,
        marginLeft: '80px',
        width: 'calc(100% - 80px)',
        height: '100vh',
        overflow: 'hidden',
      }}>
        <SimpleUGCGenerator />
      </div>
    </main>
  )
}
