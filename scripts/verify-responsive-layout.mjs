const designWidth = 1080;
const designHeight = 1920;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function calculatePortraitViewportScale(visibleWidth, visibleHeight) {
  if (visibleWidth <= 0 || visibleHeight <= 0) {
    return 1;
  }

  const designAspect = designWidth / designHeight;
  const visibleAspect = visibleWidth / visibleHeight;

  if (visibleWidth < designWidth || visibleAspect <= designAspect) {
    return 1;
  }

  return Math.min(1, visibleHeight / designHeight);
}

const landscape = calculatePortraitViewportScale(1280, 720);
assert(landscape === 0.375, `Expected landscape preview scale 0.375, got ${landscape}`);

const portrait = calculatePortraitViewportScale(1080, 1920);
assert(portrait === 1, `Expected portrait scale 1, got ${portrait}`);

const narrow = calculatePortraitViewportScale(360, 640);
assert(narrow === 1, `Expected narrow portrait scale 1, got ${narrow}`);

const iphonePreview = calculatePortraitViewportScale(491, 811);
assert(iphonePreview === 1, `Expected iPhone preview scale 1, got ${iphonePreview}`);

const invalid = calculatePortraitViewportScale(0, 0);
assert(invalid === 1, `Expected invalid viewport fallback scale 1, got ${invalid}`);

console.log(JSON.stringify({ landscape, portrait, narrow, iphonePreview, invalid }, null, 2));
