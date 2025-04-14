import React from "react"
import { Card, Button, Divider, Alert } from "antd"
import { Typography } from "antd"
import {
  isTridharmaSection,
  calculateCombinedScore,
} from "../../utils/tridharmaUtils"

const { Title } = Typography

const TridharmaScoreDetails = ({
  sectionCode,
  scoreDetail,
  userData,
  NDTPS,
  setScore,
  setScoreDetail,
}) => {
  if (!isTridharmaSection(sectionCode) || !scoreDetail) {
    return null
  }

  const handleCalculateCombinedScore = async () => {
    try {
      const result = await calculateCombinedScore(userData, NDTPS)

      if (result) {
        setScore(result.score)
        setScoreDetail(result.scoreDetail)
      }
    } catch (error) {
      console.error("Error menghitung skor gabungan:", error)
    }
  }

  return (
    <Card style={{ marginTop: 16, marginBottom: 16 }}>
      <Title level={4}>Detail Perhitungan Skor</Title>

      <Button
        type="primary"
        onClick={handleCalculateCombinedScore}
        style={{ marginBottom: 16 }}
      >
        Hitung Skor Gabungan (10A & 10B)
      </Button>

      <Divider orientation="left">
        Formula 10A: Kerjasama berdasarkan jenis
      </Divider>
      <p>N1 (Pendidikan): {scoreDetail.N1 || 0}</p>
      <p>N2 (Penelitian): {scoreDetail.N2 || 0}</p>
      <p>N3 (Pengabdian Masyarakat): {scoreDetail.N3}</p>
      <p>
        RK = ((a * N1) + (b * N2) + (c * N3)) / NDTPS ={" "}
        {(scoreDetail.RK || 0).toFixed(2)}
      </p>
      <p>
        Skor 10A: <b>{(scoreDetail.scoreA || 0).toFixed(2)}</b>
      </p>

      <Divider orientation="left">
        Formula 10B: Kerjasama berdasarkan tingkat
      </Divider>
      <p>NI (Internasional): {scoreDetail.NI}</p>
      <p>NN (Nasional): {scoreDetail.NN}</p>
      <p>NW (Lokal/Wilayah): {scoreDetail.NW}</p>
      <p>
        Skor 10B: <b>{(scoreDetail.scoreB || 0).toFixed(2)}</b>
      </p>

      <Alert
        message="Informasi Skor"
        description={`Skor akhir menggunakan nilai dari Formula 10A: ${(
          scoreDetail.scoreA || 0
        ).toFixed(2)}`}
        type="info"
        showIcon
      />
    </Card>
  )
}

export default TridharmaScoreDetails
