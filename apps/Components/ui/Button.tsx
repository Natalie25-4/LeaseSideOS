type ButtonHTMLAttributes = {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
};

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes {
    variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-white text-charcoal border border-border hover:bg-gray-50",
    ghost: "bg-transparent text-charcoal hover:bg-gray-50",
};

export function Button({
    variant = "primary",
    className = "",
    ...props
}: ButtonProps) {
    return (
        <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${variantStyles[variant]} ${className}`}
            {...props}
        />
    );
}