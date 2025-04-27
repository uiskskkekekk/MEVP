self.onmessage = (event) => {
  const fileContent = event.data;

  const geneNames = [];
  const sequences = {};

  let currentGene = null;
  const lines = fileContent.split("\n");

  lines.forEach((line) => {
    if (line.startsWith(">")) {
      currentGene = line.substring(1).trim();
      geneNames.push(currentGene);
      sequences[currentGene] = "";
    } else if (currentGene) {
      sequences[currentGene] += line.trim();
    }
  });

  
  self.postMessage({ geneNames, sequences });
};



  