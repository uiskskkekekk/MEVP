function calculateSimilarity(seq1, seq2) {
  const minLen = Math.min(seq1.length, seq2.length);
  let matchCount = 0;
  for (let i = 0; i < minLen; i++) {
    if (seq1[i] === seq2[i]) matchCount++;
  }
  return (matchCount / minLen) * 100;
}

onmessage = function (e) {
  const { targetGene, geneSequences } = e.data;
  const targetSeq = geneSequences[targetGene];
  const allGenes = Object.entries(geneSequences).filter(([name]) => name !== targetGene);

  const chunkSize = 200;
  let completed = 0;
  const total = allGenes.length;
  const allSimilarities = [];

  function processChunk(startIndex) {
    const chunk = allGenes.slice(startIndex, startIndex + chunkSize);
    for (const [name, seq] of chunk) {
      const similarity = calculateSimilarity(targetSeq, seq);
      allSimilarities.push({ name, similarity });
      completed++;
    }

    postMessage({ type: "progress", completed, total });

    if (startIndex + chunkSize < total) {
      setTimeout(() => processChunk(startIndex + chunkSize), 10);
    } else {
      postMessage({ type: "done", data: allSimilarities });
    }
  }

  processChunk(0);
};
