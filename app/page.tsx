'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Home, 
  Folder, 
  FileText, 
  Scissors, 
  Search, 
  Zap, 
  Star, 
  ArrowRight,
  Image as ImageIcon,
  Music,
  Mic,
  Eraser,
  Video,
  Download,
} from 'lucide-react'

export default function Dashboard() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f5f7fb',
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
        }}>
          C
        </div>

        {/* Nav Icons */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center',
        }}>
          {[
            { icon: Home, active: true },
            { icon: Folder, active: false },
            { icon: FileText, active: false },
            { icon: Scissors, active: false },
          ].map((item, i) => {
            const IconComponent = item.icon
            return (
              <button
                key={i}
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

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '20px 32px 32px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        marginLeft: '80px',
        width: 'calc(100% - 80px)',
      }}>
        {/* Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '12px',
        }}>
          <button style={{
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}>
            <Zap size={14} />
            Login
          </button>
        </div>

        {/* Hero Row */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '20px',
        }}>
          {/* Hero Left - Create new project */}
          <section style={{
            flex: '1.7',
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '20px',
            padding: '18px 24px',
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
              }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15, 23, 42, 0.15)',
                }}>
                  <Zap size={14} color="white" />
                </div>
                <span>Create new project in editor</span>
              </div>
              <p style={{
                fontSize: '12px',
                opacity: 0.9,
                margin: 0,
              }}>
                Start from scratch now
              </p>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              background: '#ffffff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
            }}>
              ›
            </div>
          </section>

          {/* Hero Right - Free Tools */}
          <section style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 6px 14px rgba(15, 23, 42, 0.04)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '14px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600',
              }}>
                <span>Try our</span>
                <span style={{ color: '#2563eb' }}>FREE</span>
                <span>Tools</span>
              </div>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: 0,
                maxWidth: '230px',
              }}>
                Audio balancer, video compressor, and more
              </p>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '999px',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#6b7280',
            }}>
              ›
            </div>
          </section>
        </div>

        {/* AutoClip + Quick Subtitles Row */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '20px',
        }}>
          {/* UGC Generator */}
          <Link href="/ugc-generator" style={{ textDecoration: 'none', flex: '1.4' }}>
            <section style={{
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.04)',
              padding: '16px 20px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(15, 23, 42, 0.04)'
            }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '12px',
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{
                      width: '75px',
                      height: '100px',
                      background: '#e5e7eb',
                      borderRadius: '14px',
                    }} />
                  ))}
                </div>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: '160px',
                    height: '80px',
                    borderRadius: '14px',
                    border: '1px dashed #d1d5db',
                    background: '#f9fafb',
                  }} />
                </div>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4px',
              }}>
                <div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    marginBottom: '2px',
                    color: '#111827',
                  }}>
                    UGC Generator
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                  }}>
                    Generate UGC video variants with AI captions
                  </div>
                </div>
                <button style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#2563eb',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: '1px solid #d1e0ff',
                  background: '#eff6ff',
                  cursor: 'pointer',
                }}>
                  Try Now ›
                </button>
              </div>
            </section>
          </Link>

          {/* Quick Subtitles */}
          <section style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 6px 14px rgba(15, 23, 42, 0.04)',
            padding: '16px 20px',
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '120px',
                height: '140px',
                borderRadius: '14px',
                background: '#e5e7eb',
              }} />
              <div style={{
                flex: 1,
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-start',
              }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    width: '70px',
                    height: '140px',
                    borderRadius: '14px',
                    background: '#e5e7eb',
                  }} />
                ))}
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  marginBottom: '2px',
                }}>
                  Quick Subtitles
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  Add viral-ready subtitles to your videos in seconds
                </div>
              </div>
              <button style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#2563eb',
                padding: '7px 14px',
                borderRadius: '999px',
                border: '1px solid #d1e0ff',
                background: '#eff6ff',
                cursor: 'pointer',
              }}>
                Try Now ›
              </button>
            </div>
          </section>
        </div>

        {/* Split / Reddit / Streamer Row */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '20px',
        }}>
          {[
            { title: 'Split Screen', desc: 'Classic tested & trusted split screen background' },
            { title: 'Reddit Videos', desc: 'Generate viral story videos with AI in seconds' },
            { title: 'Streamer Blur', desc: 'Format your video with our streamer blur template' },
          ].map((tool, i) => (
            <section key={i} style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.04)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{
                width: '100%',
                height: '100px',
                borderRadius: '14px',
                background: '#e5e7eb',
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    marginBottom: '2px',
                  }}>
                    {tool.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                  }}>
                    {tool.desc}
                  </div>
                </div>
                <button style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#2563eb',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: '1px solid #d1e0ff',
                  background: '#eff6ff',
                  cursor: 'pointer',
                }}>
                  Try Now ›
                </button>
              </div>
            </section>
          ))}
        </div>

        {/* Crayo Tools Section */}
        <div style={{
          marginBottom: '12px',
          fontSize: '13px',
          fontWeight: '600',
        }}>
          Crayo Tools
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: '14px',
        }}>
          {[
            { title: 'Image Generator', icon: ImageIcon },
            { title: 'Speech Enhancer', icon: Music },
            { title: 'Voiceover Generator', icon: Mic },
            { title: 'Background Remover', icon: Eraser },
            { title: 'VE03 Generator', icon: Video },
            { title: 'YouTube Downloader', icon: Download },
          ].map((tool, i) => {
            const IconComponent = tool.icon
            return (
              <div key={i} style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.03)',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  background: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                }}>
                  <IconComponent size={20} strokeWidth={2} />
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'center',
                  color: '#111827',
                }}>
                  {tool.title}
                </div>
              </div>
            )
          })}
        </div>
      </main>

    </main>
  )
}
