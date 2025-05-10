import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ScoreDisplay component
const ScoreDisplay = ({ score, scoreDetail }) => {
  console.log("ScoreDisplay rendering with:", { score })
  const [isOpen, setIsOpen] = useState(false)

  // PERBAIKAN: Gunakan OR operator
  if (!Array.isArray(score) || score.length === 0) return null

  // Helper function to render different value types
  const renderValue = (value, keyName) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>
    }

    if (typeof value === "number") {
      return (
        <span className={value > 3 ? "text-green-600" : "text-amber-600"}>
          {value.toFixed(2)}
        </span>
      )
    }

    if (typeof value === "boolean") {
      return value ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Ya</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>Tidak</span>
        </Badge>
      )
    }

    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        if (value.length === 0)
          return <span className="text-muted-foreground">Tidak ada data</span>

        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="text-sm text-muted-foreground py-1 hover:no-underline">
                Lihat detail ({value.length} item)
              </AccordionTrigger>
              <AccordionContent>
                <ul className="pl-5 mt-2 space-y-1">
                  {value.map((item, idx) => (
                    <li key={idx} className="text-sm">
                      {typeof item === "object" ? (
                        JSON.stringify(item)
                      ) : (
                        <span>{item}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )
      } else {
        // Create a simple table for object values
        const entries = Object.entries(value)
        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="text-sm text-muted-foreground py-1 hover:no-underline">
                Lihat detail ({entries.length} properti)
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Properti</TableHead>
                      <TableHead>Nilai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(([k, v]) => (
                      <TableRow key={k}>
                        <TableCell>{k}</TableCell>
                        <TableCell>
                          {typeof v === "object"
                            ? JSON.stringify(v)
                            : String(v)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )
      }
    }

    return <span>{String(value)}</span>
  }

  return (
    <div className="mb-6">
      <Card className="shadow-sm">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex-1">
              <div className="space-y-2">
                {score.map((item) => (
                  <div key={item.butir} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        parseFloat(item.nilai) > 3
                          ? "bg-green-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="text-lg font-medium">
                      Skor Butir {item.butir} : {item.nilai}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            {scoreDetail && Object.keys(scoreDetail).length > 0 && (
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-normal">Detail Skor</span>
                </div>
                <Separator className="mb-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(scoreDetail).map(([key, value]) => (
                    <Card
                      key={key}
                      className="overflow-hidden border-muted bg-background shadow-sm hover:shadow"
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-normal">
                          {key}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        {renderValue(value, key)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}

export default ScoreDisplay
