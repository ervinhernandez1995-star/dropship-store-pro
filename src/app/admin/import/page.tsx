'use client'

import { useState } from 'react'

type ProductStatus = 'idle' | 'scraping' | 'processing' | 'importing' | 'done' | 'error'

interface Product {
  name: string
  description: string
  price: number
  cost_price: number
  category: string
  images: string[]
  source_url: string
  _keywords?: string[]
}

interface ImportedProduct {
  id: string
  name: string
  price: number
}

const STEPS = [
  { key: 'scraping', label: 'Extrayendo de AliExpress', icon: '🔍' },
  { key: 'processing', label: 'Procesando con IA (Groq)', icon: '🤖' },
  { key: 'importing', label: 'Importando a tu tienda', icon: '📦' },
  { key: 'done', label: 'Listo', icon: '✅' },
]

export default function AliExpressImporter() {
  const [mode, setMode] = useState<'url' | 'search'>('search')
  const [input, setInput] = useState('')
  const [maxItems, setMaxItems] = useState(10)
  const [margin, setMargin] = useState(40)
  const [status, setStatus] = useState<ProductStatus>('idle')
  const [currentStep, setCurrentStep] = useState(-1)
  const [scrapedProducts, setScrapedProducts] = useState<Product[]>([])
  const [processedProducts, setProcessedProducts] = useState<Product[]>([])
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([])
  const [error, setError] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())

  async function handleScrape() {
    if (!input.trim()) return
    setError('')
    setStatus('scraping')
    setCurrentStep(0)
    setScrapedProducts([])
    setProcessedProducts([])
    setImportedProducts([])

    try {
      // PASO 1: Scrapear AliExpress
      const scrapeBody = mode === 'url'
        ? { urls: input.split('\n').map(u => u.trim()).filter(Boolean), maxItems }
        : { searchQuery: input.trim(), maxItems }

      const scrapeRes = await fetch('/api/scraper/aliexpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapeBody),
      })
      const scrapeData = await scrapeRes.json()
      if (!scrapeRes.ok) throw new Error(scrapeData.error || 'Error en scraper')

      setScrapedProducts(scrapeData.products)
      setSelectedProducts(new Set(scrapeData.products.map((_: Product, i: number) => i)))

      // PASO 2: Procesar con Groq
      setStatus('processing')
      setCurrentStep(1)

      const processRes = await fetch('/api/scraper/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: scrapeData.products, margin }),
      })
      const processData = await processRes.json()
      if (!processRes.ok) throw new Error(processData.error || 'Error procesando con IA')

      setProcessedProducts(processData.products)
      setStatus('idle') // Pausar para que el usuario revise

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  async function handleImport() {
    const toImport = processedProducts.filter((_, i) => selectedProducts.has(i))
    if (toImport.length === 0) return

    setStatus('importing')
    setCurrentStep(2)
    setError('')

    try {
      const importRes = await fetch('/api/scraper/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: toImport }),
      })
      const importData = await importRes.json()
      if (!importRes.ok) throw new Error(importData.error || 'Error importando')

      setImportedProducts(importData.products)
      setStatus('done')
      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  function toggleProduct(i: number) {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function reset() {
    setStatus('idle')
    setCurrentStep(-1)
    setScrapedProducts([])
    setProcessedProducts([])
    setImportedProducts([])
    setError('')
    setInput('')
    setSelectedProducts(new Set())
  }

  const isLoading = ['scraping', 'processing', 'importing'].includes(status)
  const showReview = status === 'idle' && processedProducts.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e4f0',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: '0',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0533 0%, #0d1117 50%, #001a33 100%)',
        borderBottom: '1px solid rgba(139,92,246,0.2)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>🛒</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Importador AliExpress
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#8b7db0', marginTop: 2 }}>
            Extrae, procesa con IA y publica en tu tienda automáticamente
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Progress Steps */}
        {currentStep >= 0 && (
          <div style={{
            display: 'flex', gap: 0, marginBottom: 32,
            background: '#111118', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            {STEPS.map((step, i) => (
              <div key={step.key} style={{
                flex: 1, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
                background: i === currentStep
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(37,99,235,0.15))'
                  : i < currentStep ? 'rgba(124,58,237,0.08)' : 'transparent',
                borderRight: i < STEPS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'all 0.3s',
              }}>
                <span style={{ fontSize: 18 }}>
                  {i < currentStep ? '✅' : i === currentStep && isLoading ? '⏳' : step.icon}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: i === currentStep ? '#c4b5fd' : i < currentStep ? '#7c6fa0' : '#4a4560',
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Form inicial */}
        {status === 'idle' && processedProducts.length === 0 && (
          <div style={{
            background: '#111118',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.07)',
            padding: 32,
          }}>
            {/* Tabs modo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['search', 'url'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '8px 20px', borderRadius: 10, border: 'none',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                  background: mode === m ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : 'rgba(255,255,255,0.05)',
                  color: mode === m ? '#fff' : '#6b6385',
                }}>
                  {m === 'search' ? '🔎 Buscar por término' : '🔗 Pegar URLs'}
                </button>
              ))}
            </div>

            {/* Input principal */}
            {mode === 'search' ? (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#8b7db0', marginBottom: 8, fontWeight: 600 }}>
                  ¿Qué producto quieres importar?
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="ej: auriculares bluetooth, soporte para celular, lámpara led..."
                  onKeyDown={e => e.key === 'Enter' && handleScrape()}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 12, boxSizing: 'border-box',
                    background: '#1a1a25', border: '1px solid rgba(124,58,237,0.3)',
                    color: '#e8e4f0', fontSize: 15, outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#8b7db0', marginBottom: 8, fontWeight: 600 }}>
                  URLs de AliExpress (una por línea)
                </label>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="https://www.aliexpress.com/item/..."
                  rows={5}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 12, boxSizing: 'border-box',
                    background: '#1a1a25', border: '1px solid rgba(124,58,237,0.3)',
                    color: '#e8e4f0', fontSize: 14, outline: 'none', resize: 'vertical',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            )}

            {/* Controles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#8b7db0', marginBottom: 8, fontWeight: 600 }}>
                  Máx. productos: <span style={{ color: '#c4b5fd' }}>{maxItems}</span>
                </label>
                <input type="range" min={5} max={50} step={5} value={maxItems}
                  onChange={e => setMaxItems(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#7c3aed' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a4560', marginTop: 4 }}>
                  <span>5</span><span>50</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#8b7db0', marginBottom: 8, fontWeight: 600 }}>
                  Margen de ganancia: <span style={{ color: '#c4b5fd' }}>{margin}%</span>
                </label>
                <input type="range" min={10} max={150} step={5} value={margin}
                  onChange={e => setMargin(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#7c3aed' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a4560', marginTop: 4 }}>
                  <span>10%</span><span>150%</span>
                </div>
              </div>
            </div>

            <button onClick={handleScrape} disabled={!input.trim()} style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: input.trim() ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)' : '#1e1e2e',
              color: input.trim() ? '#fff' : '#4a4560',
              fontSize: 16, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.3px', transition: 'all 0.2s',
            }}>
              🚀 Iniciar importación
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div style={{
            background: '#111118', borderRadius: 20,
            border: '1px solid rgba(124,58,237,0.2)',
            padding: '60px 32px', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '3px solid rgba(124,58,237,0.2)',
              borderTop: '3px solid #7c3aed',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>
              {STEPS[currentStep]?.label}...
            </h3>
            <p style={{ margin: 0, color: '#6b6385', fontSize: 14 }}>
              {currentStep === 0 && 'Esto puede tardar 1-3 minutos dependiendo de la cantidad de productos'}
              {currentStep === 1 && 'Groq está generando nombres y descripciones optimizadas en español'}
              {currentStep === 2 && 'Guardando productos en tu base de datos Supabase'}
            </p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', borderRadius: 16,
            border: '1px solid rgba(239,68,68,0.25)', padding: 24, marginBottom: 24,
          }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#f87171' }}>❌ {error}</p>
            <button onClick={reset} style={{
              padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
              background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 13,
            }}>Intentar de nuevo</button>
          </div>
        )}

        {/* Revisión de productos */}
        {showReview && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  Revisa los productos ({processedProducts.length})
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b6385' }}>
                  {selectedProducts.size} seleccionados para importar
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setSelectedProducts(new Set(processedProducts.map((_, i) => i)))}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)', background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontSize: 13 }}>
                  Seleccionar todo
                </button>
                <button onClick={() => setSelectedProducts(new Set())}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b6385', cursor: 'pointer', fontSize: 13 }}>
                  Deseleccionar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {processedProducts.map((p, i) => (
                <div key={i} onClick={() => toggleProduct(i)} style={{
                  background: selectedProducts.has(i) ? 'rgba(124,58,237,0.08)' : '#111118',
                  border: `1px solid ${selectedProducts.has(i) ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14, padding: 18, cursor: 'pointer',
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  transition: 'all 0.15s',
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: selectedProducts.has(i) ? '#7c3aed' : 'transparent',
                    border: `2px solid ${selectedProducts.has(i) ? '#7c3aed' : '#3a3550'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    {selectedProducts.has(i) && '✓'}
                  </div>

                  {/* Imagen */}
                  {p.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name as string}
                      style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                      {p.name as string}
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b6385', lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {p.description as string}
                    </p>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#8b7db0' }}>
                        Costo: <span style={{ color: '#e8e4f0' }}>${Number(p.cost_price).toFixed(2)}</span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                        Venta: ${Number(p.price).toFixed(2)}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(124,58,237,0.15)', color: '#c4b5fd',
                      }}>
                        {p.category as string}
                      </span>
                    </div>
                    {p._keywords && p._keywords.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {p._keywords.map((kw: string, j: number) => (
                          <span key={j} style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 4,
                            background: 'rgba(37,99,235,0.12)', color: '#93c5fd',
                          }}>{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={reset} style={{
                padding: '14px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#6b6385', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}>
                ← Nueva búsqueda
              </button>
              <button onClick={handleImport} disabled={selectedProducts.size === 0} style={{
                flex: 1, padding: '14px', borderRadius: 12, border: 'none',
                background: selectedProducts.size > 0 ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#1e1e2e',
                color: selectedProducts.size > 0 ? '#fff' : '#4a4560',
                fontSize: 15, fontWeight: 700, cursor: selectedProducts.size > 0 ? 'pointer' : 'not-allowed',
              }}>
                📦 Importar {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''} a mi tienda
              </button>
            </div>
          </div>
        )}

        {/* Éxito */}
        {status === 'done' && (
          <div style={{
            background: '#111118', borderRadius: 20,
            border: '1px solid rgba(74,222,128,0.2)', padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800 }}>
              ¡{importedProducts.length} producto{importedProducts.length !== 1 ? 's' : ''} importado{importedProducts.length !== 1 ? 's' : ''}!
            </h2>
            <p style={{ margin: '0 0 32px', color: '#6b6385', fontSize: 15 }}>
              Ya están disponibles en tu tienda con nombres y descripciones optimizadas
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={reset} style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
                🔄 Importar más productos
              </button>
              <a href="/admin/products" style={{
                padding: '12px 28px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#8b7db0', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}>
                Ver catálogo →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
