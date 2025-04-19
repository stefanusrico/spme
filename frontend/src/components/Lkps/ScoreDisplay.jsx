import React from "react"
import { Card, Space, Badge, Typography } from "antd"

const { Text, Paragraph } = Typography

// ScoreDisplay component
const ScoreDisplay = ({ score, formula, scoreDetail }) => {
  console.log("ScoreDisplay rendering with:", { score, formula })

  // PERBAIKAN: Gunakan OR operator
  if (score === null || score === undefined) return null

  const scoreRounded = parseFloat(score).toFixed(2)
  const isGoodScore = scoreRounded > 3

  return (
    <Card
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <Badge
            status={isGoodScore ? "success" : "warning"}
            text={
              <span style={{ fontSize: 16, fontWeight: "bold" }}>
                Skor: {scoreRounded}
              </span>
            }
            style={{ fontSize: 16, fontWeight: "bold" }}
          />
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
