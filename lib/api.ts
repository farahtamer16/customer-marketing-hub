export async function classifyComments(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  try {
    const response = await fetch('/api/ai/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    if (!response.ok) {
      console.error('[classifyComments] Error response:', response.status);
      return texts.map(() => 'Other');
    }
    const data = await response.json();
    return Array.isArray(data.classifications) ? data.classifications : texts.map(() => 'Other');
  } catch (err) {
    console.error('[classifyComments] Exception:', err);
    return texts.map(() => 'Other');
  }
}

export async function classifyComment(text: string): Promise<string> {
  const [classification] = await classifyComments([text]);
  return classification || 'Other';
}
