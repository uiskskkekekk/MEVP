self.onmessage = (event) => {
  const { genes, cityCoordinates } = event.data;
  const chartData = {};

  Object.keys(cityCoordinates).forEach((city) => {
    const pieData = genes
      .map((gene) => ({
        name: gene.name,
        value: gene.counts?.[city] || 0,
      }))
      .filter((item) => item.value > 0);

    if (pieData.length > 0) {
      chartData[city] = pieData;
    }
  });

  self.postMessage(chartData); // 回傳計算好的數據
};

  