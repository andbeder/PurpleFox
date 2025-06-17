/* eslint-disable @lwc/lwc/no-async-operation */
import { createElement } from "lwc";
import DynamicCharts from "c/dynamicCharts";
import { loadScript } from "lightning/platformResourceLoader";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("c-dynamic-charts", () => {
  afterEach(() => {
    // The jsdom instance is shared across test cases in a single file so reset the DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders chart container", () => {
    const element = createElement("c-dynamic-charts", {
      is: DynamicCharts
    });
    document.body.appendChild(element);

    const chartDiv = element.shadowRoot.querySelector("div.ClimbsByNation");
    expect(chartDiv).not.toBeNull();
  });

  it("renders second chart container", () => {
    const element = createElement("c-dynamic-charts", {
      is: DynamicCharts
    });
    document.body.appendChild(element);

    const chartDiv = element.shadowRoot.querySelector("div.ClimbsByNationAO");
    expect(chartDiv).not.toBeNull();
  });

  it("renders box plot containers", () => {
    const element = createElement("c-dynamic-charts", {
      is: DynamicCharts
    });
    document.body.appendChild(element);

    const chart3 = element.shadowRoot.querySelector("div.TimeByPeak");
    const chart4 = element.shadowRoot.querySelector("div.TimeByPeakAO");
    const chart6 = element.shadowRoot.querySelector("div.CampsByPeak");
    const chart7 = element.shadowRoot.querySelector("div.CampsByPeakAO");
    expect(chart3).not.toBeNull();
    expect(chart4).not.toBeNull();
    expect(chart6).not.toBeNull();
    expect(chart7).not.toBeNull();
  });

  it("shows ClimbsByNation page by default", () => {
    const element = createElement("c-dynamic-charts", {
      is: DynamicCharts
    });
    document.body.appendChild(element);

    const climbsPage = element.shadowRoot.querySelector(
      "div[data-page='ClimbsByNation']"
    );
    expect(climbsPage.classList).toContain("slds-show");
  });

  it("switches pages when navigation link clicked", async () => {
    const element = createElement("c-dynamic-charts", {
      is: DynamicCharts
    });
    document.body.appendChild(element);

    const link = element.shadowRoot.querySelector("a[data-id='TimeByPeak']");
    link.click();
    await flushPromises();

    const timePage = element.shadowRoot.querySelector(
      "div[data-page='TimeByPeak']"
    );
    expect(timePage.classList).toContain("slds-show");
  });

  it("initializes ApexCharts instances for all charts", async () => {
    const element = createElement("c-dynamic-charts", {
      is: DynamicCharts
    });
    document.body.appendChild(element);

    const errorSpy = jest.spyOn(console, "error");
    await Promise.resolve();
    await flushPromises();

    expect(loadScript).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
