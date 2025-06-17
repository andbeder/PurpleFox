# Developer Instructions for Change Requests

This document summarizes the updates contained in `changeRequests.json` and outlines the steps required to apply them to the `dynamicCharts` Lightning Web Component.

To regenerate this list at any time, run:

```bash
npm run generate:instructions
```

## Overview

The CR‑02 dashboard introduces new titles, field labels and styles for the three primary charts. It also removes the obsolete `DaysPerPeak` chart. All changes target `force-app/main/default/lwc/dynamicCharts/dynamicCharts.js`.

Starting with this release, `scripts/changeRequestInterpreter.js` maps each change request to the appropriate [ApexCharts options](https://apexcharts.com/docs/options/). The generated instructions therefore include exact `chart.updateOptions` calls for properties such as `colors`, `chart.fontFamily` and `chart.dropShadow`.

## Steps

1. **Update Chart Metadata**
   - Set `dashboard: "CR_02"` for `ClimbsByNation`, `TimeByPeak` and `CampsByPeak`.
   - Replace titles with:
     - `ClimbsByNation` → **Top 20 Climbs by Nation**
     - `TimeByPeak` → **Days per Peak by Top 20 Climbs**
     - `CampsByPeak` → **Average Number of Camps per Peak**
   - Adjust field mappings:
     - `ClimbsByNation` maps `nation` → `Nation`.
     - `TimeByPeak` maps `peakid` → `Peak ID`, `A` → `Min`, `B` → `Q1`, `C` → `Q3`, `D` → `Max`.
     - `CampsByPeak` maps `peakid` → `Peak ID`, `A` → `Average Camps`.

2. **Apply Style Updates**
   - Map style changes to ApexCharts options:
     - `ClimbsByNation` sets `options.colors` to `['#002060']` and enables `chart.dropShadow`.
     - `TimeByPeak` sets `options.colors` to `['#97C1DA', '#002060']` and enables `chart.dropShadow`.
     - `CampsByPeak` sets `options.colors` to `['#175F68']` and enables `chart.dropShadow`.

3. **Remove Deprecated Chart**
   - Delete all references to the `DaysPerPeak` chart including option objects, render calls and markup containers.

4. **Validate Changes**
   - Run `npm run test:<agent>` (for example, `npm run test:changeRequestGenerator`) to ensure all Jest tests pass.

