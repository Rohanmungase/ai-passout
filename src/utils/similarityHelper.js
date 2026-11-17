/**
 * Utility helper to compute text similarity, lexical overlap, and plagiarism/copy case detection between student answers.
 */
export function computeAnswerSimilarity(text1, text2) {
  if (!text1 || !text2) {
    return {
      similarity: 0,
      isExact: false,
      isCopied: false,
      matchType: 'Distinct / No Content',
      identicalWords: 0,
      totalWords: 0,
      statusColor: 'text-slate-400',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  const raw1 = String(text1).trim();
  const raw2 = String(text2).trim();

  const norm1 = raw1.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const norm2 = raw2.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (norm1.length === 0 || norm2.length === 0) {
    return {
      similarity: 0,
      isExact: false,
      isCopied: false,
      matchType: 'No Answer Text',
      identicalWords: 0,
      totalWords: 0,
      statusColor: 'text-slate-400',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  // 1. Direct character or normalized exact match
  if (norm1 === norm2) {
    const wordCount = norm1.split(' ').length;
    return {
      similarity: 100,
      isExact: true,
      isCopied: true,
      matchType: 'Exact Match (100% Identical)',
      identicalWords: wordCount,
      totalWords: wordCount,
      statusColor: 'text-red-500 dark:text-red-400',
      badgeColor: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50'
    };
  }

  // 2. Token / Bag-of-words overlap
  const words1 = norm1.split(' ').filter(w => w.length > 1);
  const words2 = norm2.split(' ').filter(w => w.length > 1);

  if (words1.length === 0 || words2.length === 0) {
    return {
      similarity: 0,
      isExact: false,
      isCopied: false,
      matchType: 'Distinct',
      identicalWords: 0,
      totalWords: 0,
      statusColor: 'text-slate-400',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersectionCount = 0;
  set1.forEach(w => {
    if (set2.has(w)) intersectionCount++;
  });

  const unionSize = new Set([...words1, ...words2]).size;
  const jaccardScore = unionSize > 0 ? (intersectionCount / unionSize) * 100 : 0;

  // 3. Sequential bigram matching for phrasing duplication
  const getBigrams = (list) => {
    const bg = new Set();
    for (let i = 0; i < list.length - 1; i++) {
      bg.add(`${list[i]}__${list[i+1]}`);
    }
    return bg;
  };

  const bg1 = getBigrams(words1);
  const bg2 = getBigrams(words2);
  let commonBigrams = 0;
  bg1.forEach(b => {
    if (bg2.has(b)) commonBigrams++;
  });
  const totalBigrams = new Set([...bg1, ...bg2]).size;
  const bigramScore = totalBigrams > 0 ? (commonBigrams / totalBigrams) * 100 : 0;

  // Weighted final similarity score
  const finalSimilarity = Math.min(100, Math.round((jaccardScore * 0.4) + (bigramScore * 0.6)));
  const isCopied = finalSimilarity >= 70;
  const isExact = finalSimilarity >= 98 || norm1 === norm2;

  let matchType = 'Distinct Answer';
  let statusColor = 'text-emerald-500 dark:text-emerald-400';
  let badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';

  if (isExact) {
    matchType = 'Exact Match (100% Identical)';
    statusColor = 'text-red-500 dark:text-red-400';
    badgeColor = 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  } else if (finalSimilarity >= 85) {
    matchType = `Critical Overlap (${finalSimilarity}% Copied)`;
    statusColor = 'text-red-500 dark:text-red-400';
    badgeColor = 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  } else if (finalSimilarity >= 70) {
    matchType = `High Similarity (${finalSimilarity}% Suspicious)`;
    statusColor = 'text-amber-500 dark:text-amber-400';
    badgeColor = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
  } else if (finalSimilarity >= 45) {
    matchType = `Moderate Paraphrase (${finalSimilarity}%)`;
    statusColor = 'text-blue-500 dark:text-blue-400';
    badgeColor = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
  }

  return {
    similarity: finalSimilarity,
    isExact,
    isCopied,
    matchType,
    identicalWords: intersectionCount,
    totalWords: Math.max(words1.length, words2.length),
    statusColor,
    badgeColor,
  };
}
