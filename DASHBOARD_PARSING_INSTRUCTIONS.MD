# DASHBOARD_PARSING_INSTRUCTIONS.MD

## Dashboard Layout

1. **Layout Matters** The order of the layout, as indicated by the `column` value of the layout object, indicates the order the chart is to appear in the JSON list
2. **Chart Title** The title of the chart is used as the chart ID in the json file, this allows is to control the mapping between charts in dashboards and charts in LWC components. The title will be in kebab-case.
3. **Widget** Only specific details of the widget are important:

    Extract the following from the widget object:
    - `step` indicating which query to examine
    - `dimensions` which are shown and which are hidden
    Ignore all other fields.
4. **Step** Read the step as a SAQL query. If it is in compact format, convert to a SAQL query
5. **Text Widget** The widget immediately to the right of each chart contains the chart style configuration.

    * Style Format:
        - Fields may be separated by semicolons **or** newlines using CSS-like syntax: `type: bar; colors: red,blue`.
        - Example: `title: Monthly Revenue\nfont-color: dark grey` is equivalent to using semicolons.

6. **Color Schema** Use the `Color Schema` below to map color names to specific hex values. Any colors not mentioned should be assumed to be CSS colors and passed through as they are

## Color Scheme

1. **Purpose** use these mappings to replace color names mentioned in chart comments
2. **Mappings**

    * red = #EF6B4D
    * light blue = #97C1DA
    * blue = #3C5B81
    * green = #1BAA96
    * teal = #E2F4F9
    * grey = #98ACBD
    * dark green = #175F68
    * dark grey = #283140
    * dark blue = #002060
