import * as go from "gojs"

export function createPieChartDiagram() {
  const $ = go.GraphObject.make

  const diagram = $(go.Diagram, "pieChartDiv", {
    initialContentAlignment: go.Spot.Center,
    "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
  })

  const pieData = [
    { category: "A", value: 40, color: "lightblue" },
    { category: "B", value: 30, color: "lightgreen" },
    { category: "C", value: 20, color: "lightcoral" },
    { category: "D", value: 10, color: "lightyellow" },
  ]

  const createPieSlice = (angleStart, angleEnd, color) => {
    return $(go.Shape, "Arc", {
      startAngle: angleStart,
      endAngle: angleEnd,
      fill: color,
      stroke: null,
      width: 50,
      height: 50,
      angle: 0,
      toolTip: $(
        go.Adornment,
        "Auto",
        $(go.Shape, { fill: "white" }),
        $(go.TextBlock, "Tooltip text")
      ),
    })
  }

  let angleStart = 0
  pieData.forEach((data) => {
    const angleEnd = angleStart + (360 * data.value) / 100
    diagram.add(
      $(
        go.Node,
        "Auto",
        {
          location: new go.Point(100, 100),
        },
        createPieSlice(angleStart, angleEnd, data.color),
        $(go.TextBlock, { margin: 10 }, data.category)
      )
    )
    angleStart = angleEnd
  })

  return diagram
}
