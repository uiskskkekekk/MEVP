import React, { useState } from "react";

const HaplotypeReducer = () => {
  const [hapFasta, setHapFasta] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [reduceSize, setReduceSize] = useState(30);
  const [outputFilename, setOutputFilename] = useState("output.reduce.fa");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hapFasta || !excelFile) {
      alert("請上傳 FASTA 和 Excel 檔案");
      return;
    }

    const formData = new FormData();
    formData.append("hapFastaFile", hapFasta);
    formData.append("excelFile", excelFile);
    formData.append("reduceSize", reduceSize);
    formData.append("outputFilename", outputFilename);

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/reduceHaplotypes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ 錯誤回應:", errorText);
        alert("執行錯誤：" + errorText);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", outputFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ 發送失敗:", err);
      alert("無法傳送到後端或下載失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
      <h3> Haplotype 減量工具</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>FASTA 檔 (.msa.asv.fa): </label>
          <input type="file" accept=".fa" onChange={(e) => setHapFasta(e.target.files[0])} />
        </div>
        <div>
          <label>樣站 Excel 檔 (.xlsx): </label>
          <input type="file" accept=".xlsx" onChange={(e) => setExcelFile(e.target.files[0])} />
        </div>
        <div>
          <label>縮減目標數量: </label>
          <input type="number" value={reduceSize} onChange={(e) => setReduceSize(e.target.value)} />
        </div>
        <div>
          <label>輸出檔名: </label>
          <input type="text" value={outputFilename} onChange={(e) => setOutputFilename(e.target.value)} />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "處理中..." : "執行"}
        </button>
      </form>
    </div>
  );
};

export default HaplotypeReducer;
