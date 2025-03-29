import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export default class Tooltip {
  constructor({ elParent, el }) {
    this.elParent = elParent;
    this.el = el;
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.move = this.move.bind(this);
    this.init();
  }

  init() {
    this.parent = d3.select(this.elParent).classed("tooltip-parent", true);
    this.tooltip = d3.select(this.el).classed("tooltip", true);
  }

  show(html) {
    if (html) this.tooltip.html(html);
    this.tooltip.classed("is-visible", true);
    this.pBox = {
      width: document.body.clientWidth,
      height: window.innerHeight,
    };
    this.box = this.el.getBoundingClientRect();
  }

  hide() {
    this.tooltip.classed("is-visible", false);
  }

  move(event) {
    const yOffset = 16;
    let x = event.x;
    let y = event.y;

    x -= this.box.width / 2;
    if (x < 0) {
      x = 0;
    } else if (x + this.box.width > this.pBox.width) {
      x = this.pBox.width - this.box.width;
    }

    y -= this.box.height + yOffset;
    if (y < 0) {
      y += this.box.height + yOffset * 2;
    }
    this.tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  get isVisible() {
    return this.tooltip.classed("is-visible");
  }
}
