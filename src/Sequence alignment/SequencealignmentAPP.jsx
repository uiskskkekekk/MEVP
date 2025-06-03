import React, { useEffect, useState } from 'react';
import './SequencealignmentAPP.css'; // 引入 CSS 文件

function SequencealignmentAPP({ haplotypeContent }) {
  const [sequences, setSequences] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [customPage, setCustomPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
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
      let bgClass = ''; // 將 colorClass 改名為 bgClass
      switch (char.toLowerCase()) {
        case 'a':
          bgClass = 'bg-a'; // 使用背景色類別
          break;
        case 't':
          bgClass = 'bg-t';
          break;
        case 'c':
          bgClass = 'bg-c';
          break;
        case 'g':
          bgClass = 'bg-g';
          break;
        case '-':
          bgClass = 'bg-large'; // 對 '-' 使用背景色類別
          break;
        default:
          bgClass = 'bg-other';
      }
      return `<span class="${bgClass}" key="${index}">${char}</span>`;
    }).join('');
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 0));
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(0); // 搜尋時重置到第一頁
  };

  // 計算當前分頁要顯示的字串
  const filteredSequences = sequences.filter((seq) =>
    seq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seq.sequence.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedSequences = filteredSequences.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredSequences.length / itemsPerPage); // 總頁數

  return (
    <div>
      <div className="search-container" style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="搜尋序列或ID"
          value={searchTerm}
          onChange={handleSearch}
          style={{ padding: '0.5rem', fontSize: '1rem', width: '100%' }}
        />
      </div>

      <div className="result" style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: '10px', border: 'none', background: 'none' }}>
        {paginatedSequences.map((seq, index) => (
          <div className="sequence-container" key={index} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div className="sequence-id" style={{ flex: '0 0 auto', marginRight: '20px', textAlign: 'right', width: '170px' }}>
              {seq.id}
            </div>
            <div className="sequence-string" style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
              <span dangerouslySetInnerHTML={{ __html: colorSequence(seq.sequence) }} />
            </div>
          </div>
        ))}
      </div>

      <div className="pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
        <button className="pagination-button" onClick={handlePreviousPage} disabled={currentPage === 0} style={{ marginRight: '0.5rem' }}>
          上一頁
        </button>
        <div className="page-info" style={{ marginRight: '0.5rem' }}>
          <p>第 {currentPage + 1} 頁 / 共 {totalPages} 頁</p>
        </div>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={customPage}
          onChange={(e) => setCustomPage(parseInt(e.target.value))}
          style={{ width: '60px', marginRight: '0.5rem' }}
        />
        <button
          className="pagination-button"
          onClick={() => {
            setCurrentPage(customPage - 1);
          }}
          disabled={customPage < 1 || customPage > totalPages}
          style={{ marginLeft: '0.5rem' }}
        >
          跳轉
        </button>
        <button className="pagination-button" onClick={handleNextPage} disabled={(currentPage + 1) * itemsPerPage >= filteredSequences.length} style={{ marginLeft: '0.5rem' }}>
          下一頁
        </button>
      </div>

    </div>
  );
}

export default SequencealignmentAPP;