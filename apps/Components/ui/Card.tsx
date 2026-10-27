import { HTMLAttributes} from "react";

export function Card({ className = "", ...props} : HTMLAttributes<HTMLDivElement>){
    return(
        <div
            className={`bg-surface border border-border rounded-lg p-6 ${className}`}
            {...props}
        />
    );
}