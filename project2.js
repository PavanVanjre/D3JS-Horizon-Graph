var StockData = {};
var normalisedStockData = {};
const categoriesedData = {};
const colorMapper = {
  0.166: "#ff9999",
  0.33: "#ff4d4d",
  0.5: "#b30000",
  0.6: "#9999ff",
  0.83: "#3333ff",
  1: "#000099",
};

function getStockData()
{
  const readDataPromise = new Promise((resolve, reject) =>
  {
    d3.csv("./data.csv")
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });

  readDataPromise
    .then((data) =>
    {
      processData(data);
      drawStocksHorizonPlot();
    })
    .catch((error) => console.log(error));
}

getStockData();

function normalize(value, min, max)
{
  return (value - min) / (max - min);
}

function processData(data)
{
  const stockDataObject = {};
  const StockMaxMinObject = {};

  data.forEach((element) =>
  {
    if (!stockDataObject[element.Company])
    {
      stockDataObject[element.Company] = [];
      stockDataObject[element.Company].push(element);
    } else
    {
      stockDataObject[element.Company].push(element);
    }
  });
  Object.keys(stockDataObject).forEach((stockItem) =>
   {
    StockMaxMinObject[stockItem] = [
      Math.min(
        ...stockDataObject[stockItem].map((item) => Number(item["Close/Last"]))
      ),
      Math.max(
        ...stockDataObject[stockItem].map((item) => Number(item["Close/Last"]))
      ),
    ];
  });

  Object.keys(stockDataObject).forEach((stockItem) =>
  {
    stockDataObject[stockItem].forEach((item, index) =>
    {
      if (!normalisedStockData[stockItem])
      {
        normalisedStockData[stockItem] = [];
      }
      normalisedStockData[stockItem].push({
        Date: new Date(item["Date"]),
        Company: item["Company"],
        "Close/Last": normalize(
          item["Close/Last"],
          StockMaxMinObject[stockItem][0],
          StockMaxMinObject[stockItem][1]
        ),
      });
    });
  });

  Object.keys(normalisedStockData).forEach((stockItem) =>
  {
    normalisedStockData[stockItem].sort((a, b) => a["Date"] - b["Date"]);
  });

  Object.keys(normalisedStockData).forEach((stockItem) =>
  {
    normalisedStockData[stockItem].forEach((i, index) =>
    {
      normalisedStockData[stockItem][index] = { ...i, Day: index };
    });
  });

  const dataSubranges = ["0.166", "0.33", "0.5", "0.6", "0.83", "1"];
  Object.keys(normalisedStockData).forEach((stockItem) =>
  {
    categoriesedData[stockItem] = {};
    dataSubranges.forEach((rangeItem) =>
    { 
      categoriesedData[stockItem][rangeItem] = [];
    });

    normalisedStockData[stockItem].forEach((dataItem) =>
    {
      switch (true)
      {
        case dataItem["Close/Last"] <= 0.166:
          categoriesedData[stockItem][0.166].push(dataItem);
          break;
        case dataItem["Close/Last"] <= 0.33:
          categoriesedData[stockItem][0.33].push(dataItem);
          break;
        case dataItem["Close/Last"] <= 0.5:
          categoriesedData[stockItem][0.5].push(dataItem);
          break;
        case dataItem["Close/Last"] <= 0.6:
          categoriesedData[stockItem][0.6].push(dataItem);
          break;
        case dataItem["Close/Last"] <= 0.83:
          categoriesedData[stockItem][0.83].push(dataItem);
          break;
        case dataItem["Close/Last"] <= 1:
          categoriesedData[stockItem][1].push(dataItem);
          break;
      }
    });
  });
}

function drawStocksHorizonPlot()
{
  let svg = d3.select("svg");

  const totalHeight = Object.keys(categoriesedData).length * 90;

  svg.attr("height", totalHeight);

  let plot = svg.append("g");
  plot
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 1100)
    .attr("height", totalHeight)
    .attr("fill", "rgb(230, 230, 230)")
    .attr("stroke", "red");

  Object.keys(categoriesedData).forEach((stockName, index) =>
  {
    let stockPlot = plot.append("g");
    let timePeriodScale = d3.scaleLinear().domain([0, 2500]).range([0, 980]);
    customDateTickValues = [];
    for (i = 0; i <= 2500; i += 100)
    {
      customDateTickValues.push(i);
    }
    stockPlot
      .append("g")
      .attr("transform", `translate(40, ${ (index + 1) * 80 })`)
      .attr("id", `bottom-${ index + 1 }`);

    let axisBottom = d3
      .axisBottom(timePeriodScale)
      .tickValues(customDateTickValues);
    d3.select(`#bottom-${ index + 1 }`).call(axisBottom);

    stockPlot
      .append("g")
      .attr("transform", `translate(40, ${ index * 80 })`)
      .attr("id", `left-${ index + 1 }`);
    let maxXForLastRed = 0;

    let lastRedDataIndex = 0;

    Object.keys(categoriesedData[stockName])
      .sort((a, b) => a - b)
      .forEach((subRange) =>
      {
        const minY = d3.min(
          categoriesedData[stockName][subRange],
          (d) => d["Close/Last"]
        );
        const maxY = d3.max(
          categoriesedData[stockName][subRange],
          (d) => d["Close/Last"]
        );

        if (subRange === "0.5")
        {
          maxXForLastRed = d3.max(
            categoriesedData[stockName][subRange],
            (d) => d["Day"]
          );
        }

        let yAxisScale = d3.scaleLinear().domain([maxY, minY]).range([20, 80]);

        let axisleft = d3.axisLeft(yAxisScale);


        let lineData = [];


        categoriesedData[stockName][subRange].forEach(
          (categorisedStockItem) =>
          {
            lineData.push([
              categorisedStockItem["Day"],
              categorisedStockItem["Close/Last"],
            ]);
          }
        );
        getStockPath(
          stockPlot,
          lineData,
          timePeriodScale,
          yAxisScale,
          subRange,
          index,
          maxXForLastRed
        );
        stockPlot
          .append("text")
          .attr("class", "x-axis-label")
          .attr("x", 65)
          .attr("y", (index + 1) * 80 - 50)
          .attr("text-anchor", "middle")
          .text(stockName);
      });
  });
}
function getStockPath(
  plot,
  lineData,
  timePeriodScale,
  yAxisScale,
  subRange,
  index
)
{
  const lineGenerator = d3
    .line()
    .x((d) =>
    {
      return timePeriodScale(d[0]) + 40;
    })
    .y((d) =>
    {
      return yAxisScale(d[1]) + index * 80;
    });
  const areaGenerator = d3
    .area()
    .x((d) => timePeriodScale(d[0]) + 40)
    .y0((index + 1) * 80)
    .y1((d) => yAxisScale(d[1]) + index * 80);

  plot
    .append("path")
    .datum(lineData)
    .attr("d", areaGenerator)
    .attr("fill", colorMapper[subRange])
    .attr("opacity", 0.7);

  plot
    .append("path")
    .attr("d", lineGenerator(lineData))
    .attr("stroke-width", 2)
    .attr("fill", "none")
    .attr("stroke", colorMapper[subRange]);
}

function findContinuousSubarrays(arr)
{
  const result = [];
  let currentSubarray = [];

  for (let i = 0; i < arr.length; i++)
  {
    if (i > 0 && arr[i]["Day"] !== arr[i - 1]["Day"] + 1)
    {
      result.push(currentSubarray);
      currentSubarray = [];
    }
    currentSubarray.push(arr[i]);
  }

  if (currentSubarray.length > 0)
  {
    result.push(currentSubarray);
  }

  return result;
}
