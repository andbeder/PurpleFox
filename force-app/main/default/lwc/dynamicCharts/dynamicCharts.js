/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */
import { LightningElement, wire } from "lwc";
import { getDatasets, executeQuery } from "lightning/analyticsWaveApi";
import apexchartJs from "@salesforce/resourceUrl/ApexCharts";
import { loadScript } from "lightning/platformResourceLoader";

export default class SacCharts extends LightningElement {
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

  chartSettings = {
    ClimbsByNation: {
      dashboard: "CR_02",
      title: "Top 20 Climbs by Nation",
      fieldMappings: { nation: "Nation", Climbs: "Climbs" },
      colors: ["#002060"],
      effects: ["shadow"]
    },
    TimeByPeak: {
      dashboard: "CR_02",
      title: "Days per Peak by Top 20 Climbs",
      fieldMappings: {
        peakid: "Peak ID",
        A: "Min",
        B: "Q1",
        C: "Q3",
        D: "Max"
      },
      colors: ["#97C1DA", "#002060"],
      effects: ["shadow"]
    },
    CampsByPeak: {
      dashboard: "CR_02",
      title: "Average Number of Camps per Peak",
      fieldMappings: { peakid: "Peak ID", A: "Average Camps" },
      colors: ["#175F68"],
      effects: ["shadow"]
    }
  };

  applySettings(options, chartId) {
    const settings = this.chartSettings[chartId] || {};
    const updated = { ...options };
    if (settings.title) {
      updated.title = { text: settings.title };
    }
    if (settings.colors) {
      updated.colors = settings.colors;
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
    if (error) {
      // eslint-disable-next-line no-console
      console.log("getDatasets ERROR:", error);
    } else if (data) {
      this.datasetIds = {};
      data.datasets.forEach((ds) => {
        this.datasetIds[ds.name] = `${ds.id}/${ds.currentVersionId}`;
      });
    }
  }

  // Option queries with cross-filtering
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
      let saql = `q = load \"${id}\";\n`;
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
      let saql = `q = load \"${id}\";\n`;
      saql += this.getFilters({ exclude: ["season"] });
      saql += "q = group q by 'season';\n";
      saql += "q = foreach q generate q.'season' as season;";
      return { query: saql };
    }
    return undefined;
  }

  @wire(executeQuery, { query: "$hostQuery" })
  onHostQuery({ data, error }) {
    if (data) {
      this.hostOptions = data.results.records.map((r) => ({
        label: r.host,
        value: r.host
      }));
    }
  }

  @wire(executeQuery, { query: "$nationQuery" })
  onNationQuery({ data, error }) {
    if (data) {
      this.nationOptions = data.results.records.map((r) => ({
        label: r.nation,
        value: r.nation
      }));
    }
  }

  @wire(executeQuery, { query: "$seasonQuery" })
  onSeasonQuery({ data, error }) {
    if (data) {
      this.seasonOptions = data.results.records.map((r) => ({
        label: r.season,
        value: r.season
      }));
    }
  }

  // Chart query
  get climbsByNationQuery() {
    if (!this.datasetIds) {
      return undefined;
    }
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters();
    saql += "q = group q by 'nation';\n";
    saql +=
      "q = foreach q generate q.'nation' as nation, count(q) as Climbs;\n";
    saql += "q = order q by 'Climbs' desc;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }

  get climbsByNationAOQuery() {
    if (!this.datasetIds) {
      return undefined;
    }
    const id = this.datasetIds.exped;
    let saql = `q = load "${id}";\n`;
    saql += this.getFilters({ inverseHosts: true, inverseNations: true });
    saql += "q = group q by 'nation';\n";
    saql +=
      "q = foreach q generate q.'nation' as nation, count(q) as Climbs;\n";
    saql += "q = order q by 'Climbs' desc;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }

  get timeByPeakQuery() {
    if (!this.datasetIds) {
      return undefined;
    }
    const id = this.datasetIds.exped;
    let saql = `q = load \"${id}\";\n`;
    saql += this.getFilters();
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, min(q.'totdays') as A, percentile_disc(0.25) within group (order by q.'totdays') as B, percentile_disc(0.75) within group (order by q.'totdays') as C, max(q.'totdays') as D;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }

  get timeByPeakAOQuery() {
    if (!this.datasetIds) {
      return undefined;
    }
    const id = this.datasetIds.exped;
    let saql = `q = load \"${id}\";\n`;
    saql += this.getFilters({ inverseHosts: true, inverseNations: true });
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, min(q.'totdays') as A, percentile_disc(0.25) within group (order by q.'totdays') as B, percentile_disc(0.75) within group (order by q.'totdays') as C, max(q.'totdays') as D;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }


  get campsByPeakQuery() {
    if (!this.datasetIds) {
      return undefined;
    }
    const id = this.datasetIds.exped;
    let saql = `q = load \"${id}\";\n`;
    saql += this.getFilters();
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, avg(q.'camps') as A;\n";
    saql += "q = order q by A desc;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }

  get campsByPeakAOQuery() {
    if (!this.datasetIds) {
      return undefined;
    }
    const id = this.datasetIds.exped;
    let saql = `q = load \"${id}\";\n`;
    saql += this.getFilters({ inverseHosts: true, inverseNations: true });
    saql += "q = group q by 'peakid';\n";
    saql +=
      "q = foreach q generate q.'peakid' as peakid, avg(q.'camps') as A;\n";
    saql += "q = order q by A desc;\n";
    saql += "q = limit q 20;";
    return { query: saql };
  }

  @wire(executeQuery, { query: "$climbsByNationQuery" })
  onClimbsByNation({ data, error }) {
    if (data) {
      const labels = [];
      const values = [];
      data.results.records.forEach((r) => {
        labels.push(r.nation);
        values.push(r.Climbs);
      });
      const options = { ...this.chartAOptions };
      options.xaxis.categories = labels;
      options.series = [{ name: "Climbs", data: values }];
      if (this.chartObject.ClimbsByNation) {
        this.chartObject.ClimbsByNation.updateOptions(
          this.applySettings(options, "ClimbsByNation")
        );
      }
    }
  }

  @wire(executeQuery, { query: "$climbsByNationAOQuery" })
  onClimbsByNationAO({ data, error }) {
    if (data) {
      const labels = [];
      const values = [];
      data.results.records.forEach((r) => {
        labels.push(r.nation);
        values.push(r.Climbs);
      });
      const options = { ...this.chartAOptions };
      options.xaxis.categories = labels;
      options.series = [{ name: "Climbs", data: values }];
      if (this.chartObject.ClimbsByNationAO) {
        this.chartObject.ClimbsByNationAO.updateOptions(
          this.applySettings(options, "ClimbsByNationAO")
        );
      }
    }
  }

  @wire(executeQuery, { query: "$timeByPeakQuery" })
  onTimeByPeak({ data, error }) {
    if (data) {
      const records = data.results.records.map((r) => ({
        x: r.peakid,
        y: [r.A, r.B, (r.B + r.C) / 2, r.C, r.D]
      }));
      const options = { ...this.chartBoxOptions };
      options.series = [{ name: "Days", data: records }];
      if (this.chartObject.TimeByPeak) {
        this.chartObject.TimeByPeak.updateOptions(
          this.applySettings(options, "TimeByPeak")
        );
      }
    }
  }

  @wire(executeQuery, { query: "$timeByPeakAOQuery" })
  onTimeByPeakAO({ data, error }) {
    if (data) {
      const records = data.results.records.map((r) => ({
        x: r.peakid,
        y: [r.A, r.B, (r.B + r.C) / 2, r.C, r.D]
      }));
      const options = { ...this.chartBoxOptions };
      options.series = [{ name: "Days", data: records }];
      if (this.chartObject.TimeByPeakAO) {
        this.chartObject.TimeByPeakAO.updateOptions(
          this.applySettings(options, "TimeByPeakAO")
        );
      }
    }
  }

  @wire(executeQuery, { query: "$campsByPeakQuery" })
  onCampsByPeak({ data, error }) {
    if (data) {
      const labels = [];
      const values = [];
      data.results.records.forEach((r) => {
        labels.push(r.peakid);
        values.push(r.A);
      });
      const options = { ...this.chartAOptions };
      options.xaxis.categories = labels;
      options.series = [{ name: "Avg Camps", data: values }];
      if (this.chartObject.CampsByPeak) {
        this.chartObject.CampsByPeak.updateOptions(
          this.applySettings(options, "CampsByPeak")
        );
      }
    }
  }

  @wire(executeQuery, { query: "$campsByPeakAOQuery" })
  onCampsByPeakAO({ data, error }) {
    if (data) {
      const labels = [];
      const values = [];
      data.results.records.forEach((r) => {
        labels.push(r.peakid);
        values.push(r.A);
      });
      const options = { ...this.chartAOptions };
      options.xaxis.categories = labels;
      options.series = [{ name: "Avg Camps", data: values }];
      if (this.chartObject.CampsByPeakAO) {
        this.chartObject.CampsByPeakAO.updateOptions(
          this.applySettings(options, "CampsByPeakAO")
        );
      }
    }
  }

  renderedCallback() {
    if (!this.chartObject.ClimbsByNation) {
      this.initChart(".ClimbsByNation", this.chartAOptions, "ClimbsByNation");
    }
    if (!this.chartObject.ClimbsByNationAO) {
      this.initChart(
        ".ClimbsByNationAO",
        this.chartAOptions,
        "ClimbsByNationAO"
      );
    }
    if (!this.chartObject.TimeByPeak) {
      this.initChart(".TimeByPeak", this.chartBoxOptions, "TimeByPeak");
    }
    if (!this.chartObject.TimeByPeakAO) {
      this.initChart(".TimeByPeakAO", this.chartBoxOptions, "TimeByPeakAO");
    }
    if (!this.chartObject.CampsByPeak) {
      this.initChart(".CampsByPeak", this.chartAOptions, "CampsByPeak");
    }
    if (!this.chartObject.CampsByPeakAO) {
      this.initChart(".CampsByPeakAO", this.chartAOptions, "CampsByPeakAO");
    }
  }

  initChart(selector, options, name) {
    loadScript(this, apexchartJs + "/dist/apexcharts.js")
      .then(() => {
        const div = this.template.querySelector(selector);
        const settings = this.chartSettings[name] || {};
        const chartOptions = { ...options };
        if (settings.title) {
          chartOptions.title = { text: settings.title };
        }
        if (settings.colors) {
          chartOptions.colors = settings.colors;
        }
        // eslint-disable-next-line no-undef
        const chart = new ApexCharts(div, chartOptions);
        chart.render();
        this.chartObject[name] = chart;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Chart load failed", error);
      });
  }

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

  filtersUpdated() {
    // trigger refresh of charts
    this.onClimbsByNation({ data: undefined, error: undefined });
    this.onClimbsByNationAO({ data: undefined, error: undefined });
    this.onTimeByPeak({ data: undefined, error: undefined });
    this.onTimeByPeakAO({ data: undefined, error: undefined });
    this.onCampsByPeak({ data: undefined, error: undefined });
    this.onCampsByPeakAO({ data: undefined, error: undefined });
  }

  getFilters(options = {}) {
    const {
      inverseHosts = false,
      inverseNations = false,
      exclude = []
    } = options;
    let saql = "";
    if (this.hostSelections.length > 0 && !exclude.includes("host")) {
      const notStr = inverseHosts ? "not " : "";
      saql += `q = filter q by 'host' ${notStr}in ${JSON.stringify(this.hostSelections)};\n`;
    }
    if (this.nationSelections.length > 0 && !exclude.includes("nation")) {
      const notStr = inverseNations ? "not " : "";
      saql += `q = filter q by 'nation' ${notStr}in ${JSON.stringify(this.nationSelections)};\n`;
    }
    if (this.seasonSelections.length > 0 && !exclude.includes("season")) {
      saql += `q = filter q by 'season' in ${JSON.stringify(this.seasonSelections)};\n`;
    }
    if (this.skiSelection.length > 0 && !exclude.includes("ski")) {
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
