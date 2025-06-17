import { LightningElement, wire, api } from "lwc";
import { getDatasets, executeQuery } from "lightning/analyticsWaveApi";
import apexchartJs from "@salesforce/resourceUrl/ApexCharts";
import chartMetaUrl from "@salesforce/resourceUrl/chartMetadata";
import { loadScript } from "lightning/platformResourceLoader";

let apexChartsPromise;

export default class DynamicCharts extends LightningElement {
  datasetIds;

  hostSelections = [];
  nationSelections = [];
  seasonSelections = [];
  skiSelection = [];

  hostOptions;
  nationOptions;
  seasonOptions;
  skiOptions = [
    { label: "All", value: "in all" },
    { label: "Yes", value: '== "Yes"' },
    { label: "No", value: '== "No"' }
  ];

  chartObject = {};
  _chartsInitialized = false;

  @api
  queryQueue = [];

  @api
  get nextQuery() {
    return this.queryQueue[0]?.query;
  }

  activePage = "ClimbsByNation";

  pages = [];

  @api
  chartSettings = {};

  connectedCallback() {
    fetch(chartMetaUrl)
      .then((resp) => resp.json())
      .then((cfg) => {
        this.chartSettings = cfg.chartSettings || {};
        this.pages = cfg.pages || [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load chart metadata", err);
      });
  }

  pageClass(id) {
    return this.activePage === id ? "slds-show" : "slds-hide";
  }

  chartClass(id) {
    return `${id} slds-var-m-around_medium`;
  }

  get pagesWithState() {
    return this.pages.map((p) => ({
      ...p,
      cssClass: this.activePage === p.id ? "slds-show" : "slds-hide",
      iconName: p.id === "TimeByPeak" ? "custom:custom2" : "custom:custom1",
      chartList: p.charts.map((c) => ({ id: c, cssClass: this.chartClass(c) }))
    }));
  }

  @api
  applySettings(options, chartId) {
    const settings = this.chartSettings[chartId] || {};
    const updated = { ...options };
    if (settings.title) {
      updated.title = { text: settings.title };
    }
    if (settings.colors) {
      updated.colors = settings.colors;
    }
    if (settings.effects?.includes("shadow")) {
      updated.chart = updated.chart || {};
      updated.chart.dropShadow = {
        enabled: true,
        blur: 4,
        opacity: 0.35
      };
    }
    return updated;
  }

  @wire(getDatasets, {
    datasetTypes: ["Default", "Live"],
    licenseType: "EinsteinAnalytics",
    pageSize: 200,
    q: "exped"
  })
  onGetDataset({ data, error }) {
    if (data) {
      this.datasetIds = {};
      data.datasets.forEach((ds) => {
        this.datasetIds[ds.name] = `${ds.id}/${ds.currentVersionId}`;
      });
    } else if (error) {
      console.error("getDatasets ERROR:", error);
    }
  }

  // ---- Filter option queries ----
  get hostQuery() {
    if (this.datasetIds) {
      const id = this.datasetIds.exped;
      let saql = `q = load "${id}";\n`;
      saql += this.getFilters({ exclude: ["host"] });
      saql += "q = group q by 'host';\n";
      saql += "q = foreach q generate q.'host' as host;";
      return { query: saql };
    }
    return undefined;
  }
  get nationQuery() {
    if (this.datasetIds) {
      const id = this.datasetIds.exped;
      let saql = `q = load "${id}";\n`;
      saql += this.getFilters({ exclude: ["nation"] });
      saql += "q = group q by 'nation';\n";
      saql += "q = foreach q generate q.'nation' as nation;";
      return { query: saql };
    }
    return undefined;
  }
  get seasonQuery() {
    if (this.datasetIds) {
      const id = this.datasetIds.exped;
      let saql = `q = load "${id}";\n`;
      saql += this.getFilters({ exclude: ["season"] });
      saql += "q = group q by 'season';\n";
      saql += "q = foreach q generate q.'season' as season;";
      return { query: saql };
    }
    return undefined;
  }

  @wire(executeQuery, { query: "$hostQuery" })
  onHostQuery({ data }) {
    if (data) {
      this.hostOptions = data.results.records.map((r) => ({
        label: r.host,
        value: r.host
      }));
    }
  }
  @wire(executeQuery, { query: "$nationQuery" })
  onNationQuery({ data }) {
    if (data) {
      this.nationOptions = data.results.records.map((r) => ({
        label: r.nation,
        value: r.nation
      }));
    }
  }
  @wire(executeQuery, { query: "$seasonQuery" })
  onSeasonQuery({ data }) {
    if (data) {
      this.seasonOptions = data.results.records.map((r) => ({
        label: r.season,
        value: r.season
      }));
    }
  }

  @wire(executeQuery, { query: "$nextQuery" })
  handleQueuedQuery({ data, error }) {
    if (!this.queryQueue.length || (!data && !error)) {
      return;
    }
    const { callback } = this.queryQueue[0];
    if (callback) {
      callback({ data, error });
    }
    this.queryQueue.shift();
  }

  // ---- Chart data queries ----
  get climbsByNationQuery() {
    if (!this.datasetIds) return undefined;
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters();
    saql += "q = group q by 'nation';\n";
    saql +=
      "q = foreach q generate q.'nation' as nation, count(q) as Climbs;\n";
    saql += "q = order q by 'Climbs' desc;\nq = limit q 20;";
    return { query: saql };
  }
  get climbsByNationAOQuery() {
    if (!this.datasetIds) return undefined;
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters({ inverseHosts: true, inverseNations: true });
    saql += "q = group q by 'nation';\n";
    saql +=
      "q = foreach q generate q.'nation' as nation, count(q) as Climbs;\n";
    saql += "q = order q by 'Climbs' desc;\nq = limit q 20;";
    return { query: saql };
  }
  get timeByPeakQuery() {
    if (!this.datasetIds) return undefined;
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters();
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, min(q.'totdays') as A, percentile_disc(0.25) within group (order by q.'totdays') as B, percentile_disc(0.75) within group (order by q.'totdays') as C, max(q.'totdays') as D;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }
  get timeByPeakAOQuery() {
    if (!this.datasetIds) return undefined;
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters({ inverseHosts: true, inverseNations: true });
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, min(q.'totdays') as A, percentile_disc(0.25) within group (order by q.'totdays') as B, percentile_disc(0.75) within group (order by q.'totdays') as C, max(q.'totdays') as D;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }
  get campsByPeakQuery() {
    if (!this.datasetIds) return undefined;
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters();
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, avg(q.'camps') as A;\n";
    saql += "q = order q by A desc;\nq = limit q 20;";
    return { query: saql };
  }
  get campsByPeakAOQuery() {
    if (!this.datasetIds) return undefined;
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters({ inverseHosts: true, inverseNations: true });
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, avg(q.'camps') as A;\n";
    saql += "q = order q by A desc;\nq = limit q 20;";
    return { query: saql };
  }

  onClimbsByNation({ data }) {
    if (data) {
      const labels = [],
        values = [];
      data.results.records.forEach((r) => {
        labels.push(r.nation);
        values.push(r.Climbs);
      });
      const opts = { ...this.chartAOptions };
      opts.xaxis.categories = labels;
      opts.series = [{ name: "Climbs", data: values }];
      this.chartObject.ClimbsByNation?.updateOptions(
        this.applySettings(opts, "ClimbsByNation")
      );
    }
  }

  onClimbsByNationAO({ data }) {
    if (data) {
      const labels = [],
        values = [];
      data.results.records.forEach((r) => {
        labels.push(r.nation);
        values.push(r.Climbs);
      });
      const opts = { ...this.chartAOptions };
      opts.xaxis.categories = labels;
      opts.series = [{ name: "Climbs", data: values }];
      this.chartObject.ClimbsByNationAO?.updateOptions(
        this.applySettings(opts, "ClimbsByNationAO")
      );
    }
  }

  onTimeByPeak({ data }) {
    if (data) {
      const records = data.results.records.map((r) => ({
        x: r.peakid,
        y: [r.A, r.B, (r.B + r.C) / 2, r.C, r.D]
      }));
      const opts = { ...this.chartBoxOptions };
      opts.series = [{ name: "Days", data: records }];
      this.chartObject.TimeByPeak?.updateOptions(
        this.applySettings(opts, "TimeByPeak")
      );
    }
  }

  onTimeByPeakAO({ data }) {
    if (data) {
      const records = data.results.records.map((r) => ({
        x: r.peakid,
        y: [r.A, r.B, (r.B + r.C) / 2, r.C, r.D]
      }));
      const opts = { ...this.chartBoxOptions };
      opts.series = [{ name: "Days", data: records }];
      this.chartObject.TimeByPeakAO?.updateOptions(
        this.applySettings(opts, "TimeByPeakAO")
      );
    }
  }

  onCampsByPeak({ data }) {
    if (data) {
      const labels = [],
        values = [];
      data.results.records.forEach((r) => {
        labels.push(r.peakid);
        values.push(r.A);
      });
      const opts = { ...this.chartAOptions };
      opts.xaxis.categories = labels;
      opts.series = [{ name: "Avg Camps", data: values }];
      this.chartObject.CampsByPeak?.updateOptions(
        this.applySettings(opts, "CampsByPeak")
      );
    }
  }

  onCampsByPeakAO({ data }) {
    if (data) {
      const labels = [],
        values = [];
      data.results.records.forEach((r) => {
        labels.push(r.peakid);
        values.push(r.A);
      });
      const opts = { ...this.chartAOptions };
      opts.xaxis.categories = labels;
      opts.series = [{ name: "Avg Camps", data: values }];
      this.chartObject.CampsByPeakAO?.updateOptions(
        this.applySettings(opts, "CampsByPeakAO")
      );
    }
  }

  renderedCallback() {
    if (this._chartsInitialized || this.pages.length === 0) {
      return;
    }
    this._chartsInitialized = true;

    if (!apexChartsPromise) {
      apexChartsPromise = loadScript(this, apexchartJs + "/dist/apexcharts.js");
    }

    apexChartsPromise
      .then(() => {
        this.pages.forEach((p) => {
          p.charts.forEach((id) => {
            const opts = id.includes("TimeByPeak")
              ? this.chartBoxOptions
              : this.chartAOptions;
            this.initChart(`.${id}`, opts, id);
          });
        });
      })
      .catch((error) => {
        console.error("Failed to load ApexCharts", error);
      });
  }

  initChart(selector, options, name) {
    const div = this.template.querySelector(selector);
    const settings = this.chartSettings[name] || {};
    const chartOptions = { ...options };
    if (settings.title) {
      chartOptions.title = { text: settings.title };
    }
    if (settings.colors) {
      chartOptions.colors = settings.colors;
    }
    if (settings.effects?.includes("shadow")) {
      chartOptions.chart = chartOptions.chart || {};
      chartOptions.chart.dropShadow = {
        enabled: true,
        blur: 4,
        opacity: 0.35
      };
    }
    // eslint-disable-next-line no-undef
    const chart = new ApexCharts(div, chartOptions);
    chart.render();
    this.chartObject[name] = chart;
  }

  // ---- UI event handlers ----
  handleHostChange(event) {
    this.hostSelections = event.detail.value;
  }
  handleNationChange(event) {
    this.nationSelections = event.detail.value;
  }
  handleSeasonChange(event) {
    this.seasonSelections = event.detail.value;
  }
  handleSkiChange(event) {
    this.skiSelection = event.detail.value;
  }
  handleNavClick(event) {
    event.preventDefault();
    const id = event.target.dataset.id;
    if (id) {
      this.activePage = id;
    }
  }
  filtersUpdated() {
    this.runChartQueries();
  }

  @api
  runChartQueries() {
    const pairs = [
      [this.climbsByNationQuery, this.onClimbsByNation.bind(this)],
      [this.climbsByNationAOQuery, this.onClimbsByNationAO.bind(this)],
      [this.timeByPeakQuery, this.onTimeByPeak.bind(this)],
      [this.timeByPeakAOQuery, this.onTimeByPeakAO.bind(this)],
      [this.campsByPeakQuery, this.onCampsByPeak.bind(this)],
      [this.campsByPeakAOQuery, this.onCampsByPeakAO.bind(this)]
    ];
    for (const [query, callback] of pairs) {
      if (query) {
        this.queryQueue.push({ query, callback });
      }
    }
  }

  // ---- SAQL filter builder ----
  getFilters(options = {}) {
    const {
      inverseHosts = false,
      inverseNations = false,
      exclude = []
    } = options;
    let saql = "";
    if (this.hostSelections.length && !exclude.includes("host")) {
      const notStr = inverseHosts ? "not " : "";
      saql += `q = filter q by 'host' ${notStr}in ${JSON.stringify(this.hostSelections)};\n`;
    }
    if (this.nationSelections.length && !exclude.includes("nation")) {
      const notStr = inverseNations ? "not " : "";
      saql += `q = filter q by 'nation' ${notStr}in ${JSON.stringify(this.nationSelections)};\n`;
    }
    if (this.seasonSelections.length && !exclude.includes("season")) {
      saql += `q = filter q by 'season' in ${JSON.stringify(this.seasonSelections)};\n`;
    }
    if (this.skiSelection.length && !exclude.includes("ski")) {
      saql += `q = filter q by 'ski' ${this.skiSelection};\n`;
    }
    return saql;
  }

  chartAOptions = {
    chart: { type: "bar", height: 410 },
    series: [],
    xaxis: { categories: [] },
    noData: { text: "Loading..." }
  };

  chartBoxOptions = {
    chart: { type: "boxPlot", height: 410 },
    series: [],
    xaxis: { type: "category" },
    noData: { text: "Loading..." }
  };
}
