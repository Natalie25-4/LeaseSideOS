export function Spinner ({className = ""}: { className?: string}){
    return(
        <div className= {`animate-spin rounded-full border-2 border-border border-t-primary h-5 w-5 ${className}`}
             role="status"
             aria-label="Loading"
             />
    );
}