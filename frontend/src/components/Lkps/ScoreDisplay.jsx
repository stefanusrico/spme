import React from "react"
import { Card, Space, Badge, Typography } from "antd"

const { Text, Paragraph } = Typography

// Simplified ScoreDisplay component - displays score data as-is
const ScoreDisplay = ({ score, formula, scoreDetail }) => {
  console.log("ScoreDisplay rendering with:", { score, formula, scoreDetail })

  // No score data to display
  if (score === null || score === undefined) return null

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Score display */}
      <div style={{ marginBottom: "10px" }}>
        {Array.isArray(score) ? (
          <Space direction="vertical" size="small">
            {score.map((item, index) => (
              <Badge
                key={index}
                status={parseFloat(item.nilai) > 3 ? "success" : "warning"}
                text={
                  <span style={{ fontSize: 16, fontWeight: "bold" }}>
                    Skor Butir {item.butir || index + 1} :{" "}
                    {parseFloat(item.nilai).toFixed(2)}
                  </span>
                }
              />
            ))}
          </Space>
        ) : (
          <Badge
            status="processing"
            text={
              <span style={{ fontSize: 16, fontWeight: "bold" }}>
                Skor:{" "}
                {typeof score === "object" ? JSON.stringify(score) : score}
              </span>
            }
          />
        )}
      </div>

      {/* Score details display */}
      {scoreDetail && Object.keys(scoreDetail).length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <Text strong>Detail Perhitungan:</Text>
          <ul
            style={{
              listStyleType: "none",
              paddingLeft: "10px",
              marginTop: "5px",
            }}
          >
            {Object.entries(scoreDetail).map(([key, value]) => (
              <li key={key}>
                <Text>
                  {key}:{" "}
                  {typeof value === "object" ? JSON.stringify(value) : value}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

export default ScoreDisplay
