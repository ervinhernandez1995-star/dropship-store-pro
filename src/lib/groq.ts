const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function groqChat(messages: { role: string; content: string }[], model = 'llama-3.3-70b-versatile') {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

export async function generateProductDescription(name: string, category: string, price: number): Promise<string> {
  const content = await groqChat([{
    role: 'system',
    content: 'Eres un experto en marketing de ecommerce mexicano. Escribes descripciones de productos atractivas, persuasivas y en español. Máximo 120 palabras. Sin emojis excesivos.',
  }, {
    role: 'user',
    content: `Escribe una descripción de producto para: "${name}", categoría: ${category}, precio: $${price} MXN. Incluye beneficios, características clave y un llamado a la acción.`,
  }])
  return content
}

export async function chatWithStore(userMessage: string, products: { name: string; price: number; category: string; stock: number }[], storeName: string): Promise<string> {
  const productList = products.slice(0, 20).map(p => `- ${p.name} ($${p.price} MXN, ${p.stock > 0 ? 'En stock' : 'Agotado'})`).join('\n')
  const content = await groqChat([{
    role: 'system',
    content: `Eres el asistente virtual de "${storeName}", una tienda online mexicana. Eres amable, útil y conoces todos los productos. Respondes en español, de forma breve y directa. Si el cliente pregunta por un producto que no tienes, dilo amablemente y sugiere algo similar. Nunca inventes precios.\n\nProductos disponibles:\n${productList}`,
  }, {
    role: 'user',
    content: userMessage,
  }])
  return content
}

export async function analyzeOrders(ordersData: string): Promise<string> {
  const content = await groqChat([{
    role: 'system',
    content: 'Eres un analista de negocios experto en ecommerce mexicano. Analizas datos de ventas y das recomendaciones concretas y accionables en español.',
  }, {
    role: 'user',
    content: `Analiza estos datos de ventas y dame 3 recomendaciones concretas para mejorar:\n${ordersData}`,
  }])
  return content
}
