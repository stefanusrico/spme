import React from "react"
import { Card, Space, Badge, Typography } from "antd"

const { Text, Paragraph } = Typography

// ScoreDisplay component
const ScoreDisplay = ({ score, formula }) => {
  if (score === null) return null

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
    </Card>
  )
}

export default ScoreDisplay
