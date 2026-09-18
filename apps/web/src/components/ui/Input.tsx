import {InputHTMLAttributes} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement>{
    label?: string;
    error?: string;
}

export function Input({label, error, className = "", id, ...props}: InputProps) {
    return(
        <div className ="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-charcoal">
                    {label}
                    </label>
            )}
            <input
              id={id}
                            className={`px-3 py-2 rounded-md border text-sm text-charcoal 
                                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 
                                focus:border-primary ${
                error ? "border-critical" : "border-border"
                            } ${className}`}
              {...props}
            />
            {error && <span className="text-xs text-critical">{error}</span>}
        </div>
    );
}