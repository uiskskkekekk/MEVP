
import React, { useEffect, useState } from 'react';
import './SequencealignmentAPP.css'; // 引入 CSS 文件

function SequencealignmentAPP({ haplotypeContent }) {
  const [sequences, setSequences] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10; // 每頁顯示的基因數量

  useEffect(() => {
    if (haplotypeContent) {
      const parsedSequences = parseFasta(haplotypeContent);
      if (parsedSequences.length === 0) {
        setSequences(["文件中沒有任何字串"]);
        return;
      }
      setSequences(parsedSequences);
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

  // 計算當前分頁要顯示的字串
  const paginatedSequences = sequences.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div>
      <div className="result" style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: '10px', border: 'none', background: 'none' }}>
        {paginatedSequences.map((seq, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
            <strong style={{ flex: '0 0 auto', marginRight: '100px' }}>{seq.id}</strong>
          </div>
        ))}
      </div>

      <div className="result" style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: '10px', border: 'none', background: 'none' }}>
        <table>
          <tbody>
            {paginatedSequences.map((seq, index) => (
              <tr key={index} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                <td className="sequence-string" style={{ flex: 1 }}>
                  <span dangerouslySetInnerHTML={{ __html: colorSequence(seq.sequence) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="pagination">
        <button className="pagination-button" onClick={handlePreviousPage} disabled={currentPage === 0}>上一頁</button>
        <button className="pagination-button" onClick={handleNextPage} disabled={(currentPage + 1) * itemsPerPage >= sequences.length}>下一頁</button>
      </div>
    </div>
  );
}

export default SequencealignmentAPP;

