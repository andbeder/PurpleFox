import { createElement } from "lwc";
import DynamicCharts from "c/dynamicCharts";
import { loadScript } from "lightning/platformResourceLoader";

jest.mock("lightning/platformResourceLoader", () => ({
  loadScript: jest.fn(() => Promise.resolve())
}));

global.ApexCharts = function () {
  this.render = jest.fn();
  this.updateOptions = jest.fn();
};

const mockResponse = {
  pages: [
    { id: "ClimbsByNation", charts: ["ClimbsByNation", "ClimbsByNationAO"] }
  ],
  chartSettings: {
    ClimbsByNation: { effects: ["shadow"] }
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve(mockResponse) })
);

describe("c-dynamic-charts drop shadow", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("adds dropShadow settings when effects include shadow", () => {
    const element = createElement("c-dynamic-charts", { is: DynamicCharts });
    document.body.appendChild(element);
    element.chartSettings = { ClimbsByNation: { effects: ["shadow"] } };
    const options = { chart: {} };
    const updated = element.applySettings.call(
      element,
      options,
      "ClimbsByNation"
    );
    expect(updated.chart.dropShadow.enabled).toBe(true);
  });
});
