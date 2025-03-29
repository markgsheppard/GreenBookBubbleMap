import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import data from "./data.js";

export default function processData() {
  return [
    ...d3
      .rollup(
        data,
        (v) => {
          const d = v[0];
          const name = [d.city, d.state].filter((d) => d).join(", ");
          const value = d3.sum(v, (d) => d.appearances);
          const lonLat = [
            d3.mean(v, (d) => d.x_long),
            d3.mean(v, (d) => d.y_lat),
          ];
          return { name, value, lonLat };
        },
        (d) => [d.city, d.state].join("|")
      )
      .values(),
  ].sort((a, b) => d3.descending(a.value, b.value));
}
