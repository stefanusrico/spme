import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

function App() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-64 flex justify-center items-center">
      <Button onClick={() => setOpen(true)}>Launch</Button>

      <Dialog open={open} onOpenChange={setOpen} modal={true}>
        <DialogContent
          className="sm:max-w-[425px]"
          onEscapeKeyDown={(e) => {
            e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Modal title</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            I will not close if you click outside me. Do not even try to press
            escape key.
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => setOpen(false)}>Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
