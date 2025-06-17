import { createElement } from "lwc";
import DynamicCharts from "c/dynamicCharts";

describe("c-dynamic-charts drop shadow", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("adds dropShadow settings when effects include shadow", () => {
    const element = createElement("c-dynamic-charts", { is: DynamicCharts });
    document.body.appendChild(element);
    const options = { chart: {} };
    const updated = element.applySettings.call(
      element,
      options,
      "ClimbsByNation"
    );
    expect(updated.chart.dropShadow.enabled).toBe(true);
  });
});
