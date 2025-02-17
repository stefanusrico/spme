import React, { useState } from "react";
import Button from "../Button";

export function FormToast({ closeToast, title = "Title", message = "Message", onSubmit }) {
  const [commit, setCommit] = useState(""); 

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(commit);
    }
    closeToast(); 
  };

  return (
    <div className="flex flex-col w-full gap-2">
      <h3 className="text-zinc-800 text-sm font-semibold">{title}</h3>
      <p className="text-sm">{message}</p>
      <form>
        <textarea
          className="w-full border border-purple-600/40 rounded-md resize-none h-[100px]"
          value={commit}
          onChange={(e) => setCommit(e.target.value)} 
        />
      </form>
      <Button 
        className="bg-primary w-40 hover:bg-white hover:text-primary text-zinc-800 text-sm font-semibold" 
        onClick={handleSubmit} 
      >
        Submit
      </Button>
    </div>
  );
}
