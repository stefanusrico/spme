import React from "react"
import { Card, Space, Badge, Typography } from "antd"

const { Text, Paragraph } = Typography

// ScoreDisplay component
const ScoreDisplay = ({ score, formula, scoreDetail }) => {
  console.log("ScoreDisplay rendering with:", { score, formula })

  // PERBAIKAN: Gunakan OR operator
  if (!Array.isArray(score) || score.length === 0) return null

  // const scoreRounded = parseFloat(score).toFixed(2)
  // const isGoodScore = scoreRounded > 3

  return (
    <Card
      style={{ marginBottom: 16 }}
      title={
        <Space direction="vertical" size="small">
          {score.map((item) => (
            <Badge
              key={item.butir}
              status={parseFloat(item.nilai) > 3 ? "success" : "warning"}
              text={
                <span style={{ fontSize: 16, fontWeight: "bold" }}>
                  Skor Butir {item.butir} : {item.nilai}
                </span>
              }
            />
          ))}
        </Space>
        
      }
    >
      {formula && (
        <>
          <Paragraph>{formula.description}</Paragraph>
          <Paragraph>
            <Text strong>Formula:</Text> {formula.main_formula}
          </Paragraph>
          {formula.notes && (
            <Paragraph>
              <Text strong>Catatan:</Text> {formula.notes}
            </Paragraph>
          )}
        </>
      )}

      {/* Tambahan: Menampilkan scoreDetail jika ada */}
      {scoreDetail && (
        <div className="score-details">
          <Text strong>Detail Skor:</Text>
          <ul>
            {Object.entries(scoreDetail).map(([key, value]) => (
              <li key={key}>
                <Text>{key}: </Text>
                <Text>
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
