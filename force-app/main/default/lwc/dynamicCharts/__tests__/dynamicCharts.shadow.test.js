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
    ClimbsByNation: { title: "Test", colors: ["#000"] }
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve(mockResponse) })
);

describe("c-dynamic-charts apply settings", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("applies title and colors when present", () => {
    const element = createElement("c-dynamic-charts", { is: DynamicCharts });
    document.body.appendChild(element);
    element.chartSettings = { ClimbsByNation: { title: "Test", colors: ["#000"] } };
    const options = { chart: {} };
    const updated = DynamicCharts.prototype.applySettings.call(
      element,
      options,
      "ClimbsByNation"
    );
    expect(updated.title.text).toBe("Test");
    expect(updated.colors).toEqual(["#000"]);
  });
});
