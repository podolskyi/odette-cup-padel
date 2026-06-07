import { toPng } from 'html-to-image'

/** Render a DOM node to a PNG and trigger a download (for Wrapped cards). */
export async function exportNodeToPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // Match the card's own background so transparent corners don't show.
    backgroundColor: undefined,
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
