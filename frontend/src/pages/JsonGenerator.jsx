import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const JsonGenerator = () => {
  return (
    <div className="pr-4 mx-auto mt-32">
      <h1 className="text-3xl font-bold mb-4 sm:mb-6">JSON Generator</h1>
      <div className="bg-white rounded-xl shadow-xl p-8 w-full mt-8">
        <div className="space-y-8">
          <div>
            <Label htmlFor="spreadsheet" className="text-lg mb-3">
              Link Spreadsheet
            </Label>
            <Input id="spreadsheet" className="mt-2 h-12 text-lg" />
          </div>

          <div>
            <Label className="text-lg mb-3">Strata</Label>
            <RadioGroup className="mt-3 flex gap-6">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="d3" id="d3" className="h-5 w-5" />
                <Label htmlFor="d3" className="text-lg">
                  D-III
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="d4" id="d4" className="h-5 w-5" />
                <Label htmlFor="d4" className="text-lg">
                  D-IV
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <div className="flex items-center space-x-3 mb-8">
              <Label className="text-lg">LAM/BAN-PT</Label>
              <Checkbox id="selectAll" className="h-5 w-5" />
              <Label htmlFor="selectAll" className="text-lg">
                Pilih Semua
              </Label>
            </div>

            <div className="space-y-4">
              {[
                "LAM TEKNIK",
                "LAM SAMA",
                "LAM INFOKOM",
                "LAM EMBA",
                "BAN-PT",
              ].map((lam) => (
                <div key={lam} className="flex items-center space-x-3">
                  <Checkbox id={lam} className="h-5 w-5" />
                  <Label htmlFor={lam} className="text-lg">
                    {lam}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-8">
            <Button className="bg-base h-12 px-6 text-lg">Generate JSON</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JsonGenerator
