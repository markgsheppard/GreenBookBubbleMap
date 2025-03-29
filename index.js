import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import processData from "./process-data.js";
import BubbleMap from "./bubble-map.js";

export default function renderGreenBookBubbleMap(el) {
  const data = processData();

  const container = d3
    .select(el)
    .append("figure")
    .attr("class", "gbbm")
    .append("div")
    .attr("class", "gbbm__bubble-map");

  new BubbleMap({
    el: container.node(),
    data,
  });
}
