/**
 * Resize an image File to at most maxSize×maxSize, encode as JPEG data URI.
 * @param {File} file
 * @param {number} maxSize  max width/height in pixels (default 800)
 * @param {number} quality  JPEG quality 0–1 (default 0.75)
 * @returns {Promise<string>} base64 JPEG data URI
 */
export function resizeImage(file, maxSize = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width >= height) {
          height = Math.round((height / width) * maxSize)
          width = maxSize
        } else {
          width = Math.round((width / height) * maxSize)
          height = maxSize
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}
