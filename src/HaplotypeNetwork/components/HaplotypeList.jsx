
import React from "react";

const HaplotypeList = ({ paginatedGenes = [], geneColors = {} }) => {
  return (
    <div>
      <h2>Haplotype List</h2>
      <ul>
        {paginatedGenes.map((gene, index) => (
          <li key={index} style={{ color: geneColors[gene.name] || "black" }}>
            {gene.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HaplotypeList;