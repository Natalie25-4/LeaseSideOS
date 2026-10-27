import {SelectHTMLAttributes} from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>{
    label?: string;
    options: {value: string; label: string}[];
}

export function Select({label, options, className = "", id, ...props}: SelectProps){
    return(
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-charcoal">
                    {label}
                    </label>
            )}
            <select
                id={id}
                className={`px-3 py-2 rounded-md border border-border text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${className}`}
                {...props}
                >
                    {options.map((opt)=>(
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
        </div>
    );
}