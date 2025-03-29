import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm";
import us from "./states-albers-10m.js";
import Tooltip from "./tooltip.js";

export default class BubbleMap {
  constructor({ el, data }) {
    this.el = el;
    this.data = data;

    this.zoomed = this.zoomed.bind(this);
    this.moved = this.moved.bind(this);
    this.resized = this.resized.bind(this);
    this.init();
  }

  init() {
    this.setup();
    this.scaffold();
    this.generatePickColors();
    this.wrangle();
    this.renderMap();
    this.renderBubbles();
    this.renderBubblesHidden();
    new ResizeObserver(this.resized).observe(this.el);
  }

  setup() {
    this.dActive = null;

    this.dpr = Math.min(window.devicePixelRatio, 2) || 1;
    this.width = 975;
    this.height = 610;
    const minBubbleSize = 2;
    const maxBubbleSize = 32;

    this.transform = d3.zoomIdentity;
    this.responsiveK = 1;

    this.r = d3
      .scaleSqrt()
      .domain([1, d3.max(this.data, (d) => d.value)])
      .range([minBubbleSize, maxBubbleSize]);

    this.zoom = d3
      .zoom()
      .on("zoom", this.zoomed)
      .scaleExtent([1, 32])
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .translateExtent([
        [0, 0],
        [this.width, this.height],
      ]);

    this.projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);

    const styles = getComputedStyle(this.el);

    this.colorMapFill = styles.getPropertyValue("--color-map-fill");
    this.colorMapStroke = styles.getPropertyValue("--color-map-stroke");
    this.strokeWidthMap = parseFloat(
      styles.getPropertyValue("--stroke-width-map")
    );

    this.colorBubbleFill = d3.color(
      styles.getPropertyValue("--color-bubble-fill")
    );
    this.colorBubbleFill.opacity = styles.getPropertyValue(
      "--fill-opacity-bubble"
    );
    this.colorBubbleStroke = styles.getPropertyValue("--color-bubble-stroke");
    this.strokeWidthBubble = parseFloat(
      styles.getPropertyValue("--stroke-width-bubble")
    );
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .append("div")
      .attr("class", "bubble-map");

    this.canvasMap = this.container
      .append("canvas")
      .attr("class", "canvas-map")
      .attr("width", this.width * this.dpr)
      .attr("height", this.height * this.dpr);
    this.ctxMap = this.canvasMap.node().getContext("2d");
    this.ctxMap.lineJoin = "round";
    this.ctxMap.lineCap = "round";
    this.ctxMap.scale(this.dpr, this.dpr);
    this.geoPathCtx = d3.geoPath(null, this.ctxMap);

    this.canvasBubbles = this.container
      .append("canvas")
      .attr("class", "canvas-bubbles")
      .attr("width", this.width * this.dpr)
      .attr("height", this.height * this.dpr)
      .on("mousemove", this.moved)
      .call(this.zoom);
    this.ctxBubbles = this.canvasBubbles.node().getContext("2d");
    this.ctxBubbles.lineJoin = "round";
    this.ctxBubbles.lineCap = "round";
    this.ctxBubbles.scale(this.dpr, this.dpr);

    this.canvasBubblesHidden = this.container
      .append("canvas")
      .attr("class", "canvas-bubbles-hidden")
      .attr("width", this.width * this.dpr)
      .attr("height", this.height * this.dpr)
      .style("display", "none");
    this.ctxHidden = this.canvasBubblesHidden
      .node()
      .getContext("2d", { willReadFrequently: true, alpha: false });
    this.ctxHidden.lineJoin = "round";
    this.ctxHidden.lineCap = "round";
    this.ctxHidden.scale(this.dpr, this.dpr);

    this.svgActive = this.container
      .append("svg")
      .attr("class", "svg-active")
      .attr("viewBox", [0, 0, this.width, this.height]);
    this.gActive = this.svgActive.append("g").attr("class", "g-active");
    this.activeBubble = this.gActive
      .append("circle")
      .attr("class", "active-bubble");

    this.tooltip = new Tooltip({
      elParent: this.el,
      el: this.container.append("div").node(),
    });
  }

  generatePickColors() {
    const colorStep = 100;
    let nextCol = 1;
    const genColor = () => {
      var ret = [];
      // via http://stackoverflow.com/a/15804183
      if (nextCol < 16777215) {
        ret.push(nextCol & 0xff); // R
        ret.push((nextCol & 0xff00) >> 8); // G
        ret.push((nextCol & 0xff0000) >> 16); // B
        nextCol += colorStep;
      }
      var col = "rgb(" + ret.join(",") + ")";
      return col;
    };
    this.data.forEach((d) => {
      d.pickColor = genColor();
    });
    this.pickColorToDataMap = new Map(this.data.map((d) => [d.pickColor, d]));
  }

  wrangle() {
    this.data.forEach((d) => {
      const [x, y] = this.projection(d.lonLat);
      d.x = x;
      d.y = y;
      d.r = this.r(d.value);
    });
  }

  renderMap() {
    this.ctxMap.clearRect(0, 0, this.width, this.height);

    this.ctxMap.save();
    this.ctxMap.lineWidth = this.strokeWidthMap / this.transform.k;
    this.ctxMap.fillStyle = this.colorMapFill;
    this.ctxMap.strokeStyle = this.colorMapStroke;
    this.ctxMap.beginPath();
    this.geoPathCtx(topojson.feature(us, us.objects.nation));
    this.ctxMap.fill();
    this.ctxMap.stroke();
    this.ctxMap.restore();

    this.ctxMap.save();
    this.ctxMap.lineWidth = this.strokeWidthMap / this.transform.k;
    this.ctxMap.strokeStyle = this.colorMapStroke;
    this.ctxMap.beginPath();
    this.geoPathCtx(topojson.mesh(us, us.objects.states), (a, b) => a !== b);
    this.ctxMap.stroke();
    this.ctxMap.restore();
  }

  renderBubbles() {
    this.ctxBubbles.clearRect(0, 0, this.width, this.height);

    this.ctxBubbles.save();
    this.ctxBubbles.fillStyle = this.colorBubbleFill.toString();
    this.ctxBubbles.lineWidth = this.strokeWidthBubble / this.transform.k;
    this.ctxBubbles.strokeStyle = this.colorBubbleStroke;
    this.data.forEach((d) => {
      this.ctxBubbles.beginPath();
      this.ctxBubbles.moveTo(d.x + d.r / this.transform.k, d.y);
      this.ctxBubbles.arc(d.x, d.y, d.r / this.transform.k, 0, 2 * Math.PI);
      this.ctxBubbles.fill();
      this.ctxBubbles.stroke();
    });
    this.ctxBubbles.restore();
  }

  renderBubblesHidden() {
    this.ctxHidden.clearRect(0, 0, this.width, this.height);

    this.ctxHidden.save();
    this.data.forEach((d) => {
      this.ctxHidden.beginPath();
      this.ctxHidden.moveTo(d.x + d.r / this.transform.k, d.y);
      this.ctxHidden.arc(d.x, d.y, d.r / this.transform.k, 0, 2 * Math.PI);
      this.ctxHidden.fillStyle = d.pickColor;
      this.ctxHidden.fill();
    });
    this.ctxHidden.restore();
  }

  resized() {
    this.responsiveK = this.el.clientWidth / this.width;
  }

  zoomed({ transform }) {
    this.transform = transform;

    this.ctxMap.save();
    this.ctxMap.translate(transform.x, transform.y);
    this.ctxMap.scale(transform.k, transform.k);

    this.ctxBubbles.save();
    this.ctxBubbles.translate(transform.x, transform.y);
    this.ctxBubbles.scale(transform.k, transform.k);

    this.ctxHidden.save();
    this.ctxHidden.translate(transform.x, transform.y);
    this.ctxHidden.scale(transform.k, transform.k);

    this.renderMap();
    this.renderBubbles();
    this.renderBubblesHidden();

    this.ctxMap.restore();
    this.ctxBubbles.restore();
    this.ctxHidden.restore();

    this.gActive.attr("transform", this.transform);
    this.activeBubble.attr(
      "r",
      this.dActive ? this.dActive.r / this.transform.k : 0
    );
  }

  moved(event) {
    const color = this.ctxHidden.getImageData(
      ...d3
        .pointer(event, this.canvasBubbles.node())
        .map((d) => (d * this.dpr) / this.responsiveK),
      1,
      1
    ).data;
    const colorString = `rgb(${color[0]},${color[1]},${color[2]})`;
    const d = this.pickColorToDataMap.get(colorString);
    if (!d) {
      this.dActive = null;
      this.activeBubble
        .classed("is-visible", false)
        .attr("r", 0)
        .attr("cx", -9999)
        .attr("cy", -9999);
      this.tooltip.hide();
    } else if (this.dActive !== d) {
      this.dActive = d;
      this.activeBubble
        .classed("is-visible", true)
        .attr("r", d.r / this.transform.k)
        .attr("cx", d.x)
        .attr("cy", d.y);
      this.tooltip.show(this.tooltipContent(d));
    }
    if (this.tooltip.isVisible) {
      this.tooltip.move(event);
    }
  }

  tooltipContent(d) {
    return /*html*/ `
    <div><strong>${d3.format(",")(d.value)}</strong> Green Book Locations</div>
    <div>in <strong>${d.name}</strong></div>
    `;
  }
}
