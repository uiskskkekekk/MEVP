import React, { useEffect, useState } from 'react';
import './SequencealignmentAPP.css'; // 引入 CSS 文件

function SequencealignmentAPP({ haplotypeContent }) {
  const [result, setResult] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10; // 每頁顯示的基因數量

  useEffect(() => {
    if (haplotypeContent) {
      const sequences = parseFasta(haplotypeContent);
      if (sequences.length === 0) {
        setResult(["文件中沒有任何字串"]);
        return;
      }

      const output = sequences.map(seq => 
        `<div class="sequence-line" style="display: flex; align-items: center; margin-bottom: 10px;">
           <strong style="flex: 0 0 auto;">${seq.id}</strong>
           <div class="sequence-string" style="overflow-x: auto; white-space: nowrap; flex: 1 1 auto;">
             ${colorSequence(seq.sequence)}
           </div>
         </div>`
      );
      setResult(output);
    }
  }, [haplotypeContent]);

  const parseFasta = (text) => {
    const sequences = [];
    const lines = text.split('\n');
    let currentId = '';
    let currentSeq = '';

    for (const line of lines) {
      if (line.startsWith('>')) {
        if (currentId) {
          sequences.push({ id: currentId, sequence: currentSeq });
        }
        currentId = line.substring(1).trim();
        currentSeq = '';
      } else {
        // 刪除序列中的所有 '-'
        currentSeq += line.trim().replace(/ /g, '');
      }
    }

    if (currentId) {
      sequences.push({ id: currentId, sequence: currentSeq });
    }

    return sequences;
  };

  const colorSequence = (sequence) => {
    return sequence.split('').map((char, index) => {
      let colorClass = '';
      switch (char.toLowerCase()) {
        case 'a':
          colorClass = 'color-a';
          break;
        case 't':
          colorClass = 'color-t';
          break;
        case 'c':
          colorClass = 'color-c';
          break;
        case 'g':
          colorClass = 'color-g';
          break;
        default:
          colorClass = 'color-other';
      }
      return `<span class="${colorClass}" key="${index}">${char}</span>`;
    }).join('');
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 0));
  };

  const paginatedResult = result.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div>

      <div className="result" dangerouslySetInnerHTML={{ __html: paginatedResult.join('') }} />
      <div className="pagination">
        <button className="pagination-button" onClick={handlePreviousPage} disabled={currentPage === 0}>上一頁</button>
        <button className="pagination-button" onClick={handleNextPage} disabled={(currentPage + 1) * itemsPerPage >= result.length}>下一頁</button>
      </div>
    </div>
  );
}

export default SequencealignmentAPP;

