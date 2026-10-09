export async function createProfileThumbnail(file) {
  const bitmap = await createImageBitmap(file);
  try {
    // Keep the whole photo and its aspect ratio; display cropping stays in CSS.
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the profile photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const thumbnail = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.78));
    if (!thumbnail) throw new Error('Could not prepare the profile photo.');
    return thumbnail;
  } finally { bitmap.close(); }
}
