import { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>{
    label?: string;
}

export function Textarea ({ label, id, className = "", ...props}: TextareaProps){
    return(
        <div className= "flex flex-col gap-1.5">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-charcoal">
                    {label}
                    </label>
            )}

            <textarea
             id = {id}
             className={`px-3 py-2 rounded-md border border-border text-sm text-charcoal placeholder: text-gray-400 focus:outline-non focus: ring-2 focus: ring-primary/30 focus:border-primary resize-none ${className}`}
             rows={4}
             {...props}
             />
        </div>
    );
}