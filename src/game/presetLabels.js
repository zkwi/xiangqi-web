export function getPresetDisplayLabel(preset, fallbackIndex = 0) {
  const bookNumber = getShiqingyaquNumber(preset);
  if (bookNumber) return bookNumber;

  return `精${fallbackIndex + 1}`;
}

export function getPresetSearchText(preset, fallbackIndex = 0) {
  return [
    preset.id,
    preset.name,
    preset.category,
    preset.note,
    preset.source,
    getPresetDisplayLabel(preset, fallbackIndex),
    getShiqingyaquNumber(preset),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getShiqingyaquNumber(preset) {
  const idMatch = preset.id?.match(/^shiqingyaqu-\d+-(\d{3})$/);
  if (idMatch) return idMatch[1];

  const noteMatch = preset.note?.match(/第(\d{3})局/);
  return noteMatch?.[1] ?? '';
}
